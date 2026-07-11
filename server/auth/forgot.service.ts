/**
 * Forgot-password service — 5-step flow
 *
 * Step 1  POST /api/auth/forgot/send-phone-otp
 *         Input : { phone }
 *         Action: look up user by phone, create forgot-session,
 *                 enqueue WhatsApp OTP, return forgotToken
 *
 * Step 2  POST /api/auth/forgot/verify-phone-otp
 *         Input : { forgotToken, code }
 *         Action: verify OTP, stamp phoneVerified, store userId+email in session,
 *                 return { hasEmail, forgotToken }
 *
 * Step 3  POST /api/auth/forgot/send-email-otp   (only when hasEmail=true)
 *         Input : { forgotToken }
 *         Action: enqueue email OTP, return { maskedEmail, forgotToken }
 *
 * Step 4  POST /api/auth/forgot/verify-email-otp (only when hasEmail=true)
 *         Input : { forgotToken, code }
 *         Action: verify email OTP, stamp emailVerified, return { forgotToken }
 *
 * Step 5  POST /api/auth/forgot/reset-password
 *         Input : { forgotToken, password }
 *         Action: validate session is fully verified, hash + save password,
 *                 delete session, issue fresh session cookie
 *
 * Optimisations
 * ─ All OTPs use HMAC-SHA256 (<1 ms) not bcrypt
 * ─ OTP creation + JWT signing run in Promise.all where independent
 * ─ OTP delivery is fire-and-forget via Redis queue
 * ─ forgotToken reuses the OtpTokenPayload JWT shape (userId = sessionId)
 * ─ email/phone OTP keys are scoped to this flow so they can't collide with login
 */

import bcrypt          from "bcrypt";
import { randomInt, createHmac, timingSafeEqual } from "crypto";

import { redis }             from "@/lib/redis";
import { enqueueOtpJob }     from "@/lib/otpQueue";
import { signOtpToken, signSessionToken, verifyOtpToken, type OtpTokenPayload } from "@/lib/jwt";
import {
  createForgotSession,
  getForgotSession,
  updateForgotSession,
  deleteForgotSession,
} from "@/lib/forgot-session";
import { findUserByEmailOrPhone } from "./auth.repository";
import { updatePassword }         from "./auth.repository";
import { AuthError }              from "./auth.service";

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS  = 12;
const OTP_TTL_SEC    = 5 * 60;
const MAX_ATTEMPTS   = 5;
const RL_MAX         = 3;
const RL_WIN         = 10 * 60;

// ─── Scoped Redis key helpers ─────────────────────────────────────────────────

const phoneOtpKey = (sid: string) => `forgot:phone:otp:${sid}`;
const emailOtpKey = (sid: string) => `forgot:email:otp:${sid}`;
const phoneRlKey  = (sid: string) => `forgot:phone:rl:${sid}`;
const emailRlKey  = (sid: string) => `forgot:email:rl:${sid}`;

// ─── OTP helpers ──────────────────────────────────────────────────────────────

interface OtpRecord { hash: string; attempts: number }

function hmac(code: string): string {
  const s = process.env.OTP_HMAC_SECRET;
  if (!s) throw new Error("[Forgot] Missing OTP_HMAC_SECRET");
  return createHmac("sha256", s).update(code).digest("hex");
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a.padEnd(64, "0"));
  const bb = Buffer.from(b.padEnd(64, "0"));
  return a.length === b.length && timingSafeEqual(ab, bb);
}

async function generateOtp(redisKey: string): Promise<string> {
  const code   = String(randomInt(100000, 1000000));
  const record: OtpRecord = { hash: hmac(code), attempts: 0 };
  await redis.set(redisKey, JSON.stringify(record), "EX", OTP_TTL_SEC);
  return code;
}

