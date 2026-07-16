"use client";

import { Building2, Smartphone, AlertCircle, CheckCircle } from "lucide-react";

export type PayoutMethodType = "BANK" | "UPI";

export interface BankDetails {
  accountHolderName: string;
  bankName:          string;
  accountNumber:     string;
  confirmAccount:    string;
  ifscCode:          string;
}

export interface UpiDetails {
  upiId: string;
}

interface Props {
  method:         PayoutMethodType;
  onMethodChange: (m: PayoutMethodType) => void;
  bankDetails:    BankDetails;
  onBankChange:   (d: BankDetails) => void;
  upiDetails:     UpiDetails;
  onUpiChange:    (d: UpiDetails) => void;
  disabled?:      boolean;
}

// ─── Text field ───────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = "text",
  inputMode, hint, error, disabled, pattern,
}: {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
  type?:       string;
  inputMode?:  React.HTMLAttributes<HTMLInputElement>["inputMode"];
  hint?:       string;
  error?:      string | null;
  disabled?:   boolean;
  pattern?:    string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <div className={`
        flex items-center rounded-xl border bg-white px-3 py-2.5 transition-colors
        min-h-[44px]
        ${error
          ? "border-red-300 ring-2 ring-red-100"
          : "border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100"
        }
        ${disabled ? "opacity-50 pointer-events-none bg-slate-50" : ""}
      `}>
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          pattern={pattern}
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
        />
        {value && !error && (
          <CheckCircle size={13} className="shrink-0 text-emerald-400 ml-2" />
        )}
      </div>
      {error && (
        <p className="flex items-start gap-1 text-[11px] text-red-600 leading-snug" role="alert">
          <AlertCircle size={10} className="shrink-0 mt-0.5" /> {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-[11px] text-slate-400 leading-snug">{hint}</p>
      )}
    </div>
  );
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateBank(d: BankDetails): Partial<Record<keyof BankDetails, string>> {
  const errs: Partial<Record<keyof BankDetails, string>> = {};
  if (!d.accountHolderName.trim()) errs.accountHolderName = "Name is required.";
  if (!d.bankName.trim())          errs.bankName          = "Bank name is required.";
  if (!/^\d{9,18}$/.test(d.accountNumber.trim()))
    errs.accountNumber = "Must be 9–18 digits.";
  if (d.confirmAccount.trim() !== d.accountNumber.trim())
    errs.confirmAccount = "Account numbers do not match.";
  if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/i.test(d.ifscCode.trim()))
    errs.ifscCode = "Invalid IFSC (e.g. SBIN0001234).";
  return errs;
}

