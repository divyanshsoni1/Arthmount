"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, RefreshCw, X } from "lucide-react";
import { formatINR, type VerifyPaymentResult } from "@/api-client/wallet";

// ─── Success Dialog ────────────────────────────────────────────────────────

interface SuccessDialogProps {
  result:   VerifyPaymentResult;
  onClose:  () => void;
}

export function PaymentSuccessDialog({ result, onClose }: SuccessDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Payment successful"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 size={44} className="text-emerald-600" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">Payment Successful!</h2>
        <p className="text-3xl font-black text-emerald-600 mb-2">
          {formatINR(result.amount)}
        </p>
        <p className="text-sm text-slate-500 mb-1">added to your wallet</p>
        <p className="text-sm text-slate-500 mb-6">
          New balance:{" "}
          <span className="font-semibold text-slate-800">{formatINR(result.newBalance)}</span>
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            Continue
          </button>
          <Link
            href="/dashboard"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors block"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Failure Dialog ────────────────────────────────────────────────────────

interface FailureDialogProps {
  message:  string;
  onRetry:  () => void;
  onClose:  () => void;
}

export function PaymentFailureDialog({ message, onRetry, onClose }: FailureDialogProps) {
  const isCancelled = message.toLowerCase().includes("cancel");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Payment failed"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <AlertCircle size={44} className="text-red-500" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {isCancelled ? "Payment Cancelled" : "Payment Failed"}
        </h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>

        <div className="flex flex-col gap-3">
          {!isCancelled && (
            <button
              type="button"
              onClick={() => { onRetry(); onClose(); }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw size={15} />
              Retry Payment
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
