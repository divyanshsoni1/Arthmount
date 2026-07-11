/**
 * Temporary forgot-password session stored in Redis.
 *
 * Built incrementally across 5 API steps:
 *   1. send-phone-otp   → stores { phone }
 *   2. verify-phone-otp → adds   { userId, name, email?, phoneVerified: true }
 *   3. send-email-otp   → adds   { emailSent: true }          (only when email exists)
 *   4. verify-email-otp → adds   { emailVerified: true }      (only when email exists)
 *   5. reset-password   → reads all, updates DB, deletes session
 *
 * Key : forgot:session:{sessionId}
 * TTL : 15 minutes — short window intentional for security
 */

import { redis } from "@/lib/redis";
import { randomBytes } from "crypto";

const PREFIX  = "forgot:session:";
const TTL_SEC = 15 * 60; // 15 minutes

export interface ForgotSession {
  phone:         string;
  userId?:       string;
  name?:         string;
  email?:        string | null;   // null = confirmed no email on account
  phoneVerified: boolean;
  emailVerified: boolean;
}

function key(id: string) { return `${PREFIX}${id}`; }

export async function createForgotSession(phone: string): Promise<string> {
  const id = randomBytes(32).toString("hex");
  const session: ForgotSession = { phone, phoneVerified: false, emailVerified: false };
  await redis.set(key(id), JSON.stringify(session), "EX", TTL_SEC);
  return id;
}

export async function getForgotSession(id: string): Promise<ForgotSession | null> {
  const raw = await redis.get(key(id));
  if (!raw) return null;
  return JSON.parse(raw) as ForgotSession;
}

export async function updateForgotSession(
  id: string,
  patch: Partial<ForgotSession>
): Promise<void> {
  const existing = await getForgotSession(id);
  if (!existing) throw new Error("[ForgotSession] Session not found or expired.");
  await redis.set(key(id), JSON.stringify({ ...existing, ...patch }), "EX", TTL_SEC);
}

export async function deleteForgotSession(id: string): Promise<void> {
  await redis.del(key(id));
}
