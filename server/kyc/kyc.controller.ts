import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifySessionToken }  from "@/lib/jwt";
import { AuthError }           from "@/server/auth/auth.service";
import { successResponse, errorResponse } from "@/server/auth/auth.controller";
import { getKycStatus, saveIdentity, uploadDocument, submitKyc } from "./kyc.service";

// ─── Session guard — used by every KYC handler ────────────────────────────────

const SESSION_COOKIE = "arthmount_session";

async function requireAuth(req: NextRequest): Promise<string> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new AuthError("Unauthenticated.", "UNAUTHENTICATED", 401);

  try {
    const payload = await verifySessionToken(token);
    return payload.userId;
  } catch {
    throw new AuthError("Session expired. Please log in again.", "SESSION_EXPIRED", 401);
  }
}

// ─── Shared error handler ─────────────────────────────────────────────────────

function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return errorResponse(err.message, err.code, err.statusCode);
  }
  console.error("[KYC] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

// ─── GET /api/kyc ─────────────────────────────────────────────────────────────

export async function handleGetKyc(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);
    const record = await getKycStatus(userId);
    return successResponse({ kyc: record });
  } catch (err) {
    return handleError(err);
  }
}

// ─── POST /api/kyc  (save identity: Step 1) ───────────────────────────────────

const identitySchema = z.object({
  aadhaarNumber: z
    .string()
    .regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits"),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "PAN must match format ABCDE1234F"),
});

export async function handleSaveIdentity(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = identitySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    const record = await saveIdentity(
      userId,
      parsed.data.aadhaarNumber,
      parsed.data.panNumber
    );

    return successResponse({ kyc: record });
  } catch (err) {
    return handleError(err);
  }
}

// ─── POST /api/kyc/upload  (upload document: Step 2) ─────────────────────────

const MAX_SIZE = 5 * 1024 * 1024;

export async function handleUploadDocument(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);

    // Parse multipart form
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return errorResponse("Could not parse form data.", "BAD_REQUEST", 400);
    }

    const docType = formData.get("docType") as string | null;
    const file    = formData.get("file") as File | null;

    if (!docType || !["aadhaar", "pan"].includes(docType)) {
      return errorResponse("docType must be 'aadhaar' or 'pan'.", "VALIDATION_ERROR", 422);
    }
    if (!file) {
      return errorResponse("No file provided.", "VALIDATION_ERROR", 422);
    }
    if (file.size > MAX_SIZE) {
      return errorResponse("File size exceeds the 5 MB limit.", "FILE_TOO_LARGE", 422);
    }

    const buffer  = Buffer.from(await file.arrayBuffer());
    const result  = await uploadDocument(
      userId,
      docType as "aadhaar" | "pan",
      buffer,
      file.type,
      file.name,
      file.size
    );

    return successResponse({ url: result.url, key: result.key });
  } catch (err) {
    return handleError(err);
  }
}

// ─── POST /api/kyc/submit  (submit for review: Step 3) ───────────────────────

export async function handleSubmitKyc(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);
    const record = await submitKyc(userId);
    return successResponse({ kyc: record }, 200);
  } catch (err) {
    return handleError(err);
  }
}

// ─── GET /api/kyc/signed-images ───────────────────────────────────────────────
// Returns temporary pre-signed URLs for the authenticated user's KYC documents.
// Used by the status page (step5) so document thumbnails load correctly even
// when the bucket is private (raw internal MinIO URLs are not publicly reachable).

import { getSignedUrl, extractKeyFromUrl } from "@/lib/storage/minio";

const SIGNED_URL_TTL = 3600; // 60 minutes — matches admin signed-URL expiry

export async function handleGetSignedImages(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);
    const record = await getKycStatus(userId);

    if (!record) {
      return successResponse({ images: null });
    }

    const fields = [
      "aadhaarFrontUrl",
      "aadhaarBackUrl",
      "panFrontUrl",
      "panBackUrl",
      "selfieUrl",
    ] as const;

    // Sign all present URLs in parallel; absent URLs become null
    const signedEntries = await Promise.all(
      fields.map(async (field) => {
        const rawUrl = record[field as keyof typeof record] as string | null;
        if (!rawUrl) return [field, null] as const;
        const key = extractKeyFromUrl(rawUrl);
        if (!key) return [field, null] as const;
        try {
          const signed = await getSignedUrl(key, SIGNED_URL_TTL);
          return [field, signed] as const;
        } catch {
          // Never expose raw internal URL on signing failure
          return [field, null] as const;
        }
      })
    );

    const images = Object.fromEntries(signedEntries) as Record<typeof fields[number], string | null>;
    return successResponse({ images });
  } catch (err) {
    return handleError(err);
  }
}

// ─── POST /api/kyc/submit-full ────────────────────────────────────────────────
// Receives all 6 files + identity as multipart/form-data.

import { submitKycFull } from "./kyc.service";

const MAX_FILE = 5 * 1024 * 1024;

async function extractFileBuffer(
  form: FormData,
  field: string
): Promise<{ buffer: Buffer; mimeType: string; filename: string; size: number } | null> {
  const f = form.get(field) as File | null;
  if (!f) return null;
  return {
    buffer:   Buffer.from(await f.arrayBuffer()),
    mimeType: f.type,
    filename: f.name,
    size:     f.size,
  };
}

export async function handleSubmitFull(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);

    let form: FormData;
    try { form = await req.formData(); } catch {
      return errorResponse("Could not parse form data.", "BAD_REQUEST", 400);
    }

    const aadhaarNumber = (form.get("aadhaarNumber") as string | null)?.trim() ?? "";
    const panNumber     = (form.get("panNumber")     as string | null)?.trim() ?? "";

    if (!aadhaarNumber || !panNumber) {
      return errorResponse("aadhaarNumber and panNumber are required.", "VALIDATION_ERROR", 422);
    }

    const slots = ["aadhaarFront", "aadhaarBack", "panFront", "panBack", "selfie"] as const;
    const files: Record<string, { buffer: Buffer; mimeType: string; filename: string; size: number }> = {};

    for (const slot of slots) {
      const f = await extractFileBuffer(form, slot);
      if (!f) return errorResponse(`Missing file: ${slot}`, "VALIDATION_ERROR", 422);
      if (f.size > MAX_FILE) return errorResponse(`${slot} exceeds 5 MB limit.`, "FILE_TOO_LARGE", 422);
      files[slot] = f;
    }

    const record = await submitKycFull(userId, {
      aadhaarNumber,
      panNumber,
      aadhaarFront: files.aadhaarFront,
      aadhaarBack:  files.aadhaarBack,
      panFront:     files.panFront,
      panBack:      files.panBack,
      selfie:       files.selfie,
    });

    return successResponse({ kyc: record }, 201);
  } catch (err) {
    return handleError(err);
  }
}
