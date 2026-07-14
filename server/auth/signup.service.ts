import bcrypt from "bcrypt";
import { randomInt } from "crypto";

import {
  createSignupSession,
  getSignupSession,
  updateSignupSession,
  deleteSignupSession,
} from "@/lib/signup-session";
import { signSessionToken, signOtpToken, verifyOtpToken, type OtpTokenPayload } from "@/lib/jwt";
import { createHmac, timingSafeEqual } from "crypto";
import { redis } from "@/lib/redis";
import { enqueueOtpJob } from "@/lib/otpQueue";
import { normalizePhone } from "@/lib/phone";
import { phoneExists, createUser } from "./signup.repository";
import { AuthError } from "./auth.service";

// ─── Structured logger ────────────────────────────────────────────────────────

function log(event: string, data?: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), service: "signup", event, ...data }));
}

function logError(event: string, err: unknown, data?: Record<string, unknown>) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), service: "signup", event, error: String(err), ...data }));
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS   = 12;
const OTP_TTL_SEC     = 5 * 60;
const MAX_OTP_TRIES   = 5;
const RATE_LIMIT_MAX  = 3;
const RATE_LIMIT_WIN  = 10 * 60; // 10 min

// ─── OTP key helpers (signup-scoped, separate from login OTPs) ────────────────

const otpKey  = (sid: string) => `signup:otp:${sid}`;
const rlKey   = (sid: string) => `signup:rl:${sid}`;

interface OtpRecord { hash: string; attempts: number }

function hmacOtp(code: string): string {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) throw new Error("[Signup] Missing OTP_HMAC_SECRET");
  return createHmac("sha256", secret).update(code).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a.padEnd(64, "0"));
  const bBuf = Buffer.from(b.padEnd(64, "0"));
  return a.length === b.length && timingSafeEqual(aBuf, bBuf);
}

// ─── Step 1: init — receive name, create session ─────────────────────────────

export interface InitResult {
  signupToken: string; // signed JWT carrying sessionId
}

export async function initSignup(name: string): Promise<InitResult> {
  const sessionId  = await createSignupSession(name);
  const signupToken = await signOtpToken({
    userId:  sessionId,   // reuse OtpToken shape; userId = sessionId here
    channel: "phone",
    name,
    role:    "USER",
  });
  return { signupToken };
}

// ─── Step 2: send-otp — receive phone, validate, dispatch OTP ────────────────

export interface SendOtpResult {
  maskedPhone: string;
  signupToken: string; // refreshed token (same sessionId, new expiry)
}

export async function sendSignupOtp(
  signupToken: string,
  phone: string
): Promise<SendOtpResult> {
  const payload = await verifySignupToken(signupToken);
  const sessionId = payload.userId;

  const session = await getSignupSession(sessionId);
  if (!session) throw new AuthError("Signup session expired. Please start again.", "SESSION_EXPIRED", 401);

  // Normalise phone server-side — canonical format: XXXXXXXXXX (10 digits)
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw new AuthError("Invalid phone number.", "INVALID_PHONE", 422);
  }

  // Check phone not already taken (use normalised form)
  if (await phoneExists(normalizedPhone)) {
    throw new AuthError("This phone number is already registered.", "PHONE_TAKEN", 409);
  }

  // Rate limit
  const count = await redis.incr(rlKey(sessionId));
  if (count === 1) await redis.expire(rlKey(sessionId), RATE_LIMIT_WIN);
  if (count > RATE_LIMIT_MAX) {
    log("otp.rate_limited", { sessionId });
    throw new AuthError("Too many OTP requests. Please wait 10 minutes.", "OTP_RATE_LIMITED", 429);
  }

  // Generate & store OTP
  const code:   string     = String(randomInt(100000, 1000000));
  const record: OtpRecord  = { hash: hmacOtp(code), attempts: 0 };
  await redis.set(otpKey(sessionId), JSON.stringify(record), "EX", OTP_TTL_SEC);

  // Store normalised phone in session
  await updateSignupSession(sessionId, { phone: normalizedPhone });

  // Enqueue WhatsApp delivery — AWAITED so failure is caught and surfaced
  try {
    await enqueueOtpJob({ type: "phone", to: normalizedPhone, otp: code });
    log("otp.enqueued", { sessionId, channel: "phone" });
  } catch (err) {
    logError("otp.enqueue_failed", err, { sessionId });
    // Roll back OTP record so the user can retry cleanly
    await redis.del(otpKey(sessionId));
    throw new AuthError("Unable to send OTP. Please try again.", "OTP_DELIVERY_FAILED", 503);
  }

  // Refresh token so expiry resets
  const refreshedToken = await signOtpToken({
    userId:  sessionId,
    channel: "phone",
    name:    session.name,
    role:    "USER",
  });

  return {
    maskedPhone:  `${normalizedPhone.slice(0, 2)}******${normalizedPhone.slice(-2)}`,
    signupToken:  refreshedToken,
  };
}

