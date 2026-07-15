/**
 * Profile service — business logic for viewing, updating, and OTP-verifying
 * profile changes. All mutations are scoped to the requesting user's own id.
 *
 * OTP strategy (mirrors auth.service):
 *  - Uses the existing lib/otp HMAC-SHA256 + Redis store
 *  - Uses the existing lib/otpQueue for delivery (email / WhatsApp)
 *  - Rate-limited via checkSendRateLimit (3 sends / 10 min)
 *  - A namespace prefix differentiates profile OTPs from login OTPs:
 *    Redis key  →  otp:profile_email:<userId>
 *                  otp:profile_phone:<userId>
 *    Rate-limit →  otp:rl:profile_email:<userId>
 *                  otp:rl:profile_phone:<userId>
 *  - OTP is stored against a "pending" value so the handler can complete
 *    the update without re-reading the new value from the request.
 */

import {
  findProfileById,
  getProfileStats,
  updateUserName,
  updateUserEmail,
  updateUserPhone,
  emailTakenByOther,
  phoneTakenByOther,
  type ProfileUser,
  type ProfileStats,
} from "./profile.repository";

import { redis }          from "@/lib/redis";
import { enqueueOtpJob }  from "@/lib/otpQueue";
import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from "crypto";

// ─── Custom error (re-uses the same shape as AuthError) ──────────────────────

export class ProfileError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "ProfileError";
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_TTL       = 5 * 60;   // 5 min
const MAX_ATTEMPTS  = 5;
const SEND_LIMIT    = 3;
const SEND_WINDOW   = 10 * 60;  // 10 min

type OtpKind = "profile_email" | "profile_phone";

// ─── Redis key helpers ────────────────────────────────────────────────────────

function otpKey(kind: OtpKind, userId: string)    { return `otp:${kind}:${userId}`; }
function rlKey(kind: OtpKind, userId: string)      { return `otp:rl:${kind}:${userId}`; }
function pendingKey(kind: OtpKind, userId: string) { return `otp:pending:${kind}:${userId}`; }

// ─── HMAC helper (mirrors lib/otp but uses same secret) ──────────────────────

function hmacOtp(code: string): string {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) throw new Error("[ProfileOTP] Missing OTP_HMAC_SECRET env variable");
  return createHmac("sha256", secret).update(code).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a.padEnd(64, "0"));
  const bBuf = Buffer.from(b.padEnd(64, "0"));
  return a.length === b.length && timingSafeEqual(aBuf, bBuf);
}

interface OtpRecord { hash: string; attempts: number }

// ─── Generate & store OTP + store pending value ───────────────────────────────

async function issueOtp(
  kind:         OtpKind,
  userId:       string,
  pendingValue: string          // the new email / phone to set on success
): Promise<string> {
  // Rate-limit check
  const rlK   = rlKey(kind, userId);
  const count = await redis.incr(rlK);
  if (count === 1) await redis.expire(rlK, SEND_WINDOW);
  if (count > SEND_LIMIT) {
    throw new ProfileError(
      "Too many OTP requests. Please wait 10 minutes.",
      "OTP_RATE_LIMITED",
      429
    );
  }

  const code   = String(randomInt(100000, 1000000));
  const record: OtpRecord = { hash: hmacOtp(code), attempts: 0 };

  await Promise.all([
    redis.set(otpKey(kind, userId),    JSON.stringify(record), "EX", OTP_TTL),
    redis.set(pendingKey(kind, userId), pendingValue,           "EX", OTP_TTL),
  ]);

  return code;
}

// ─── Verify OTP & return the pending value on success ────────────────────────

async function consumeOtp(
  kind:   OtpKind,
  userId: string,
  code:   string
): Promise<string> {
  const raw = await redis.get(otpKey(kind, userId));
  if (!raw) {
    throw new ProfileError("OTP has expired. Please request a new one.", "OTP_EXPIRED", 401);
  }

  const record: OtpRecord = JSON.parse(raw);

  if (record.attempts >= MAX_ATTEMPTS) {
    await redis.del(otpKey(kind, userId));
    throw new ProfileError(
      "Too many incorrect attempts. Please request a new OTP.",
      "OTP_LOCKED",
      429
    );
  }

  const match = safeCompare(hmacOtp(code), record.hash);

  if (!match) {
    record.attempts += 1;
    if (record.attempts >= MAX_ATTEMPTS) {
      await redis.del(otpKey(kind, userId));
    } else {
      const ttl = await redis.ttl(otpKey(kind, userId));
      await redis.set(
        otpKey(kind, userId),
        JSON.stringify(record),
        "EX",
        ttl > 0 ? ttl : OTP_TTL
      );
    }
    throw new ProfileError("Incorrect OTP. Please try again.", "OTP_INVALID", 400);
  }

  // Retrieve the pending value before cleaning up
  const pending = await redis.get(pendingKey(kind, userId));
  await Promise.all([
    redis.del(otpKey(kind, userId)),
    redis.del(pendingKey(kind, userId)),
  ]);

  if (!pending) {
    throw new ProfileError("OTP session expired. Please try again.", "OTP_EXPIRED", 401);
  }

  return pending;
}

