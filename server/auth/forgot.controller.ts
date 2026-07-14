import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  fpSendPhoneOtp,
  fpVerifyPhoneOtp,
  fpSendEmailOtp,
  fpVerifyEmailOtp,
  fpResetPassword,
} from "./forgot.service";
import { AuthError } from "./auth.service";
import { successResponse, errorResponse } from "./auth.controller";

const SESSION_COOKIE = "arthmount_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) return errorResponse(err.message, err.code, err.statusCode);
  console.error("[Forgot] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

async function parseBody<T>(
  req: NextRequest,
  schema: z.ZodType<T>
): Promise<{ data: T } | NextResponse> {
  let raw: unknown;
  try { raw = await req.json(); } catch { return errorResponse("Invalid JSON.", "BAD_REQUEST", 400); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues.map((e) => e.message).join(", "), "VALIDATION_ERROR", 422);
  }
  return { data: parsed.data };
}

// ─── POST /api/auth/forgot/send-phone-otp ────────────────────────────────────

const sendPhoneOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit Indian phone number"),
});

export async function handleFpSendPhoneOtp(req: NextRequest): Promise<NextResponse> {
  const result = await parseBody(req, sendPhoneOtpSchema);
  if (result instanceof NextResponse) return result;
  try { return successResponse(await fpSendPhoneOtp(result.data.phone)); }
  catch (err) { return handleError(err); }
}

// ─── POST /api/auth/forgot/verify-phone-otp ──────────────────────────────────

const verifyPhoneOtpSchema = z.object({
  forgotToken: z.string().min(1),
  code:        z.string().length(6).regex(/^\d{6}$/),
});

export async function handleFpVerifyPhoneOtp(req: NextRequest): Promise<NextResponse> {
  const result = await parseBody(req, verifyPhoneOtpSchema);
  if (result instanceof NextResponse) return result;
  try { return successResponse(await fpVerifyPhoneOtp(result.data.forgotToken, result.data.code)); }
  catch (err) { return handleError(err); }
}

// ─── POST /api/auth/forgot/send-email-otp ────────────────────────────────────

const sendEmailOtpSchema = z.object({
  forgotToken: z.string().min(1),
});

export async function handleFpSendEmailOtp(req: NextRequest): Promise<NextResponse> {
  const result = await parseBody(req, sendEmailOtpSchema);
  if (result instanceof NextResponse) return result;
  try { return successResponse(await fpSendEmailOtp(result.data.forgotToken)); }
  catch (err) { return handleError(err); }
}

// ─── POST /api/auth/forgot/verify-email-otp ──────────────────────────────────

const verifyEmailOtpSchema = z.object({
  forgotToken: z.string().min(1),
  code:        z.string().length(6).regex(/^\d{6}$/),
});

export async function handleFpVerifyEmailOtp(req: NextRequest): Promise<NextResponse> {
  const result = await parseBody(req, verifyEmailOtpSchema);
  if (result instanceof NextResponse) return result;
  try { return successResponse(await fpVerifyEmailOtp(result.data.forgotToken, result.data.code)); }
  catch (err) { return handleError(err); }
}

// ─── POST /api/auth/forgot/reset-password ────────────────────────────────────

const resetPasswordSchema = z.object({
  forgotToken: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/,  "Must contain at least one number"),
});

export async function handleFpResetPassword(req: NextRequest): Promise<NextResponse> {
  const result = await parseBody(req, resetPasswordSchema);
  if (result instanceof NextResponse) return result;
  try {
    const data = await fpResetPassword(result.data.forgotToken, result.data.password);
    const response = successResponse({ success: true });
    response.cookies.set(SESSION_COOKIE, data.sessionToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   COOKIE_MAX_AGE,
      path:     "/",
    });
    return response;
  } catch (err) { return handleError(err); }
}
