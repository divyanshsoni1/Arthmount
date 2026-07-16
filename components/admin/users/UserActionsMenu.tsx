"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreHorizontal, ShieldCheck, UserCog, KeyRound, Wallet,
  ChevronDown, Loader2, XCircle, AlertTriangle, Eye, EyeOff,
  CheckCircle2, PlusCircle, MinusCircle, X,
} from "lucide-react";
import {
  useUpdateUserKyc, useChangeUserRole, useResetUserPassword, useAdjustWallet,
  extractError,
  type KycStatusValue, type UserRoleValue, type WalletOpType,
} from "@/api-client/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  userId:      string;
  currentKyc:  string;
  currentRole: string;
  walletBalance: number;
  onSuccess:   (msg: string) => void;
  onError:     (msg: string) => void;
}

type Dialog = "kyc" | "role" | "password" | "wallet" | null;

// ─── KYC status config ────────────────────────────────────────────────────────

const KYC_OPTIONS: { value: KycStatusValue; label: string; color: string }[] = [
  { value: "PENDING",       label: "Pending",     color: "text-amber-600"  },
  { value: "IN_REVIEW",     label: "In Review",   color: "text-blue-600"   },
  { value: "APPROVED",      label: "Approved",    color: "text-emerald-600"},
  { value: "REJECTED",      label: "Rejected",    color: "text-red-600"    },
];

const ROLE_OPTIONS: { value: UserRoleValue; label: string; color: string }[] = [
  { value: "USER",    label: "User",    color: "text-slate-600"  },
  { value: "AGENT",   label: "Agent",   color: "text-violet-600" },
  { value: "ADMIN",   label: "Admin",   color: "text-blue-600"   },
  { value: "SUPPORT", label: "Support", color: "text-teal-600"   },
];

const WALLET_CREDIT_REASONS = [
  "Bonus credit", "Referral reward", "Promotional credit",
  "Manual correction", "Refund", "System adjustment",
];

const WALLET_DEBIT_REASONS = [
  "Fee deduction", "Penalty", "Manual correction",
  "Chargeback", "System adjustment",
];

// ─── Shared overlay backdrop ──────────────────────────────────────────────────

function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      onClick={onClick}
      aria-hidden="true"
    />
  );
}

// ─── Dialog shell ─────────────────────────────────────────────────────────────

function DialogShell({
  title, subtitle, icon: Icon, iconBg, onClose, children,
}: {
  title: string; subtitle: string;
  icon: React.ElementType; iconBg: string;
  onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 pt-6 pb-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
            <Icon size={18} className="text-current" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 truncate">{subtitle}</p>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Inline error / warning box ───────────────────────────────────────────────

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
      <XCircle size={13} className="shrink-0 mt-0.5 text-red-500" />
      <p className="text-xs text-red-700">{message}</p>
    </div>
  );
}

function WarningBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
      <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-600" />
      <p className="text-xs text-amber-700">{message}</p>
    </div>
  );
}

// ─── KYC Dialog ───────────────────────────────────────────────────────────────

function KycDialog({
  userId, currentKyc, onClose, onSuccess, onError,
}: { userId: string; currentKyc: string; onClose: () => void; onSuccess: (m: string) => void; onError: (m: string) => void }) {
  const [status,  setStatus]  = useState<KycStatusValue>(currentKyc as KycStatusValue);
  const [reason,  setReason]  = useState("");
  const [confirm, setConfirm] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);
  const mut = useUpdateUserKyc(userId);

  const needsReason = status === "REJECTED";
  const unchanged   = status === currentKyc;

  function handleSubmit() {
    if (!confirm) { setConfirm(true); return; }
    setErr(null);
    mut.mutate(
      { status, rejectionReason: needsReason ? reason : undefined },
      {
        onSuccess: () => { onSuccess(`KYC status updated to ${status.replace("_", " ")}`); onClose(); },
        onError:   (e) => setErr(extractError(e)),
      }
    );
  }

  return (
    <DialogShell
      title="Update KYC Status" subtitle="Override the user's KYC verification state"
      icon={ShieldCheck} iconBg="bg-blue-100 text-blue-600"
      onClose={() => !mut.isPending && onClose()}
    >
      <div className="px-6 py-4 space-y-4">
        {/* Status selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">New KYC Status</label>
          <div className="grid grid-cols-2 gap-2">
            {KYC_OPTIONS.map((opt) => (
              <button
                key={opt.value} type="button"
                onClick={() => { setStatus(opt.value); setConfirm(false); }}
                className={[
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all text-left",
                  status === opt.value
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  opt.value === "APPROVED" ? "bg-emerald-400" :
                  opt.value === "REJECTED" ? "bg-red-400" :
                  opt.value === "IN_REVIEW" ? "bg-blue-400" : "bg-amber-400"
                }`} />
                {opt.label}
                {opt.value === currentKyc && <span className="ml-auto text-[10px] opacity-60">current</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Rejection reason */}
        {needsReason && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the KYC is being rejected…"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300"
            />
          </div>
        )}

        {/* Confirmation warning */}
        {confirm && !unchanged && (
          <WarningBox message={`This will change the KYC status to "${status.replace("_", " ")}". This action is audited and the user will be notified.`} />
        )}

        {err && <ErrorBox message={err} />}
      </div>

      <div className="flex gap-3 px-6 pb-6">
        <button type="button" onClick={onClose} disabled={mut.isPending}
          className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
          Cancel
        </button>
        <button
          type="button" onClick={handleSubmit}
          disabled={mut.isPending || unchanged || (needsReason && !reason.trim())}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-800 py-2.5 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mut.isPending
            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : confirm ? <><CheckCircle2 size={14} /> Confirm Update</> : "Review & Confirm"}
        </button>
      </div>
    </DialogShell>
  );
}