// ─── Phone normalisation (same as api-client/auth.ts) ────────────────────────

function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string): string {
  return `+${phone.slice(0, 4)}****${phone.slice(-2)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public service methods
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Get profile + stats ──────────────────────────────────────────────────────

export interface FullProfile {
  profile: ProfileUser;
  stats:   ProfileStats;
}

export async function getFullProfile(userId: string): Promise<FullProfile> {
  const [profile, stats] = await Promise.all([
    findProfileById(userId),
    getProfileStats(userId),
  ]);
  if (!profile) {
    throw new ProfileError("User not found.", "USER_NOT_FOUND", 404);
  }
  return { profile, stats };
}

// ─── Update name directly ─────────────────────────────────────────────────────

export async function updateName(userId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    throw new ProfileError("Name must be between 2 and 100 characters.", "VALIDATION_ERROR");
  }
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    throw new ProfileError(
      "Name can only contain letters, spaces, hyphens, and apostrophes.",
      "VALIDATION_ERROR"
    );
  }
  await updateUserName(userId, trimmed);
}

// ─── Send Email OTP ───────────────────────────────────────────────────────────

export interface SendOtpResult {
  maskedDestination: string;
}

export async function sendEmailOtp(
  userId:   string,
  newEmail: string
): Promise<SendOtpResult> {
  const email = newEmail.trim().toLowerCase();

  // Basic format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ProfileError("Invalid email address.", "VALIDATION_ERROR");
  }

  // Duplicate check
  if (await emailTakenByOther(email, userId)) {
    throw new ProfileError(
      "This email address is already in use.",
      "EMAIL_TAKEN",
      409
    );
  }

  // Fetch user name for the email template
  const profile = await findProfileById(userId);
  if (!profile) throw new ProfileError("User not found.", "USER_NOT_FOUND", 404);

  const otp = await issueOtp("profile_email", userId, email);

  void enqueueOtpJob({
    type: "email",
    to:   email,
    otp,
    name: profile.name,
  });

  return { maskedDestination: maskEmail(email) };
}

// ─── Verify Email OTP → update email ─────────────────────────────────────────

export async function verifyEmailOtp(
  userId: string,
  code:   string
): Promise<void> {
  const newEmail = await consumeOtp("profile_email", userId, code);
  // Re-check duplicate in case another user claimed it during OTP window
  if (await emailTakenByOther(newEmail, userId)) {
    throw new ProfileError(
      "This email address was claimed by another account. Please try a different email.",
      "EMAIL_TAKEN",
      409
    );
  }
  await updateUserEmail(userId, newEmail);
}

// ─── Send Phone OTP ───────────────────────────────────────────────────────────

export async function sendPhoneOtp(
  userId:   string,
  newPhone: string
): Promise<SendOtpResult> {
  const phone = normalizePhone(newPhone);

  if (!/^\d{10}$/.test(phone)) {
    throw new ProfileError(
      "Enter a valid 10-digit Indian phone number.",
      "VALIDATION_ERROR"
    );
  }

  // Duplicate check
  if (await phoneTakenByOther(phone, userId)) {
    throw new ProfileError(
      "This phone number is already in use.",
      "PHONE_TAKEN",
      409
    );
  }

  const otp = await issueOtp("profile_phone", userId, phone);

  void enqueueOtpJob({ type: "phone", to: phone, otp });

  return { maskedDestination: maskPhone(phone) };
}

// ─── Verify Phone OTP → update phone ─────────────────────────────────────────

export async function verifyPhoneOtp(
  userId: string,
  code:   string
): Promise<void> {
  const newPhone = await consumeOtp("profile_phone", userId, code);
  if (await phoneTakenByOther(newPhone, userId)) {
    throw new ProfileError(
      "This phone number was claimed by another account. Please try a different number.",
      "PHONE_TAKEN",
      409
    );
  }
  await updateUserPhone(userId, newPhone);
}
