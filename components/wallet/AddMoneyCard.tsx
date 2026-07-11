"use client";

import { useState, useCallback, useRef } from "react";
import { Loader2, Plus, ShieldCheck } from "lucide-react";

import { openRazorpayCheckout, type RazorpaySuccessResponse } from "@/lib/razorpay/client";
import { useCreateOrder, useVerifyPayment, extractWalletError } from "@/api-client/wallet";
import type { VerifyPaymentResult } from "@/api-client/wallet";

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];
const MIN = 10;
const MAX = 100_000;

interface AddMoneyCardProps {
  userName?:  string;
  userEmail?: string;
  userPhone?: string;
  onSuccess:  (result: VerifyPaymentResult) => void;
  onFailure:  (message: string) => void;
}

export function AddMoneyCard({
  userName, userEmail, userPhone,
  onSuccess, onFailure,
}: AddMoneyCardProps) {
  const [raw,      setRaw]      = useState("");
  const [fieldErr, setFieldErr] = useState<string | null>(null);
  const [busy,     setBusy]     = useState(false);
  const processing = useRef(false); // prevents double-click

  const createOrder   = useCreateOrder();
  const verifyPayment = useVerifyPayment();

  const amount = parseFloat(raw);
  const isValid = raw !== "" && Number.isFinite(amount) && amount >= MIN && amount <= MAX;

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // Allow digits and up to two decimal places only
    if (v && !/^\d{0,7}(\.\d{0,2})?$/.test(v)) return;
    setRaw(v);
    setFieldErr(null);
    if (v && parseFloat(v) < MIN)  setFieldErr(`Minimum amount is ₹${MIN}`);
    if (v && parseFloat(v) > MAX)  setFieldErr(`Maximum amount is ₹${MAX.toLocaleString("en-IN")}`);
  };

  const handleQuick = (val: number) => {
    setRaw(String(val));
    setFieldErr(null);
  };

  const handlePay = useCallback(async () => {
    if (!isValid || processing.current) return;
    processing.current = true;
    setBusy(true);

    try {
      // Step 1 — create Razorpay order server-side
      const order = await createOrder.mutateAsync(amount);

      // Step 2 — open Razorpay Checkout
      await openRazorpayCheckout({
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        "Arthmount",
        description: "Wallet Recharge",
        order_id:    order.orderId,
        prefill: {
          name:    userName,
          email:   userEmail,
          contact: userPhone,
        },
        theme: { color: "#059669" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            processing.current = false;
            onFailure("Payment was cancelled.");
          },
        },
        handler: async (response: RazorpaySuccessResponse) => {
          // Step 3 — verify signature server-side + credit wallet
          try {
            const result = await verifyPayment.mutateAsync({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setRaw("");
            onSuccess(result);
          } catch (err) {
            onFailure(extractWalletError(err));
          } finally {
            setBusy(false);
            processing.current = false;
          }
        },
      });
    } catch (err) {
      onFailure(extractWalletError(err));
      setBusy(false);
      processing.current = false;
    }
  }, [isValid, amount, createOrder, verifyPayment, userName, userEmail, userPhone, onSuccess, onFailure]);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-900 mb-4">Add Money</h2>

      {/* Amount input */}
      <div className="relative mb-2">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400 select-none">
          ₹
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={handleInput}
          placeholder="Enter amount"
          disabled={busy}
          aria-label="Amount in rupees"
          aria-invalid={!!fieldErr}
          aria-describedby={fieldErr ? "amount-error" : undefined}
          className={[
            "h-14 w-full rounded-2xl border-2 bg-slate-50 pl-10 pr-4 text-2xl font-bold text-slate-800",
            "outline-none transition-all placeholder:text-slate-300",
            "focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10",
            fieldErr ? "border-red-400" : "border-slate-200",
            busy ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
        />
      </div>
      {fieldErr && (
        <p id="amount-error" role="alert" className="mb-3 text-xs font-medium text-red-600">
          {fieldErr}
        </p>
      )}

      {/* Quick amount chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {QUICK_AMOUNTS.map((v) => (
          <button
            key={v}
            type="button"
            disabled={busy}
            onClick={() => handleQuick(v)}
            aria-label={`Add ₹${v}`}
            className={[
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all",
              "hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700",
              "disabled:cursor-not-allowed disabled:opacity-50",
              raw !== "" && parseFloat(raw) === v
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600",
            ].join(" ")}
          >
            +₹{v.toLocaleString("en-IN")}
          </button>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        disabled={!isValid || busy}
        onClick={handlePay}
        aria-disabled={!isValid || busy}
        className={[
          "flex w-full items-center justify-center gap-2 rounded-2xl py-3.5",
          "text-base font-bold text-white transition-all",
          "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]",
          "shadow-lg shadow-emerald-600/25",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30",
        ].join(" ")}
      >
        {busy ? (
          <><Loader2 size={18} className="animate-spin" /> Processing...</>
        ) : (
          <><Plus size={18} /> Add Money</>
        )}
      </button>

      {/* Trust note */}
      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck size={13} className="text-emerald-500" />
        Secured by Razorpay · 256-bit SSL encryption
      </div>
    </div>
  );
}