function validateUpi(d: UpiDetails): Partial<Record<keyof UpiDetails, string>> {
  const errs: Partial<Record<keyof UpiDetails, string>> = {};
  if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(d.upiId.trim()))
    errs.upiId = "Invalid UPI ID (e.g. name@upi or 9999999999@paytm).";
  return errs;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PayoutMethod({
  method, onMethodChange,
  bankDetails, onBankChange,
  upiDetails,  onUpiChange,
  disabled,
}: Props) {
  const bankErrs = validateBank(bankDetails);
  const upiErrs  = validateUpi(upiDetails);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Method tabs — full-width with min touch target */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Bank */}
        <button
          type="button"
          onClick={() => onMethodChange("BANK")}
          className={`
            flex items-center gap-2.5 sm:gap-3 rounded-2xl border-2 p-3.5 sm:p-4 text-left transition-all duration-200
            min-h-[64px] sm:min-h-[auto]
            ${method === "BANK"
              ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
              : "border-slate-200 bg-white hover:border-slate-300 active:bg-slate-50"
            }
            ${disabled ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${method === "BANK" ? "bg-blue-500" : "bg-slate-100"}`}>
            <Building2 size={14} className={method === "BANK" ? "text-white" : "text-slate-400"} />
          </div>
          <div className="min-w-0">
            <p className={`text-xs sm:text-sm font-bold leading-snug ${method === "BANK" ? "text-blue-700" : "text-slate-700"}`}>
              Bank Account
            </p>
            <p className="text-[11px] text-slate-500 leading-snug">NEFT / IMPS</p>
          </div>
        </button>

        {/* UPI */}
        <button
          type="button"
          onClick={() => onMethodChange("UPI")}
          className={`
            flex items-center gap-2.5 sm:gap-3 rounded-2xl border-2 p-3.5 sm:p-4 text-left transition-all duration-200
            min-h-[64px] sm:min-h-[auto]
            ${method === "UPI"
              ? "border-violet-500 bg-violet-50 shadow-md shadow-violet-100"
              : "border-slate-200 bg-white hover:border-slate-300 active:bg-slate-50"
            }
            ${disabled ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${method === "UPI" ? "bg-violet-500" : "bg-slate-100"}`}>
            <Smartphone size={14} className={method === "UPI" ? "text-white" : "text-slate-400"} />
          </div>
          <div className="min-w-0">
            <p className={`text-xs sm:text-sm font-bold leading-snug ${method === "UPI" ? "text-violet-700" : "text-slate-700"}`}>
              UPI ID
            </p>
            <p className="text-[11px] text-slate-500 leading-snug">Instant</p>
          </div>
        </button>
      </div>

      {/* Bank form */}
      {method === "BANK" && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 size={11} /> Bank Account Details
          </p>

          {/* Single-column on mobile; 2-column on sm+ */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <Field
              label="Account Holder Name"
              value={bankDetails.accountHolderName}
              onChange={(v) => onBankChange({ ...bankDetails, accountHolderName: v })}
              placeholder="As per bank records"
              error={bankDetails.accountHolderName ? bankErrs.accountHolderName ?? null : null}
              disabled={disabled}
            />
            <Field
              label="Bank Name"
              value={bankDetails.bankName}
              onChange={(v) => onBankChange({ ...bankDetails, bankName: v })}
              placeholder="e.g. State Bank of India"
              error={bankDetails.bankName ? bankErrs.bankName ?? null : null}
              disabled={disabled}
            />
            <Field
              label="Account Number"
              value={bankDetails.accountNumber}
              onChange={(v) => onBankChange({ ...bankDetails, accountNumber: v.replace(/\D/g, "") })}
              placeholder="9–18 digit account number"
              inputMode="numeric"
              error={bankDetails.accountNumber ? bankErrs.accountNumber ?? null : null}
              disabled={disabled}
            />
            <Field
              label="Confirm Account Number"
              value={bankDetails.confirmAccount}
              onChange={(v) => onBankChange({ ...bankDetails, confirmAccount: v.replace(/\D/g, "") })}
              placeholder="Re-enter account number"
              inputMode="numeric"
              error={bankDetails.confirmAccount ? bankErrs.confirmAccount ?? null : null}
              disabled={disabled}
            />
            {/* IFSC spans full width on both layouts for breathing room */}
            <div className="sm:col-span-2">
              <Field
                label="IFSC Code"
                value={bankDetails.ifscCode}
                onChange={(v) => onBankChange({ ...bankDetails, ifscCode: v.toUpperCase() })}
                placeholder="e.g. SBIN0001234"
                error={bankDetails.ifscCode ? bankErrs.ifscCode ?? null : null}
                hint="11-character code found on your cheque book"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-[11px] text-blue-700">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>Funds are transferred via NEFT/IMPS. Processing takes 1–2 business days.</span>
          </div>
        </div>
      )}

      {/* UPI form */}
      {method === "UPI" && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Smartphone size={11} /> UPI Details
          </p>
          <Field
            label="UPI ID"
            value={upiDetails.upiId}
            onChange={(v) => onUpiChange({ upiId: v.trim() })}
            placeholder="yourname@upi or 9999999999@paytm"
            error={upiDetails.upiId ? upiErrs.upiId ?? null : null}
            hint="Supported: @upi, @paytm, @okaxis, @ybl, @gpay, @oksbi, etc."
            disabled={disabled}
          />
          <div className="flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-[11px] text-violet-700">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>UPI transfers are typically credited instantly. Verify your UPI ID before submitting.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Export validation helpers for the page ───────────────────────────────────
export { validateBank, validateUpi };
