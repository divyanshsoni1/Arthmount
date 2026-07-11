import bcrypt from "bcrypt";

import { findUserByEmailOrPhone, updateLastLogin, type AuthUser } from "./auth.repository";
import { checkSendRateLimit, createOtp, verifyOtp, type OtpVerifyResult } from "@/lib/otp";
import { signOtpToken, signSessionToken, verifyOtpToken, type OtpTokenPayload } from "@/lib/jwt";
import { enqueueOtpJob } from "@/lib/otpQueue";
import type { Role } from "@/lib/generated/prisma/client";

// ─── Custom error ─────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ─── Step 1: verify credentials → enqueue OTP ────────────────────────────────

export interface LoginResult {
  otpToken:          string;
  channel:           "email" | "phone";
  maskedDestination: string;
}

export async function loginWithCredentials(
  identifier: string,
  password: string
): Promise<LoginResult> {
  const user = await findUserByEmailOrPhone(identifier);

  // Always run bcrypt compare to prevent user-enumeration via timing
  const dummyHash  = "$2b$10$invalidhashfortimingnormalization000000000000000000000";
  const hashToUse  = user?.passwordHash ?? dummyHash;
  const passwordOk = await bcrypt.compare(password, hashToUse);

  if (!user)       throw new AuthError("No account found with this email or phone.", "USER_NOT_FOUND", 401);
  if (!passwordOk) throw new AuthError("Incorrect password.", "WRONG_PASSWORD", 401);
  if (user.deletedAt) throw new AuthError("This account has been deactivated.", "ACCOUNT_DELETED", 403);
  if (user.isFrozen)  throw new AuthError("Your account is frozen. Please contact support.", "ACCOUNT_FROZEN", 403);

  const isEmail = identifier.includes("@");
  const channel = isEmail ? "email" : "phone";

  if (channel === "email" && !user.email) throw new AuthError("No email address on this account.", "NO_CHANNEL", 400);
  if (channel === "phone" && !user.phone) throw new AuthError("No phone number on this account.", "NO_CHANNEL", 400);

  // Rate-limit before doing any work
  const allowed = await checkSendRateLimit(user.id);
  if (!allowed) throw new AuthError("Too many OTP requests. Please wait 10 minutes.", "OTP_RATE_LIMITED", 429);

  // Run OTP creation and JWT signing in parallel — both are now <2 ms each
  const [otp, otpToken] = await Promise.all([
    createOtp(user.id),
    signOtpToken({ userId: user.id, channel, name: user.name, role: user.role }),
  ]);

  // Enqueue delivery — fire-and-forget (LPUSH is ~1 ms)
  void enqueueOtpJob(
    channel === "email"
      ? { type: "email", to: user.email!, otp, name: user.name }
      : { type: "phone", to: user.phone!, otp }
  );

  return {
    otpToken,
    channel,
    maskedDestination: maskDestination(user, channel),
  };
}

// ─── Step 2: verify OTP → issue session ──────────────────────────────────────

export interface VerifyOtpResult {
  sessionToken: string;
  user: Pick<AuthUser, "id" | "role" | "name">;
}

export async function verifyLoginOtp(
  otpToken: string,
  code: string
): Promise<VerifyOtpResult> {
  let payload: OtpTokenPayload;

  try {
    payload = await verifyOtpToken(otpToken);
  } catch {
    throw new AuthError("OTP session expired. Please log in again.", "OTP_TOKEN_EXPIRED", 401);
  }

  const result: OtpVerifyResult = await verifyOtp(payload.userId, code);

  if (!result.success) {
    const MAP = {
      expired: { msg: "OTP has expired. Please log in again.",          code: "OTP_EXPIRED", status: 401 },
      locked:  { msg: "Too many incorrect attempts. Please log in again.", code: "OTP_LOCKED",  status: 429 },
      invalid: { msg: "Incorrect OTP. Please try again.",                code: "OTP_INVALID", status: 400 },
    } as const;
    const { msg, code: errCode, status } = MAP[result.reason];
    throw new AuthError(msg, errCode, status);
  }

  // Name and role are embedded in the OTP token — no DB query needed here.
  // Fire-and-forget the last-login update so it doesn't add latency.
  void updateLastLogin(payload.userId);

  const sessionToken = await signSessionToken({ userId: payload.userId, role: payload.role });

  return {
    sessionToken,
    user: { id: payload.userId, role: payload.role as Role, name: payload.name },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskDestination(user: AuthUser, channel: "email" | "phone"): string {
  if (channel === "email" && user.email) {
    const [local, domain] = user.email.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
  if (channel === "phone" && user.phone) {
    return `+${user.phone.slice(0, 4)}****${user.phone.slice(-2)}`;
  }
  return "***";
}