// ─── Role Dialog ──────────────────────────────────────────────────────────────

function RoleDialog({
  userId, currentRole, onClose, onSuccess, onError,
}: { userId: string; currentRole: string; onClose: () => void; onSuccess: (m: string) => void; onError: (m: string) => void }) {
  const [role,    setRole]    = useState<UserRoleValue>(currentRole as UserRoleValue);
  const [confirm, setConfirm] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);
  const mut = useChangeUserRole(userId);

  const unchanged = role === currentRole;

  function handleSubmit() {
    if (!confirm) { setConfirm(true); return; }
    setErr(null);
    mut.mutate(
      { role },
      {
        onSuccess: () => { onSuccess(`User role changed to ${role}`); onClose(); },
        onError:   (e) => setErr(extractError(e)),
      }
    );
  }

  return (
    <DialogShell
      title="Change User Role" subtitle="Update the user's access level and permissions"
      icon={UserCog} iconBg="bg-violet-100 text-violet-600"
      onClose={() => !mut.isPending && onClose()}
    >
      <div className="px-6 py-4 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">New Role</label>
          <div className="space-y-2">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value} type="button"
                onClick={() => { setRole(opt.value); setConfirm(false); }}
                className={[
                  "w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition-all",
                  role === opt.value
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${
                    opt.value === "ADMIN"   ? "bg-blue-400" :
                    opt.value === "AGENT"   ? "bg-violet-400" :
                    opt.value === "SUPPORT" ? "bg-teal-400" : "bg-slate-400"
                  } ${role === opt.value ? "opacity-80" : ""}`} />
                  {opt.label}
                </span>
                {opt.value === currentRole && (
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-wide">Current</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {confirm && !unchanged && (
          <WarningBox message={`This will change the user's role to "${role}". Role changes take effect immediately and are recorded in the audit log.`} />
        )}

        {err && <ErrorBox message={err} />}
      </div>

      <div className="flex gap-3 px-6 pb-6">
        <button type="button" onClick={onClose} disabled={mut.isPending}
          className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
          Cancel
        </button>
        <button
          type="button" onClick={handleSubmit}
          disabled={mut.isPending || unchanged}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mut.isPending
            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : confirm ? <><CheckCircle2 size={14} /> Confirm Change</> : "Review & Confirm"}
        </button>
      </div>
    </DialogShell>
  );
}

// ─── Password Dialog ──────────────────────────────────────────────────────────

