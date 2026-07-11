/**
 * Razorpay server-side helpers.
 * The secret is NEVER sent to the client.
 *
 * Env vars required:
 *   RAZORPAY_API_KEY    – key_id   (safe to expose to client)
 *   RAZORPAY_API_SECRET – key_secret (server only)
 */

import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "crypto";

// ─── Singleton ─────────────────────────────────────────────────────────────

let _rzp: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!_rzp) {
    const key_id     = process.env.RAZORPAY_API_KEY;
    const key_secret = process.env.RAZORPAY_API_SECRET;
    if (!key_id || !key_secret) {
      throw new Error("[Razorpay] Missing RAZORPAY_API_KEY or RAZORPAY_API_SECRET");
    }
    _rzp = new Razorpay({ key_id, key_secret });
  }
  return _rzp;
}

// ─── Order creation ─────────────────────────────────────────────────────────

export interface RazorpayOrderResult {
  orderId:  string;
  amount:   number;   // paise
  currency: string;
  keyId:    string;   // safe to send to client
}

/**
 * Creates a Razorpay order.
 * @param amountRupees  Amount in Indian Rupees (e.g. 500.00)
 * @param receiptId     Internal unique ID for idempotency
 */
export async function createRazorpayOrder(
  amountRupees: number,
  receiptId:    string
): Promise<RazorpayOrderResult> {
  const amountPaise = Math.round(amountRupees * 100);

  const order = await getRazorpay().orders.create({
    amount:   amountPaise,
    currency: "INR",
    receipt:  receiptId,
    payment_capture: true,
  });

  return {
    orderId:  order.id,
    amount:   amountPaise,
    currency: "INR",
    keyId:    process.env.RAZORPAY_API_KEY!,
  };
}

// ─── Signature verification ─────────────────────────────────────────────────

/**
 * Verifies the Razorpay payment signature to ensure the callback is genuine.
 * MUST be called server-side only — requires the secret.
 */
export function verifyRazorpaySignature(
  razorpayOrderId:   string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const secret = process.env.RAZORPAY_API_SECRET;
  if (!secret) throw new Error("[Razorpay] Missing RAZORPAY_API_SECRET");

  const body    = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = createHmac("sha256", secret).update(body).digest("hex");

  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(razorpaySignature);

  // Length mismatch → definitely invalid (timingSafeEqual requires equal length)
  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}
