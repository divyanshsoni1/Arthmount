import bcrypt from "bcrypt";

import { findUserByEmailOrPhone, updateLastLogin, type AuthUser } from "./auth.repository";
import { checkSendRateLimit, createOtp, verifyOtp, type OtpVerifyResult } from "@/lib/otp";
import { signOtpToken, signSessionToken, verifyOtpToken, type OtpTokenPayload } from "@/lib/jwt";
import { enqueueOtpJob } from "@/lib/otpQueue";
import { normalizePhone } from "@/lib/phone";
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

// ─── Structured logger ────────────────────────────────────────────────────────

function log(event: string, data?: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), service: "auth", event, ...data }));
}

function logError(event: string, err: unknown, data?: Record<string, unknown>) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), service: "auth", event, error: String(err), ...data }));
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
  // Normalise phone numbers server-side so the DB query always matches the
  // canonical format regardless of what the client sent.
  const normalized = identifier.includes("@")
    ? identifier.trim().toLowerCase()
    : (normalizePhone(identifier) ?? identifier);

  log("login.attempt", { identifier: normalized });

  const user = await findUserByEmailOrPhone(normalized);

  // Always run bcrypt compare to prevent user-enumeration via timing
  const dummyHash  = "$2b$10$invalidhashfortimingnormalization000000000000000000000";
  const hashToUse  = user?.passwordHash ?? dummyHash;
  const passwordOk = await bcrypt.compare(password, hashToUse);

  if (!user) {
    log("login.failed", { reason: "USER_NOT_FOUND", identifier: normalized });
    throw new AuthError("No account found with this email or phone.", "USER_NOT_FOUND", 401);
  }
  if (!passwordOk) {
    log("login.failed", { reason: "WRONG_PASSWORD", userId: user.id });
    throw new AuthError("Incorrect password.", "WRONG_PASSWORD", 401);
  }
  if (user.deletedAt) {
    log("login.failed", { reason: "ACCOUNT_DELETED", userId: user.id });
    throw new AuthError("This account has been deactivated.", "ACCOUNT_DELETED", 403);
  }
  if (user.isFrozen) {
    log("login.failed", { reason: "ACCOUNT_FROZEN", userId: user.id });
    throw new AuthError("Your account is frozen. Please contact support.", "ACCOUNT_FROZEN", 403);
  }

  const isEmail = normalized.includes("@");
  const channel = isEmail ? "email" : "phone";

  if (channel === "email" && !user.email) throw new AuthError("No email address on this account.", "NO_CHANNEL", 400);
  if (channel === "phone" && !user.phone) throw new AuthError("No phone number on this account.", "NO_CHANNEL", 400);

  // Rate-limit before doing any work
  const allowed = await checkSendRateLimit(user.id);
  if (!allowed) {
    log("otp.rate_limited", { userId: user.id, channel });
    throw new AuthError("Too many OTP requests. Please wait 10 minutes.", "OTP_RATE_LIMITED", 429);
  }

  // Run OTP creation and JWT signing in parallel — both are <2 ms each
  const [otp, otpToken] = await Promise.all([
    createOtp(user.id),
    signOtpToken({ userId: user.id, channel, name: user.name, role: user.role }),
  ]);

  // Enqueue delivery — AWAITED so we know the job reached Redis.
  // If this throws, the caller receives an error and no session is ever created.
  try {
    await enqueueOtpJob(
      channel === "email"
        ? { type: "email", to: user.email!, otp, name: user.name }
        : { type: "phone", to: user.phone!, otp }
    );
    log("otp.enqueued", { userId: user.id, channel });
  } catch (err) {
    logError("otp.enqueue_failed", err, { userId: user.id, channel });
    throw new AuthError(
      "Unable to send OTP. Please try again.",
      "OTP_DELIVERY_FAILED",
      503
    );
  }

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
    log("otp.verify_failed", { reason: "OTP_TOKEN_EXPIRED" });
    throw new AuthError("OTP session expired. Please log in again.", "OTP_TOKEN_EXPIRED", 401);
  }

  const result: OtpVerifyResult = await verifyOtp(payload.userId, code);

  if (!result.success) {
    const MAP = {
      expired: { msg: "OTP has expired. Please log in again.",            code: "OTP_EXPIRED", status: 401 },
      locked:  { msg: "Too many incorrect attempts. Please log in again.", code: "OTP_LOCKED",  status: 429 },
      invalid: { msg: "Incorrect OTP. Please try again.",                  code: "OTP_INVALID", status: 400 },
    } as const;
    const { msg, code: errCode, status } = MAP[result.reason];
    log("otp.verify_failed", { userId: payload.userId, reason: errCode });
    throw new AuthError(msg, errCode, status);
  }

  log("otp.verified", { userId: payload.userId, channel: payload.channel });

  // Fire-and-forget with error logging so a DB hiccup never blocks login
  updateLastLogin(payload.userId).catch((err) =>
    logError("login.update_last_login_failed", err, { userId: payload.userId })
  );

  const sessionToken = await signSessionToken({ userId: payload.userId, role: payload.role });

  log("session.created", { userId: payload.userId, role: payload.role });

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
    // phone is 10 digits (XXXXXXXXXX) — show first 2 + last 2, mask middle 6
    return `${user.phone.slice(0, 2)}******${user.phone.slice(-2)}`;
  }
  return "***";
}