function PasswordDialog({
  userId, onClose, onSuccess, onError,
}: { userId: string; onClose: () => void; onSuccess: (m: string) => void; onError: (m: string) => void }) {
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [showCf,     setShowCf]     = useState(false);
  const [confirmed,  setConfirmed]  = useState(false);
  const [err,        setErr]        = useState<string | null>(null);
  const mut = useResetUserPassword(userId);

  const minLen   = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum   = /[0-9]/.test(password);
  const matches  = password === confirm && confirm.length > 0;
  const valid    = minLen && hasUpper && hasNum && matches;

  function handleSubmit() {
    if (!confirmed) { setConfirmed(true); return; }
    setErr(null);
    mut.mutate(
      { password, confirmPassword: confirm },
      {
        onSuccess: () => { onSuccess("Password updated. All active sessions have been invalidated."); onClose(); },
        onError:   (e) => setErr(extractError(e)),
      }
    );
  }

  function Rule({ ok, label }: { ok: boolean; label: string }) {
    return (
      <span className={`flex items-center gap-1 text-[11px] ${ok ? "text-emerald-600" : "text-slate-400"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-300"}`} />
        {label}
      </span>
    );
  }

  return (
    <DialogShell
      title="Reset Password" subtitle="Set a new password for this user account"
      icon={KeyRound} iconBg="bg-amber-100 text-amber-600"
      onClose={() => !mut.isPending && onClose()}
    >
      <div className="px-6 py-4 space-y-4">
        {/* New password */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            New Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setConfirmed(false); }}
              placeholder="Enter new password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 placeholder:text-slate-300"
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {/* Policy checklist */}
          {password.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <Rule ok={minLen}   label="Min 8 chars" />
              <Rule ok={hasUpper} label="Uppercase letter" />
              <Rule ok={hasNum}   label="Number" />
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showCf ? "text" : "password"}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setConfirmed(false); }}
              placeholder="Re-enter new password"
              className={[
                "w-full rounded-xl border bg-white px-3 py-2.5 pr-10 text-sm text-slate-800 outline-none placeholder:text-slate-300",
                confirm.length > 0
                  ? matches
                    ? "border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    : "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100",
              ].join(" ")}
            />
            <button type="button" onClick={() => setShowCf((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {confirmed && valid && (
          <WarningBox message="This will immediately reset the user's password and invalidate all their active sessions. This action is audited." />
        )}

        {err && <ErrorBox message={err} />}
      </div>

      <div className="flex gap-3 px-6 pb-6">
        <button type="button" onClick={onClose} disabled={mut.isPending}
          className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
          Cancel
        </button>
        <button
          type="button" onClick={handleSubmit}
          disabled={mut.isPending || !valid}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mut.isPending
            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : confirmed ? <><CheckCircle2 size={14} /> Confirm Reset</> : "Review & Confirm"}
        </button>
      </div>
    </DialogShell>
  );
}

// ─── Wallet Dialog ────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(n);
}

