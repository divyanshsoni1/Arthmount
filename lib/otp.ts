/**
 * OTP generation and verification.
 *
 * Hashing strategy: HMAC-SHA256 with a server-side secret (OTP_HMAC_SECRET).
 * bcrypt was ~400 ms per operation for a 6-digit code — completely unnecessary.
 * HMAC-SHA256 is <1 ms and is perfectly secure for a short-lived, rate-limited OTP.
 */

import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { redis } from "@/lib/redis";

const OTP_TTL_SECONDS = 5 * 60;  // 5 minutes
const MAX_ATTEMPTS    = 5;        // lock after 5 wrong tries

// ─── Redis key helpers ────────────────────────────────────────────────────────

function otpKey(userId: string)       { return `otp:${userId}`; }
function rateLimitKey(userId: string) { return `otp:rl:${userId}`; }

// ─── HMAC helper ──────────────────────────────────────────────────────────────

function hmacOtp(code: string): string {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) throw new Error("[OTP] Missing OTP_HMAC_SECRET env variable");
  return createHmac("sha256", secret).update(code).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  // Pad to equal length so timingSafeEqual doesn't throw on length mismatch
  const aBuf = Buffer.from(a.padEnd(64, "0"));
  const bBuf = Buffer.from(b.padEnd(64, "0"));
  // Only return true if lengths actually match AND bytes match
  return a.length === b.length && timingSafeEqual(aBuf, bBuf);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OtpRecord {
  hash:     string;  // HMAC-SHA256 hex of the plain code
  attempts: number;
}

// ─── Generate & store OTP ─────────────────────────────────────────────────────

/**
 * Generates a 6-digit OTP, stores its HMAC hash in Redis, returns the plain code.
 * Takes <2 ms (vs ~400 ms with bcrypt).
 */
export async function createOtp(userId: string): Promise<string> {
  const code   = String(randomInt(100000, 1000000)); // crypto.randomInt — cryptographically secure
  const hash   = hmacOtp(code);
  const record: OtpRecord = { hash, attempts: 0 };

  await redis.set(otpKey(userId), JSON.stringify(record), "EX", OTP_TTL_SECONDS);

  return code;
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────

export type OtpVerifyResult =
  | { success: true }
  | { success: false; reason: "invalid" | "expired" | "locked" };

export async function verifyOtp(
  userId: string,
  code: string
): Promise<OtpVerifyResult> {
  const raw = await redis.get(otpKey(userId));
  if (!raw) return { success: false, reason: "expired" };

  const record: OtpRecord = JSON.parse(raw);

  // Lock check before doing any work
  if (record.attempts >= MAX_ATTEMPTS) {
    await redis.del(otpKey(userId));
    return { success: false, reason: "locked" };
  }

  const match = safeCompare(hmacOtp(code), record.hash);

  if (!match) {
    record.attempts += 1;

    if (record.attempts >= MAX_ATTEMPTS) {
      await redis.del(otpKey(userId));
    } else {
      // Preserve remaining TTL
      const ttl = await redis.ttl(otpKey(userId));
      await redis.set(
        otpKey(userId),
        JSON.stringify(record),
        "EX",
        ttl > 0 ? ttl : OTP_TTL_SECONDS
      );
    }
    return { success: false, reason: "invalid" };
  }

  // Delete on success — OTP is single-use
  await redis.del(otpKey(userId));
  return { success: true };
}

// ─── Rate-limit: max 3 OTP sends per 10 min ──────────────────────────────────

const SEND_LIMIT  = 3;
const SEND_WINDOW = 10 * 60; // 10 minutes

export async function checkSendRateLimit(userId: string): Promise<boolean> {
  const key   = rateLimitKey(userId);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, SEND_WINDOW);
  return count <= SEND_LIMIT;
}
