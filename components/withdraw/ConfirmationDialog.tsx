"use client";

import { AlertTriangle, Building2, Smartphone, Loader2, X, ShieldCheck } from "lucide-react";
import type { WithdrawalSource } from "@/api-client/withdraw";
import { fmtWithdrawINR } from "@/api-client/withdraw";

// ─── Local type (not exported from api-client) ────────────────────────────────
export type PayoutMethodType = "BANK" | "UPI";

interface ConfirmationData {
  source:            WithdrawalSource;
  packageName?:      string;
  amount:            number;
  fee:               number;
  tax:               number;
  netAmount:         number;
  method:            PayoutMethodType;
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
  data:        ConfirmationData;
  onConfirm:   () => void;
  onCancel:    () => void;
  isSubmitting: boolean;
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold text-right tabular-nums ${highlight ? "text-emerald-600" : "text-slate-800"}`}>
        {value}
      </span>
    </div>
  );
}

export function ConfirmationDialog({ data, onConfirm, onCancel, isSubmitting }: Props) {
  const destination = data.method === "BANK"
    ? `${data.bankName ?? ""} ••••${(data.accountNumber ?? "").slice(-4)}`
    : data.upiId ?? "";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isSubmitting && onCancel()}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 id="confirm-title" className="text-base font-extrabold text-slate-900">
                Confirm Withdrawal
              </h2>
              <p className="text-xs text-slate-500">Please review before submitting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-1 divide-y divide-slate-50">
          <Row label="Source"          value={data.source === "WALLET" ? "Wallet Balance" : `Investment — ${data.packageName ?? ""}`} />
          <Row label="Amount"          value={fmtWithdrawINR(data.amount)} />
          <Row label="Processing Fee"  value={data.fee === 0 ? "FREE" : `− ${fmtWithdrawINR(data.fee)}`} />
          <Row label="Tax (TDS)"       value={data.tax === 0 ? "₹0.00" : `− ${fmtWithdrawINR(data.tax)}`} />

          {/* Destination */}
          <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="text-sm text-slate-500">To</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              {data.method === "BANK"
                ? <><Building2 size={13} className="text-blue-500" /> {destination}</>
                : <><Smartphone size={13} className="text-violet-500" /> {destination}</>
              }
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="text-sm text-slate-500">Processing Time</span>
            <span className="text-sm font-semibold text-slate-800">{data.processingTime}</span>
          </div>

          {/* Net amount highlight */}
          <div className="!border-t-2 flex items-center justify-between gap-4 pt-3 pb-1">
            <span className="text-base font-bold text-slate-900">You Receive</span>
            <span className="text-xl font-extrabold text-emerald-600 tabular-nums">
              {fmtWithdrawINR(data.netAmount)}
            </span>
          </div>
        </div>

        {/* Warning banner */}
        <div className="mx-6 mb-4 flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>This request cannot be modified after submission.</strong> Your wallet balance will be
            debited immediately. The amount will be credited to your destination within {data.processingTime}.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
              : "Confirm Withdrawal"
            }
          </button>
        </div>
      </div>
    </div>
  );
}