function WalletDialog({
  userId, walletBalance, onClose, onSuccess, onError,
}: { userId: string; walletBalance: number; onClose: () => void; onSuccess: (m: string) => void; onError: (m: string) => void }) {
  const [tab,       setTab]       = useState<WalletOpType>("CREDIT");
  const [amount,    setAmount]    = useState("");
  const [reason,    setReason]    = useState("");
  const [note,      setNote]      = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [err,       setErr]       = useState<string | null>(null);
  const mut = useAdjustWallet(userId);

  const reasons    = tab === "CREDIT" ? WALLET_CREDIT_REASONS : WALLET_DEBIT_REASONS;
  const parsedAmt  = parseFloat(amount);
  const validAmt   = !isNaN(parsedAmt) && parsedAmt > 0;
  const overBalance = tab === "DEBIT" && validAmt && parsedAmt > walletBalance;
  const canSubmit  = validAmt && reason.trim().length > 0 && !overBalance;

  function reset() {
    setAmount(""); setReason(""); setNote(""); setConfirmed(false); setErr(null);
  }

  function handleTabChange(t: WalletOpType) {
    setTab(t); reset();
  }

  function handleSubmit() {
    if (!confirmed) { setConfirmed(true); return; }
    setErr(null);
    mut.mutate(
      { type: tab, amount: parsedAmt, reason: reason.trim(), note: note.trim() || undefined },
      {
        onSuccess: () => {
          const label = tab === "CREDIT" ? "credited to" : "debited from";
          onSuccess(`${fmtINR(parsedAmt)} ${label} wallet successfully.`);
          onClose();
        },
        onError: (e) => setErr(extractError(e)),
      }
    );
  }

  return (
    <DialogShell
      title="Wallet Management" subtitle={`Current balance: ${fmtINR(walletBalance)}`}
      icon={Wallet} iconBg="bg-emerald-100 text-emerald-600"
      onClose={() => !mut.isPending && onClose()}
    >
      <div className="px-6 py-4 space-y-4">
        {/* Tab switcher */}
        <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50 gap-1">
          {(["CREDIT", "DEBIT"] as WalletOpType[]).map((t) => (
            <button
              key={t} type="button"
              onClick={() => handleTabChange(t)}
              className={[
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition-all",
                tab === t
                  ? t === "CREDIT"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-red-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              {t === "CREDIT" ? <PlusCircle size={14} /> : <MinusCircle size={14} />}
              {t === "CREDIT" ? "Add Funds" : "Deduct Funds"}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Amount (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number" min="0.01" step="0.01"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setConfirmed(false); }}
            placeholder="0.00"
            className={[
              "w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-mono text-slate-800 outline-none placeholder:text-slate-300 transition-all",
              overBalance
                ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                : "border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100",
            ].join(" ")}
          />
          {overBalance && (
            <p className="mt-1 text-xs text-red-600 font-medium">
              Exceeds available balance of {fmtINR(walletBalance)}
            </p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Reason <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {reasons.map((r) => (
              <button key={r} type="button"
                onClick={() => { setReason(r); setConfirmed(false); }}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  reason === r
                    ? tab === "CREDIT"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-red-600 text-white border-red-600"
                    : "border-slate-200 text-slate-600 hover:border-slate-300",
                ].join(" ")}
              >
                {r}
              </button>
            ))}
          </div>
          <input
            type="text" value={reason}
            onChange={(e) => { setReason(e.target.value); setConfirmed(false); }}
            placeholder="Or type a custom reason…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-300"
          />
        </div>

        {/* Optional note */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Internal Note <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text" value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Additional context for the audit log…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-300"
          />
        </div>

        {/* Summary card before confirmation */}
        {confirmed && canSubmit && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 divide-y divide-slate-100 text-xs">
            <div className="flex justify-between px-3 py-2">
              <span className="text-slate-500">Operation</span>
              <span className={`font-bold ${tab === "CREDIT" ? "text-emerald-700" : "text-red-700"}`}>
                {tab === "CREDIT" ? "Credit" : "Debit"}
              </span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="text-slate-500">Amount</span>
              <span className="font-bold text-slate-900">{fmtINR(parsedAmt)}</span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="text-slate-500">Balance after</span>
              <span className="font-bold text-slate-900">
                {fmtINR(tab === "CREDIT" ? walletBalance + parsedAmt : walletBalance - parsedAmt)}
              </span>
            </div>
          </div>
        )}

        {confirmed && canSubmit && (
          <WarningBox message={`This will ${tab === "CREDIT" ? "add" : "deduct"} ${fmtINR(parsedAmt)} ${tab === "CREDIT" ? "to" : "from"} the user's wallet. This action is audited and irreversible.`} />
        )}

        {err && <ErrorBox message={err} />}
      </div>

      <div className="flex gap-3 px-6 pb-6">
        <button type="button" onClick={onClose} disabled={mut.isPending}
          className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
          Cancel
        </button>
        <button
          type="button" onClick={handleSubmit}
          disabled={mut.isPending || !canSubmit}
          className={[
            "flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
            tab === "CREDIT" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700",
          ].join(" ")}
        >
          {mut.isPending
            ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
            : confirmed
              ? <><CheckCircle2 size={14} /> Confirm {tab === "CREDIT" ? "Credit" : "Debit"}</>
              : "Review & Confirm"}
        </button>
      </div>
    </DialogShell>
  );
}

// ─── Main dropdown menu ───────────────────────────────────────────────────────

const MENU_ITEMS = [
  { id: "kyc",      label: "Update KYC Status",       icon: ShieldCheck, color: "text-blue-600"   },
  { id: "role",     label: "Change User Role",         icon: UserCog,     color: "text-violet-600" },
  { id: "password", label: "Reset Password",           icon: KeyRound,    color: "text-amber-600"  },
  { id: "wallet",   label: "Wallet Management",        icon: Wallet,      color: "text-emerald-600"},
] as const;

export function UserActionsMenu({
  userId, currentKyc, currentRole, walletBalance, onSuccess, onError,
}: Props) {
  const [open,   setOpen]   = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close dropdown on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setDialog(null); }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function openDialog(d: Dialog) {
    setOpen(false);
    setDialog(d);
  }

  const closeDialog = () => setDialog(null);

  const sharedProps = { userId, onClose: closeDialog, onSuccess, onError };

  return (
    <>
      {/* Trigger button */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <MoreHorizontal size={14} />
          More Actions
          <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            role="menu"
            className="absolute left-0 top-full mt-1.5 z-30 w-56 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100"
          >
            <div className="px-2 py-2">
              {MENU_ITEMS.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  role="menuitem"
                  type="button"
                  onClick={() => openDialog(id as Dialog)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors group"
                >
                  <Icon size={15} className={`shrink-0 ${color} group-hover:scale-110 transition-transform`} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Backdrops + Dialogs */}
      {dialog !== null && <Backdrop onClick={closeDialog} />}

      {dialog === "kyc" && (
        <KycDialog
          {...sharedProps}
          currentKyc={currentKyc}
        />
      )}
      {dialog === "role" && (
        <RoleDialog
          {...sharedProps}
          currentRole={currentRole}
        />
      )}
      {dialog === "password" && (
        <PasswordDialog {...sharedProps} />
      )}
      {dialog === "wallet" && (
        <WalletDialog
          {...sharedProps}
          walletBalance={walletBalance}
        />
      )}
    </>
  );
}