async function verifyOtpCode(
  redisKey: string,
  code: string
): Promise<"ok" | "expired" | "invalid" | "locked"> {
  const raw = await redis.get(redisKey);
  if (!raw) return "expired";

  const record: OtpRecord = JSON.parse(raw);
  if (record.attempts >= MAX_ATTEMPTS) {
    await redis.del(redisKey);
    return "locked";
  }

  if (!safeEq(hmac(code), record.hash)) {
    record.attempts += 1;
    if (record.attempts >= MAX_ATTEMPTS) {
      await redis.del(redisKey);
    } else {
      const ttl = await redis.ttl(redisKey);
      await redis.set(redisKey, JSON.stringify(record), "EX", ttl > 0 ? ttl : OTP_TTL_SEC);
    }
    return "invalid";
  }

  await redis.del(redisKey);
  return "ok";
}

async function checkRateLimit(rlKey: string): Promise<void> {
  const count = await redis.incr(rlKey);
  if (count === 1) await redis.expire(rlKey, RL_WIN);
  if (count > RL_MAX) {
    throw new AuthError("Too many OTP requests. Please wait 10 minutes.", "OTP_RATE_LIMITED", 429);
  }
}

// ─── Token helpers ────────────────────────────────────────────────────────────

async function signForgotToken(sessionId: string, name: string): Promise<string> {
  return signOtpToken({ userId: sessionId, channel: "phone", name, role: "USER" });
}

async function verifyForgotToken(token: string): Promise<OtpTokenPayload> {
  try {
    return await verifyOtpToken(token);
  } catch {
    throw new AuthError("Session expired. Please start again.", "SESSION_EXPIRED", 401);
  }
}

// ─── Step 1: send-phone-otp ───────────────────────────────────────────────────

export interface SendPhoneOtpResult {
  forgotToken:  string;
  maskedPhone:  string;
}

export async function fpSendPhoneOtp(phone: string): Promise<SendPhoneOtpResult> {
  // Look up user — same response whether found or not (prevents enumeration)
  const user = await findUserByEmailOrPhone(phone);
  if (!user) {
    throw new AuthError(
      "No account found with this phone number.",
      "USER_NOT_FOUND",
      404
    );
  }
  if (user.isFrozen) {
    throw new AuthError("Your account is frozen. Contact support.", "ACCOUNT_FROZEN", 403);
  }

  const sessionId = await createForgotSession(phone);
  await checkRateLimit(phoneRlKey(sessionId));

  const [otp, forgotToken] = await Promise.all([
    generateOtp(phoneOtpKey(sessionId)),
    signForgotToken(sessionId, user.name),
  ]);

  void enqueueOtpJob({ type: "phone", to: phone, otp });

  return {
    forgotToken,
    maskedPhone: `+${phone.slice(0, 4)}****${phone.slice(-2)}`,
  };
}

// ─── Step 2: verify-phone-otp ─────────────────────────────────────────────────

export interface VerifyPhoneOtpResult {
  forgotToken: string;
  hasEmail:    boolean;
  maskedEmail: string | null;
}

export async function fpVerifyPhoneOtp(
  forgotToken: string,
  code: string
): Promise<VerifyPhoneOtpResult> {
  const { userId: sessionId, name } = await verifyForgotToken(forgotToken);
  const session = await getForgotSession(sessionId);
  if (!session) throw new AuthError("Session expired. Please start again.", "SESSION_EXPIRED", 401);

  const result = await verifyOtpCode(phoneOtpKey(sessionId), code);
  if (result !== "ok") {
    const MAP = {
      expired: { msg: "OTP expired. Please request a new one.", code: "OTP_EXPIRED",  status: 401 },
      invalid: { msg: "Incorrect OTP. Please try again.",       code: "OTP_INVALID",  status: 400 },
      locked:  { msg: "Too many attempts. Request a new OTP.",  code: "OTP_LOCKED",   status: 429 },
    } as const;
    const e = MAP[result];
    throw new AuthError(e.msg, e.code, e.status);
  }

  // Pull user data now that identity (phone) is confirmed
  const user = await findUserByEmailOrPhone(session.phone);
  if (!user) throw new AuthError("Account not found.", "USER_NOT_FOUND", 404);

  const hasEmail = !!user.email;

  await updateForgotSession(sessionId, {
    userId:        user.id,
    name:          user.name,
    email:         user.email ?? null,
    phoneVerified: true,
  });

  const refreshed = await signForgotToken(sessionId, name);

  return {
    forgotToken: refreshed,
    hasEmail,
    maskedEmail: user.email
      ? maskEmail(user.email)
      : null,
  };
}

