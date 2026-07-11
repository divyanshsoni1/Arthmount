import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { loginWithCredentials, verifyLoginOtp, AuthError } from "./auth.service";

// ─── Shared response helpers ──────────────────────────────────────────────────

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, code: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { message, code } }, { status });
}

function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return errorResponse(err.message, err.code, err.statusCode);
  }
  console.error("[Auth] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

// ─── Login controller (POST /api/auth/login) ─────────────────────────────────

const loginBodySchema = z.object({
  identifier: z.string().min(1),
  password:   z.string().min(1),
});

export async function handleLogin(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body.", "BAD_REQUEST", 400);
  }

  const parsed = loginBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues.map((e) => e.message).join(", "),
      "VALIDATION_ERROR",
      422
    );
  }

  try {
    const result = await loginWithCredentials(
      parsed.data.identifier,
      parsed.data.password
    );
    return successResponse(result, 200);
  } catch (err) {
    return handleError(err);
  }
}

// ─── Verify OTP controller (POST /api/auth/verify-otp) ───────────────────────

const SESSION_COOKIE  = "arthmount_session";
const COOKIE_MAX_AGE  = 60 * 60 * 24 * 7; // 7 days in seconds

const verifyOtpBodySchema = z.object({
  otpToken: z.string().min(1),
  code:     z.string().length(6),
});

export async function handleVerifyOtp(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body.", "BAD_REQUEST", 400);
  }

  const parsed = verifyOtpBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues.map((e) => e.message).join(", "),
      "VALIDATION_ERROR",
      422
    );
  }

  try {
    const result = await verifyLoginOtp(parsed.data.otpToken, parsed.data.code);

    const response = successResponse(
      { user: result.user },
      200
    );

    // Set httpOnly session cookie
    response.cookies.set(SESSION_COOKIE, result.sessionToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   COOKIE_MAX_AGE,
      path:     "/",
    });

    return response;
  } catch (err) {
    return handleError(err);
  }
}

export { SESSION_COOKIE };
