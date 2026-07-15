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
  method:        PayoutMethodType;
  onMethodChange: (m: PayoutMethodType) => void;
  bankDetails:   BankDetails;
  onBankChange:  (d: BankDetails) => void;
  upiDetails:    UpiDetails;
  onUpiChange:   (d: UpiDetails) => void;
  disabled?:     boolean;
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
    <div>
      <label className="mb-1 block text-xs font-bold text-slate-600">{label}</label>
      <div className={`
        flex items-center rounded-xl border bg-white px-3 py-2.5 transition-colors
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
          className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
        />
        {value && !error && (
          <CheckCircle size={13} className="shrink-0 text-emerald-400 ml-2" />
        )}
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600">
          <AlertCircle size={10} /> {error}
        </p>
      )}
      {!error && hint && (
        <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
      )}
    </div>
  );
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateBank(d: BankDetails): Partial<Record<keyof BankDetails, string>> {
  const errs: Partial<Record<keyof BankDetails, string>> = {};
  if (!d.accountHolderName.trim()) errs.accountHolderName = "Name is required.";
  if (!d.bankName.trim())          errs.bankName          = "Bank name is required.";
  if (!/^\d{9,18}$/.test(d.accountNumber.trim())) errs.accountNumber = "Must be 9–18 digits.";
  if (d.confirmAccount.trim() !== d.accountNumber.trim()) errs.confirmAccount = "Account numbers do not match.";
  if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/i.test(d.ifscCode.trim())) errs.ifscCode = "Invalid IFSC (e.g. SBIN0001234).";
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
    <div className="space-y-4">
      {/* Method tabs */}
      <div className="grid grid-cols-2 gap-3">
        {/* Bank */}
        <button
          type="button"
          onClick={() => onMethodChange("BANK")}
          className={`
            flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200
            ${method === "BANK"
              ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
              : "border-slate-200 bg-white hover:border-slate-300"
            }
            ${disabled ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${method === "BANK" ? "bg-blue-500" : "bg-slate-100"}`}>
            <Building2 size={15} className={method === "BANK" ? "text-white" : "text-slate-400"} />
          </div>
          <div>
            <p className={`text-sm font-bold ${method === "BANK" ? "text-blue-700" : "text-slate-700"}`}>
              Bank Account
            </p>
            <p className="text-[11px] text-slate-500">NEFT / IMPS / RTGS</p>
          </div>
        </button>

        {/* UPI */}
        <button
          type="button"
          onClick={() => onMethodChange("UPI")}
          className={`
            flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200
            ${method === "UPI"
              ? "border-violet-500 bg-violet-50 shadow-md shadow-violet-100"
              : "border-slate-200 bg-white hover:border-slate-300"
            }
            ${disabled ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${method === "UPI" ? "bg-violet-500" : "bg-slate-100"}`}>
            <Smartphone size={15} className={method === "UPI" ? "text-white" : "text-slate-400"} />
          </div>
          <div>
            <p className={`text-sm font-bold ${method === "UPI" ? "text-violet-700" : "text-slate-700"}`}>
              UPI ID
            </p>
            <p className="text-[11px] text-slate-500">Instant transfer</p>
          </div>
        </button>
      </div>

      {/* Bank form */}
      {method === "BANK" && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 size={11} /> Bank Account Details
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
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
              type="text"
              inputMode="numeric"
              error={bankDetails.accountNumber ? bankErrs.accountNumber ?? null : null}
              disabled={disabled}
            />
            <Field
              label="Confirm Account Number"
              value={bankDetails.confirmAccount}
              onChange={(v) => onBankChange({ ...bankDetails, confirmAccount: v.replace(/\D/g, "") })}
              placeholder="Re-enter account number"
              type="text"
              inputMode="numeric"
              error={bankDetails.confirmAccount ? bankErrs.confirmAccount ?? null : null}
              disabled={disabled}
            />
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
          <div className="flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-[11px] text-blue-700">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            Funds are transferred via NEFT/IMPS. Processing takes 1–2 business days.
          </div>
        </div>
      )}

      {/* UPI form */}
      {method === "UPI" && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
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
            UPI transfers are typically credited instantly. Verify your UPI ID before submitting.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Export validation helpers for the page ───────────────────────────────────
export { validateBank, validateUpi };
