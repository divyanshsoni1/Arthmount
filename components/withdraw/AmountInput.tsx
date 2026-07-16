"use client";

import { useState, useEffect, useRef } from "react";
import { IndianRupee, AlertCircle, Info } from "lucide-react";
import { fmtWithdrawINR } from "@/api-client/withdraw";

interface Props {
  value:        string;
  onChange:     (v: string) => void;
  maxAmount:    number;
  label?:       string;
  disabled?:    boolean;
  fee?:         number;
  tax?:         number;
  netAmount?:   number;
  processingTime?: string;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

export function AmountInput({
  value, onChange, maxAmount, label,
  disabled, fee = 0, tax = 0, netAmount, processingTime = "1–2 business days",
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const numericValue = parseFloat(value) || 0;

  // ── Validation ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!value || value === "") { setError(null); return; }
    const n = parseFloat(value);
    if (isNaN(n) || n <= 0)            { setError("Enter a valid amount greater than ₹0."); return; }
    if (n < 10)                        { setError("Minimum withdrawal is ₹10."); return; }
    if (n > 500_000)                   { setError("Maximum per request is ₹5,00,000."); return; }
    if (maxAmount > 0 && n > maxAmount) {
      setError(`Exceeds available balance of ${fmtWithdrawINR(maxAmount)}.`);
      return;
    }
    setError(null);
  }, [value, maxAmount]);

  function handleChange(raw: string) {
    const cleaned   = raw.replace(/[^\d.]/g, "").replace(/^(\d*\.?\d*).*/, "$1");
    const parts     = cleaned.split(".");
    const formatted = parts.length > 1
      ? `${parts[0]}.${parts[1].slice(0, 2)}`
      : cleaned;
    onChange(formatted);
  }

  function handleQuick(amount: number) {
    if (amount > maxAmount) return;
    onChange(String(amount));
    inputRef.current?.focus();
  }

  const computedNet = netAmount !== undefined ? netAmount : Math.max(0, numericValue - fee - tax);
  const hasValue    = numericValue > 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Input field */}
      <div>
        {label && (
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
            {label}
          </label>
        )}

        {/* Amount input row */}
        <div className={`
          flex items-center gap-2.5 sm:gap-3 rounded-2xl border-2 bg-white px-3.5 sm:px-4 py-3 sm:py-3.5 transition-all duration-200
          ${error
            ? "border-red-300 ring-2 ring-red-100"
            : "border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100"
          }
          ${disabled ? "opacity-50 pointer-events-none bg-slate-50" : ""}
        `}>
          <IndianRupee
            size={15}
            className={`shrink-0 ${error ? "text-red-400" : "text-slate-400"}`}
          />
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            className="flex-1 min-w-0 bg-transparent text-xl sm:text-2xl font-extrabold text-slate-900 placeholder:text-slate-300 outline-none tabular-nums"
            aria-label="Withdrawal amount"
            aria-describedby={error ? "amount-error" : "amount-hint"}
          />
          {maxAmount > 0 && (
            <button
              type="button"
              onClick={() => onChange(String(Math.floor(maxAmount * 100) / 100))}
              className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-600 hover:bg-emerald-100 active:bg-emerald-200 transition-colors min-h-[32px]"
            >
              MAX
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p id="amount-error" role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600 leading-snug">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            {error}
          </p>
        )}

        {/* Available balance hint */}
        {maxAmount > 0 && !error && (
          <p id="amount-hint" className="mt-1.5 text-[11px] text-slate-400">
            Available: <span className="font-bold text-slate-600">{fmtWithdrawINR(maxAmount)}</span>
          </p>
        )}
      </div>

      {/* Quick amount chips — wrap naturally, no scroll */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {QUICK_AMOUNTS.map((amt) => {
          const isDisabled = disabled || amt > maxAmount;
          return (
            <button
              key={amt}
              type="button"
              disabled={isDisabled}
              onClick={() => handleQuick(amt)}
              className={`
                rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-150
                min-h-[36px] sm:min-h-[auto]
                disabled:opacity-30 disabled:cursor-not-allowed
                ${numericValue === amt
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100"
                }
              `}
              aria-label={`Set amount to ${fmtWithdrawINR(amt)}`}
            >
              {fmtWithdrawINR(amt)}
            </button>
          );
        })}
      </div>

      {/* Fee breakdown — only when there's a valid value */}
      {hasValue && !error && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden divide-y divide-slate-100">
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-slate-500 text-xs sm:text-sm">Withdrawal Amount</span>
            <span className="font-semibold text-slate-800 tabular-nums text-xs sm:text-sm">
              {fmtWithdrawINR(numericValue)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-slate-500 text-xs sm:text-sm">Processing Fee</span>
            <span className={`font-semibold tabular-nums text-xs sm:text-sm ${fee === 0 ? "text-emerald-600" : "text-slate-800"}`}>
              {fee === 0 ? "FREE" : `− ${fmtWithdrawINR(fee)}`}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-slate-500 text-xs sm:text-sm">Tax (TDS)</span>
            <span className={`font-semibold tabular-nums text-xs sm:text-sm ${tax === 0 ? "text-emerald-600" : "text-slate-800"}`}>
              {tax === 0 ? "₹0.00" : `− ${fmtWithdrawINR(tax)}`}
            </span>
          </div>
          {/* Net amount — visually prominent */}
          <div className="flex items-center justify-between bg-white px-4 py-3">
            <span className="text-sm font-bold text-slate-900">You Receive</span>
            <span className="text-base sm:text-lg font-extrabold text-emerald-600 tabular-nums">
              {fmtWithdrawINR(computedNet)}
            </span>
          </div>
          {/* Processing time */}
          <div className="flex items-center gap-1.5 bg-blue-50 px-4 py-2 text-[11px] text-blue-700">
            <Info size={11} className="shrink-0" />
            <span>
              Estimated processing: <strong className="ml-0.5">{processingTime}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
