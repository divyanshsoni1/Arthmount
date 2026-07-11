/**
 * Temporary signup session stored in Redis.
 *
 * The session is built incrementally across 4 API steps:
 *   1. init        → stores { name }
 *   2. send-otp    → adds   { phone, otpSentAt }
 *   3. verify-otp  → adds   { phoneVerified: true }
 *   4. complete    → reads everything, writes to DB, deletes session
 *
 * Key  : signup:session:{sessionId}
 * TTL  : 30 minutes — abandoned signups are auto-cleaned up
 * sessionId is a random 32-byte hex string issued at step 1 and carried
 * as a signed JWT (signup token) so the client can't tamper with it.
 */

import { redis } from "@/lib/redis";
import { randomBytes } from "crypto";

const SESSION_PREFIX  = "signup:session:";
const SESSION_TTL_SEC = 30 * 60; // 30 minutes

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignupSession {
  name:          string;
  phone?:        string;
  phoneVerified: boolean;
}

// ─── Key helper ───────────────────────────────────────────────────────────────

function sessionKey(id: string) {
  return `${SESSION_PREFIX}${id}`;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Create a brand-new session with just the name. Returns the session ID. */
export async function createSignupSession(name: string): Promise<string> {
  const id = randomBytes(32).toString("hex");
  const session: SignupSession = { name, phoneVerified: false };
  await redis.set(sessionKey(id), JSON.stringify(session), "EX", SESSION_TTL_SEC);
  return id;
}

/** Read session. Returns null if expired or not found. */
export async function getSignupSession(id: string): Promise<SignupSession | null> {
  const raw = await redis.get(sessionKey(id));
  if (!raw) return null;
  return JSON.parse(raw) as SignupSession;
}

/** Merge partial fields into existing session, reset TTL. */
export async function updateSignupSession(
  id: string,
  patch: Partial<SignupSession>
): Promise<void> {
  const existing = await getSignupSession(id);
  if (!existing) throw new Error("[SignupSession] Session not found or expired.");
  const updated = { ...existing, ...patch };
  await redis.set(sessionKey(id), JSON.stringify(updated), "EX", SESSION_TTL_SEC);
}

/** Delete session after successful signup or abandonment. */
export async function deleteSignupSession(id: string): Promise<void> {
  await redis.del(sessionKey(id));
}
