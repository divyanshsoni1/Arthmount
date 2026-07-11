/**
 * Razorpay client-side helpers.
 *
 * Lazily loads the Razorpay Checkout script on first use so it is never
 * loaded on pages that don't need it.
 *
 * Only the key_id (RAZORPAY_API_KEY) is used here — the secret never
 * reaches the browser.
 */

"use client";

// ─── Script loader ───────────────────────────────────────────────────────────

let scriptPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (document.getElementById("razorpay-checkout-js")) {
      resolve();
      return;
    }
    const script   = document.createElement("script");
    script.id      = "razorpay-checkout-js";
    script.src     = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow retry
      reject(new Error("Failed to load Razorpay Checkout script."));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RazorpayCheckoutOptions {
  key:          string;
  amount:       number;   // paise
  currency:     string;
  name:         string;
  description:  string;
  order_id:     string;
  prefill?: {
    name?:    string;
    email?:   string;
    contact?: string;
  };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  handler: (response: RazorpaySuccessResponse) => void;
}

export interface RazorpaySuccessResponse {
  razorpay_order_id:   string;
  razorpay_payment_id: string;
  razorpay_signature:  string;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => { open(): void };
  }
}

// ─── Checkout helper ─────────────────────────────────────────────────────────

/**
 * Loads the Razorpay script (if not already loaded) then opens the
 * payment modal.  Returns a cleanup function that does nothing (the modal
 * manages its own lifecycle).
 */
export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<void> {
  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error("Razorpay Checkout did not load correctly.");
  }

  const rzp = new window.Razorpay(options);
  rzp.open();
}
