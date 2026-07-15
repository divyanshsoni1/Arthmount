import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  initSignup,
  sendSignupOtp,
  verifySignupOtp,
  completeSignup,
} from "./signup.service";
import { AuthError } from "./auth.service";
import { successResponse, errorResponse } from "./auth.controller";

const SESSION_COOKIE  = "arthmount_session";
const COOKIE_MAX_AGE  = 60 * 60 * 24 * 7;

// ─── Shared error handler ─────────────────────────────────────────────────────

function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return errorResponse(err.message, err.code, err.statusCode);
  }
  console.error("[Signup] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

// ─── POST /api/auth/signup/init ───────────────────────────────────────────────

const initSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export async function handleSignupInit(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON.", "BAD_REQUEST", 400); }

  const parsed = initSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues.map((e) => e.message).join(", "), "VALIDATION_ERROR", 422);
  }

  try {
    const result = await initSignup(parsed.data.name.trim());
    return successResponse(result, 200);
  } catch (err) { return handleError(err); }
}

// ─── POST /api/auth/signup/send-otp ──────────────────────────────────────────

const sendOtpSchema = z.object({
  signupToken: z.string().min(1),
  phone: z
    .string()
    .regex(/^\d{10}$/, "Enter a valid 10-digit Indian phone number"),
});

export async function handleSignupSendOtp(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON.", "BAD_REQUEST", 400); }

  const parsed = sendOtpSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues.map((e) => e.message).join(", "), "VALIDATION_ERROR", 422);
  }

  try {
    const result = await sendSignupOtp(parsed.data.signupToken, parsed.data.phone);
    return successResponse(result, 200);
  } catch (err) { return handleError(err); }
}

// ─── POST /api/auth/signup/verify-otp ────────────────────────────────────────

const verifyOtpSchema = z.object({
  signupToken: z.string().min(1),
  code: z.string().length(6).regex(/^\d{6}$/),
});

export async function handleSignupVerifyOtp(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON.", "BAD_REQUEST", 400); }

  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues.map((e) => e.message).join(", "), "VALIDATION_ERROR", 422);
  }

  try {
    const result = await verifySignupOtp(parsed.data.signupToken, parsed.data.code);
    return successResponse(result, 200);
  } catch (err) { return handleError(err); }
}

// ─── POST /api/auth/signup/complete ──────────────────────────────────────────

const completeSchema = z.object({
  signupToken: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export async function handleSignupComplete(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON.", "BAD_REQUEST", 400); }

  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues.map((e) => e.message).join(", "), "VALIDATION_ERROR", 422);
  }

  try {
    const result = await completeSignup(parsed.data.signupToken, parsed.data.password);

    const response = successResponse({ user: result.user }, 201);

    response.cookies.set(SESSION_COOKIE, result.sessionToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   COOKIE_MAX_AGE,
      path:     "/",
    });

    return response;
  } catch (err) { return handleError(err); }
}
