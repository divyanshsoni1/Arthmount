"use client";

import { AlertTriangle, Building2, Smartphone, Loader2, X, ShieldCheck } from "lucide-react";
import type { WithdrawalSource } from "@/api-client/withdraw";
import { fmtWithdrawINR } from "@/api-client/withdraw";

// ─── Local type (not exported from api-client) ────────────────────────────────
export type PayoutMethodType = "BANK" | "UPI";

interface ConfirmationData {
  source:             WithdrawalSource;
  packageName?:       string;
  amount:             number;
  fee:                number;
  tax:                number;
  netAmount:          number;
  method:             PayoutMethodType;
  // Bank
  accountHolderName?: string;
  bankName?:          string;
  accountNumber?:     string;
  ifscCode?:          string;
  // UPI
  upiId?:             string;
  processingTime:     string;
}

interface Props {
  data:         ConfirmationData;
  onConfirm:    () => void;
  onCancel:     () => void;
  isSubmitting: boolean;
}

function Row({
  label, value, highlight,
}: {
  label:      string;
  value:      string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-xs sm:text-sm text-slate-500 shrink-0">{label}</span>
      <span
        className={`text-xs sm:text-sm font-semibold text-right tabular-nums min-w-0 truncate ml-2 ${
          highlight ? "text-emerald-600" : "text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function ConfirmationDialog({ data, onConfirm, onCancel, isSubmitting }: Props) {
  const destination =
    data.method === "BANK"
      ? `${data.bankName ?? ""} ••••${(data.accountNumber ?? "").slice(-4)}`
      : data.upiId ?? "";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isSubmitting && onCancel()}
        aria-hidden="true"
      />

      {/*
       * Panel:
       * - Mobile: full-width bottom sheet with rounded top corners, no side margins
       * - sm+: centered card, max-w-md, rounded on all sides
       */}
      <div className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]">

        {/* Drag handle — visible on mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-3 sm:pt-6 pb-3 sm:pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
            <div>
              <h2
                id="confirm-title"
                className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight"
              >
                Confirm Withdrawal
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Please review before submitting
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body — prevents overflow on very small screens */}
        <div className="overflow-y-auto overscroll-contain flex-1 px-5 sm:px-6 py-2 divide-y divide-slate-50">
          <Row
            label="Source"
            value={
              data.source === "WALLET"
                ? "Wallet Balance"
                : `Investment — ${data.packageName ?? ""}`
            }
          />
          <Row label="Amount"         value={fmtWithdrawINR(data.amount)} />
          <Row
            label="Processing Fee"
            value={data.fee === 0 ? "FREE" : `− ${fmtWithdrawINR(data.fee)}`}
          />
          <Row
            label="Tax (TDS)"
            value={data.tax === 0 ? "₹0.00" : `− ${fmtWithdrawINR(data.tax)}`}
          />

          {/* Destination row */}
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-xs sm:text-sm text-slate-500 shrink-0">To</span>
            <span className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 min-w-0 ml-2">
              {data.method === "BANK" ? (
                <>
                  <Building2 size={12} className="text-blue-500 shrink-0" />
                  <span className="truncate">{destination}</span>
                </>
              ) : (
                <>
                  <Smartphone size={12} className="text-violet-500 shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-none">{destination}</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-xs sm:text-sm text-slate-500">Processing Time</span>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 ml-2">
              {data.processingTime}
            </span>
          </div>

          {/* Net amount highlight */}
          <div className="!border-t-2 flex items-center justify-between gap-3 pt-3 pb-1">
            <span className="text-sm sm:text-base font-bold text-slate-900">You Receive</span>
            <span className="text-lg sm:text-xl font-extrabold text-emerald-600 tabular-nums ml-2">
              {fmtWithdrawINR(data.netAmount)}
            </span>
          </div>
        </div>

        {/* Warning + actions — pinned to bottom */}
        <div className="shrink-0 px-5 sm:px-6 pb-5 sm:pb-6 pt-3 space-y-3
          pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6">
          <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 px-3.5 sm:px-4 py-3">
            <ShieldCheck size={13} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              <strong>This request cannot be modified after submission.</strong>{" "}
              Your wallet will be debited immediately. The amount will be credited
              within {data.processingTime}.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-40 min-h-[48px]"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Processing…
                </>
              ) : (
                "Confirm Withdrawal"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