// ─── Step 3: send-email-otp ───────────────────────────────────────────────────

export interface SendEmailOtpResult {
  forgotToken: string;
  maskedEmail: string;
}

export async function fpSendEmailOtp(forgotToken: string): Promise<SendEmailOtpResult> {
  const { userId: sessionId, name } = await verifyForgotToken(forgotToken);
  const session = await getForgotSession(sessionId);
  if (!session) throw new AuthError("Session expired. Please start again.", "SESSION_EXPIRED", 401);
  if (!session.phoneVerified) throw new AuthError("Phone not verified.", "PHONE_NOT_VERIFIED", 400);
  if (!session.email) throw new AuthError("No email address on this account.", "NO_EMAIL", 400);

  await checkRateLimit(emailRlKey(sessionId));

  const [otp, refreshed] = await Promise.all([
    generateOtp(emailOtpKey(sessionId)),
    signForgotToken(sessionId, name),
  ]);

  void enqueueOtpJob({ type: "email", to: session.email, otp, name: session.name ?? name });

  return {
    forgotToken: refreshed,
    maskedEmail: maskEmail(session.email),
  };
}

// ─── Step 4: verify-email-otp ─────────────────────────────────────────────────

export interface VerifyEmailOtpResult {
  forgotToken: string;
}

export async function fpVerifyEmailOtp(
  forgotToken: string,
  code: string
): Promise<VerifyEmailOtpResult> {
  const { userId: sessionId, name } = await verifyForgotToken(forgotToken);
  const session = await getForgotSession(sessionId);
  if (!session) throw new AuthError("Session expired. Please start again.", "SESSION_EXPIRED", 401);
  if (!session.phoneVerified) throw new AuthError("Phone not verified.", "PHONE_NOT_VERIFIED", 400);

  const result = await verifyOtpCode(emailOtpKey(sessionId), code);
  if (result !== "ok") {
    const MAP = {
      expired: { msg: "OTP expired. Please request a new one.", code: "OTP_EXPIRED",  status: 401 },
      invalid: { msg: "Incorrect OTP. Please try again.",       code: "OTP_INVALID",  status: 400 },
      locked:  { msg: "Too many attempts. Request a new OTP.",  code: "OTP_LOCKED",   status: 429 },
    } as const;
    const e = MAP[result];
    throw new AuthError(e.msg, e.code, e.status);
  }

  await updateForgotSession(sessionId, { emailVerified: true });
  const refreshed = await signForgotToken(sessionId, name);

  return { forgotToken: refreshed };
}

// ─── Step 5: reset-password ───────────────────────────────────────────────────

export interface ResetPasswordResult {
  sessionToken: string;
}

export async function fpResetPassword(
  forgotToken: string,
  password: string
): Promise<ResetPasswordResult> {
  const { userId: sessionId } = await verifyForgotToken(forgotToken);
  const session = await getForgotSession(sessionId);
  if (!session) throw new AuthError("Session expired. Please start again.", "SESSION_EXPIRED", 401);
  if (!session.phoneVerified) throw new AuthError("Phone not verified.", "PHONE_NOT_VERIFIED", 400);
  if (!session.userId) throw new AuthError("Session incomplete.", "SESSION_INCOMPLETE", 400);

  // If account has email, it must be verified too
  if (session.email && !session.emailVerified) {
    throw new AuthError("Email not verified.", "EMAIL_NOT_VERIFIED", 400);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await updatePassword(session.userId, passwordHash);

  // Clean up all Redis keys for this session
  void deleteForgotSession(sessionId);
  void redis.del(phoneRlKey(sessionId), emailRlKey(sessionId));

  const sessionToken = await signSessionToken({ userId: session.userId, role: "USER" });

  return { sessionToken };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}
