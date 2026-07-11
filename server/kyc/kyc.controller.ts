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
