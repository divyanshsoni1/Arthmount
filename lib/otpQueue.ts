/**
 * OTP delivery queue backed by a Redis list.
 *
 * Pattern: producer (API route) does LPUSH, worker does BRPOP.
 * No external queue library required — ioredis is already in the project.
 *
 * Queue key : otp:queue
 * Job shape :
 *   { type: "email", to: string, otp: string, name: string }
 *   { type: "phone", to: string, otp: string }
 */

import { redis } from "@/lib/redis";

const QUEUE_KEY = "otp:queue";

// ─── Job types ────────────────────────────────────────────────────────────────

export type OtpJob =
  | { type: "email"; to: string; otp: string; name: string }
  | { type: "phone"; to: string; otp: string };

// ─── Producer: enqueue a job (called from auth.service) ───────────────────────

export async function enqueueOtpJob(job: OtpJob): Promise<void> {
  await redis.lpush(QUEUE_KEY, JSON.stringify(job));
}

// ─── Consumer: blocking pop — used by the worker process ─────────────────────

/**
 * Waits up to `timeoutSeconds` for a job. Returns null on timeout.
 * BRPOP returns [key, value] or null.
 */
export async function dequeueOtpJob(timeoutSeconds = 5): Promise<OtpJob | null> {
  const result = await redis.brpop(QUEUE_KEY, timeoutSeconds);
  if (!result) return null;
  return JSON.parse(result[1]) as OtpJob;
}

export { QUEUE_KEY };
