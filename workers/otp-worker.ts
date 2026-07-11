/**
 * OTP Worker — standalone Node.js process.
 *
 * Polls the Redis "otp:queue" list with BRPOP and dispatches OTP messages
 * via email or WhatsApp without blocking the Next.js request cycle.
 *
 * Run:
 *   npm run worker:otp
 *
 * The worker runs independently from the Next.js server. Start it in a
 * separate terminal (or as a separate process/container in production).
 */

import "dotenv/config";

// ioredis worker connection — separate client so it doesn't share state
// with the singleton used by the Next.js app.
import Redis from "ioredis";
import { dequeueOtpJob, type OtpJob } from "../lib/otpQueue";
import { sendOtpEmail }    from "../lib/email";
import { sendOtpWhatsApp } from "../lib/whatsapp";

// ─── Dedicated Redis connection for the worker ────────────────────────────────

const workerRedis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // required for BRPOP — must not timeout on retry
  lazyConnect: false,
  enableReadyCheck: true,
});

workerRedis.on("connect", () => console.log("[OTP Worker] Redis connected"));
workerRedis.on("error",   (e) => console.error("[OTP Worker] Redis error:", e));

// ─── Graceful shutdown ────────────────────────────────────────────────────────

let running = true;

async function shutdown() {
  console.log("[OTP Worker] Shutting down…");
  running = false;
  await workerRedis.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT",  shutdown);

// ─── Job processor ────────────────────────────────────────────────────────────

async function processJob(job: OtpJob): Promise<void> {
  try {
    if (job.type === "email") {
      await sendOtpEmail(job.to, job.otp, job.name);
      console.log(`[OTP Worker] Email OTP sent → ${job.to}`);
    } else {
      await sendOtpWhatsApp(job.to, job.otp);
      console.log(`[OTP Worker] WhatsApp OTP sent → ${job.to}`);
    }
  } catch (err) {
    // Log and continue — do not crash the worker on a single failed delivery.
    // In production you'd push to a dead-letter queue or alert here.
    console.error(`[OTP Worker] Failed to deliver OTP (type=${job.type}, to=${job.to}):`, err);
  }
}

// ─── Main loop ────────────────────────────────────────────────────────────────

async function main() {
  console.log("[OTP Worker] Started. Listening on otp:queue…");

  while (running) {
    try {
      // dequeueOtpJob uses BRPOP with a 5-second timeout so SIGTERM is handled
      // within ~5 s instead of blocking indefinitely.
      const job = await dequeueOtpJob(5);
      if (job) await processJob(job);
    } catch (err) {
      // Guard against unexpected errors so the loop never crashes permanently.
      console.error("[OTP Worker] Unexpected loop error:", err);
      // Brief pause before retrying to avoid a tight error loop.
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

main();