// ─── Step 3: verify-otp ───────────────────────────────────────────────────────

export interface VerifySignupOtpResult {
  signupToken: string; // refreshed token that now marks phone as verified
}

export async function verifySignupOtp(
  signupToken: string,
  code: string
): Promise<VerifySignupOtpResult> {
  const payload   = await verifySignupToken(signupToken);
  const sessionId = payload.userId;

  const session = await getSignupSession(sessionId);
  if (!session) throw new AuthError("Signup session expired. Please start again.", "SESSION_EXPIRED", 401);

  const raw = await redis.get(otpKey(sessionId));
  if (!raw)  throw new AuthError("OTP has expired. Please request a new one.", "OTP_EXPIRED", 401);

  const record: OtpRecord = JSON.parse(raw);

  if (record.attempts >= MAX_OTP_TRIES) {
    await redis.del(otpKey(sessionId));
    throw new AuthError("Too many incorrect attempts. Please request a new OTP.", "OTP_LOCKED", 429);
  }

  const match = safeCompare(hmacOtp(code), record.hash);

  if (!match) {
    record.attempts += 1;
    if (record.attempts >= MAX_OTP_TRIES) {
      await redis.del(otpKey(sessionId));
    } else {
      const ttl = await redis.ttl(otpKey(sessionId));
      await redis.set(otpKey(sessionId), JSON.stringify(record), "EX", ttl > 0 ? ttl : OTP_TTL_SEC);
    }
    throw new AuthError("Incorrect OTP. Please try again.", "OTP_INVALID", 400);
  }

  await redis.del(otpKey(sessionId));
  await updateSignupSession(sessionId, { phoneVerified: true });

  log("otp.verified", { sessionId });

  const refreshedToken = await signOtpToken({
    userId:  sessionId,
    channel: "phone",
    name:    session.name,
    role:    "USER",
  });

  return { signupToken: refreshedToken };
}

// ─── Step 4: complete — set password, create user, issue session cookie ───────

export interface CompleteSignupResult {
  sessionToken: string;
  user: { id: string; name: string; phone: string; role: string };
}

export async function completeSignup(
  signupToken: string,
  password: string
): Promise<CompleteSignupResult> {
  const payload   = await verifySignupToken(signupToken);
  const sessionId = payload.userId;

  const session = await getSignupSession(sessionId);
  if (!session) throw new AuthError("Signup session expired. Please start again.", "SESSION_EXPIRED", 401);

  if (!session.phoneVerified) {
    throw new AuthError("Phone number has not been verified.", "PHONE_NOT_VERIFIED", 400);
  }
  if (!session.phone) {
    throw new AuthError("Signup session is incomplete.", "SESSION_INCOMPLETE", 400);
  }

  // Final duplicate check (race-condition guard)
  if (await phoneExists(session.phone)) {
    throw new AuthError("This phone number is already registered.", "PHONE_TAKEN", 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await createUser({
    name:         session.name,
    phone:        session.phone,
    passwordHash,
  });

  // Clean up Redis
  void deleteSignupSession(sessionId);
  void redis.del(rlKey(sessionId));

  const sessionToken = await signSessionToken({ userId: user.id, role: user.role });

  log("signup.completed", { userId: user.id, role: user.role });

  return {
    sessionToken,
    user: { id: user.id, name: user.name, phone: user.phone!, role: user.role },
  };
}

// ─── Internal: verify signup token ───────────────────────────────────────────

async function verifySignupToken(token: string): Promise<OtpTokenPayload> {
  try {
    return await verifyOtpToken(token);
  } catch {
    throw new AuthError("Signup session expired. Please start again.", "SESSION_EXPIRED", 401);
  }
}
