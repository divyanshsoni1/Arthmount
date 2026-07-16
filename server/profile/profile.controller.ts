/**
 * Profile controller — thin request/response layer.
 * Validates inputs, calls the service, returns structured JSON.
 * All handlers require a valid session cookie.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z }                              from "zod";
import { verifySessionToken }             from "@/lib/jwt";
import { AuthError }                      from "@/server/auth/auth.service";
import { successResponse, errorResponse } from "@/server/auth/auth.controller";
import {
  ProfileError,
  getFullProfile,
  updateName,
  updatePersonalInfoService,
  sendEmailOtp,
  verifyEmailOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
} from "./profile.service";

// ─── Session guard ────────────────────────────────────────────────────────────

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

// ─── Error handler ────────────────────────────────────────────────────────────

function handleError(err: unknown): NextResponse {
  if (err instanceof ProfileError || err instanceof AuthError) {
    return errorResponse(err.message, err.code, err.statusCode);
  }
  console.error("[Profile] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

// ─── GET /api/user/profile ────────────────────────────────────────────────────

export async function handleGetProfile(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);
    const data   = await getFullProfile(userId);
    return successResponse(data);
  } catch (err) {
    return handleError(err);
  }
}

// ─── PATCH /api/user/profile  (name-only update) ─────────────────────────────

const updateNameSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Name can only contain letters, spaces, hyphens, and apostrophes"
    ),
});

export async function handleUpdateProfile(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON body.", "BAD_REQUEST", 400);
    }

    const parsed = updateNameSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    await updateName(userId, parsed.data.name);
    return successResponse({ message: "Name updated successfully." });
  } catch (err) {
    return handleError(err);
  }
}

// ─── POST /api/user/profile/send-email-otp ───────────────────────────────────

const sendEmailOtpSchema = z.object({
  email: z
    .string()
    .email("Enter a valid email address")
    .max(255, "Email is too long"),
});

export async function handleSendEmailOtp(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON body.", "BAD_REQUEST", 400);
    }

    const parsed = sendEmailOtpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    const result = await sendEmailOtp(userId, parsed.data.email);
    return successResponse(result);
  } catch (err) {
    return handleError(err);
  }
}

// ─── POST /api/user/profile/verify-email-otp ─────────────────────────────────

const verifyOtpSchema = z.object({
  code: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric"),
});

export async function handleVerifyEmailOtp(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON body.", "BAD_REQUEST", 400);
    }

    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    await verifyEmailOtp(userId, parsed.data.code);
    return successResponse({ message: "Email updated successfully." });
  } catch (err) {
    return handleError(err);
  }
}

// ─── POST /api/user/profile/send-phone-otp ───────────────────────────────────

const sendPhoneOtpSchema = z.object({
  phone: z.string().min(10, "Enter a valid phone number"),
});

export async function handleSendPhoneOtp(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON body.", "BAD_REQUEST", 400);
    }

    const parsed = sendPhoneOtpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    const result = await sendPhoneOtp(userId, parsed.data.phone);
    return successResponse(result);
  } catch (err) {
    return handleError(err);
  }
}

// ─── POST /api/user/profile/verify-phone-otp ─────────────────────────────────

export async function handleVerifyPhoneOtp(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON body.", "BAD_REQUEST", 400);
    }

    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    await verifyPhoneOtp(userId, parsed.data.code);
    return successResponse({ message: "Phone number updated successfully." });
  } catch (err) {
    return handleError(err);
  }
}

// ─── PATCH /api/user/profile/personal-info  (dob, gender, maritalStatus) ─────

const updatePersonalInfoSchema = z.object({
  dob:           z.string().nullable().optional(),
  gender:        z.string().nullable().optional(),
  maritalStatus: z.string().nullable().optional(),
}).refine(
  (d) => "dob" in d || "gender" in d || "maritalStatus" in d,
  { message: "Provide at least one field to update." }
);

export async function handleUpdatePersonalInfo(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON body.", "BAD_REQUEST", 400);
    }

    const parsed = updatePersonalInfoSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    await updatePersonalInfoService(userId, parsed.data);
    return successResponse({ message: "Personal information updated successfully." });
  } catch (err) {
    return handleError(err);
  }
}
