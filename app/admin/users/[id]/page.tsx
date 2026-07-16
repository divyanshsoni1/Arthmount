"use client";

import { use, useState, useCallback }                    from "react";
import Link                                              from "next/link";
import { useAdminUserDetail, useFreezeUser, extractError } from "@/api-client/admin";
import { UserActionsMenu }                               from "@/components/admin/users/UserActionsMenu";
import {
  ArrowLeft, BadgeCheck, Loader2, ShieldX, User, Wallet,
  FileCheck, Mail, Phone,
  ArrowDownLeft, TrendingUp,
  CheckCircle2, XCircle, Copy, Check,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtShort(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Config ───────────────────────────────────────────────────────────────────

const KYC_BADGE: Record<string, string> = {
  PENDING:       "bg-amber-50 text-amber-700 border-amber-200",
  IN_REVIEW:     "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  AUTO_APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED:      "bg-red-50 text-red-700 border-red-200",
};

const ROLE_STYLE: Record<string, string> = {
  USER:        "bg-slate-100 text-slate-600",
  AGENT:       "bg-violet-100 text-violet-700",
  ADMIN:       "bg-blue-100 text-blue-700",
  SUPER_ADMIN: "bg-rose-100 text-rose-700",
  SUPPORT:     "bg-teal-100 text-teal-700",
};

const DEPOSIT_STATUS: Record<string, string> = {
  SUCCESS:    "bg-emerald-50 text-emerald-700",
  PENDING:    "bg-amber-50 text-amber-700",
  FAILED:     "bg-red-50 text-red-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  REJECTED:   "bg-red-50 text-red-700",
  CANCELLED:  "bg-slate-100 text-slate-500",
};

const INV_STATUS: Record<string, string> = {
  ACTIVE:    "bg-emerald-50 text-emerald-700",
  MATURED:   "bg-blue-50 text-blue-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  WITHDRAWN: "bg-amber-50 text-amber-700",
};

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: number; type: "success" | "error"; message: string }

function ToastList({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg text-sm font-semibold pointer-events-auto max-w-sm",
            t.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white",
          ].join(" ")}
        >
          {t.type === "success"
            ? <CheckCircle2 size={15} className="shrink-0" />
            : <XCircle      size={15} className="shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button
            type="button" onClick={() => onRemove(t.id)} aria-label="Dismiss"
            className="ml-1 rounded-full p-0.5 hover:bg-white/20 transition-colors"
          >
            <XCircle size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, onCopied, onFailed }: { text: string; onCopied: () => void; onFailed: () => void }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!navigator?.clipboard) { onFailed(); return; }
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        onCopied();
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => onFailed());
  }

  return (
    <button
      type="button" onClick={handleCopy}
      aria-label="Copy User ID"
      title="Copy User ID"
      className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
    >
      {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
    </button>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
      <p className="text-xs text-slate-400 shrink-0 w-36">{label}</p>
      <div className="text-sm font-medium text-slate-800 text-right">{value}</div>
    </div>
  );
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",     label: "Overview",     icon: User      },
  { id: "wallet",       label: "Wallet",       icon: Wallet    },
  { id: "investments",  label: "Investments",  icon: TrendingUp },
  { id: "kyc",          label: "KYC",          icon: FileCheck },
] as const;

type TabId = typeof TABS[number]["id"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }       = use(params);
  const { data: user, isLoading } = useAdminUserDetail(id);
  const freeze       = useFreezeUser(id);
  const [err, setErr]            = useState<string | null>(null);
  const [confirm, setConfirm]    = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [toasts, setToasts]      = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleFreeze = async (val: boolean) => {
    setErr(null);
    try { await freeze.mutateAsync(val); setConfirm(null); }
    catch (e) { setErr(extractError(e)); }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  if (!user) return (
    <div className="flex flex-col items-center justify-center py-24">
      <User size={32} className="text-slate-300 mb-3" />
      <p className="text-sm font-semibold text-slate-700">User not found</p>
    </div>
  );

  const kyc         = user.kycDocument;
  const deposits    = user.depositRequests ?? [];
  const investments = user.investments    ?? [];

  return (
    <>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

        {/* Back */}
        <div className="flex items-center gap-3">
          <Link href="/admin/users"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">User Profile</h1>
            <p className="text-xs text-slate-400">View and manage this user account</p>
          </div>
        </div>

        {/* Hero card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#141720] to-slate-800 p-6 text-white shadow-lg">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-extrabold ring-2 ring-white/20">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-extrabold truncate">{user.name}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {user.email && <span className="flex items-center gap-1 text-xs text-white/60"><Mail size={11} />{user.email}</span>}
                {(user as any).phone && <span className="flex items-center gap-1 text-xs text-white/60"><Phone size={11} />{(user as any).phone}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ROLE_STYLE[user.role] ?? "bg-white/20 text-white"}`}>
                  {user.role.replace("_", " ")}
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${KYC_BADGE[(user as any).kycStatus] ?? "bg-white/20 text-white"}`}>
                  KYC: {(user as any).kycStatus?.replace("_", " ")}
                </span>
                {user.isFrozen && (
                  <span className="rounded-full bg-red-500/80 px-2.5 py-0.5 text-[11px] font-bold text-white">Frozen</span>
                )}
              </div>
            </div>
            <div className="hidden sm:flex flex-col gap-2 text-right shrink-0">
              <p className="text-2xl font-extrabold tabular-nums">{fmtINR(user.mainBalance)}</p>
              <p className="text-xs text-white/50">Wallet Balance</p>
            </div>
          </div>

          {/* Wallet mini strip */}
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
            <div>
              <p className="text-lg font-extrabold tabular-nums">{fmtINR(user.investedBalance)}</p>
              <p className="text-[11px] text-white/50">Invested Balance</p>
            </div>
            <div>
              <p className="text-lg font-extrabold tabular-nums">{fmtINR((user as any).commissionBalance ?? 0)}</p>
              <p className="text-[11px] text-white/50">Commission</p>
            </div>
            <div>
              <p className="text-lg font-extrabold">{fmtShort(user.createdAt)}</p>
              <p className="text-[11px] text-white/50">Member Since</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        {err && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            <XCircle size={15} className="shrink-0" />
            {err}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {user.isFrozen ? (
            <button type="button" onClick={() => setConfirm(false)} disabled={freeze.isPending}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm">
              <BadgeCheck size={14} /> Unfreeze Account
            </button>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} disabled={freeze.isPending}
              className="flex items-center gap-2 rounded-xl border-2 border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50">
              <ShieldX size={14} /> Freeze Account
            </button>
          )}
          {kyc && (
            <Link href={`/admin/kyc/${kyc.id}`}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              <FileCheck size={14} /> Review KYC
            </Link>
          )}
          <UserActionsMenu
            userId={id}
            currentKyc={(user as any).kycStatus ?? "PENDING"}
            currentRole={user.role}
            walletBalance={parseFloat(user.mainBalance)}
            onSuccess={(msg) => addToast("success", msg)}
            onError={(msg)   => addToast("error",   msg)}
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex gap-0">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button"
                onClick={() => setActiveTab(id)}
                className={[
                  "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all -mb-px",
                  activeTab === id
                    ? "border-emerald-500 text-emerald-700"
                    : "border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200",
                ].join(" ")}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Overview */}
        {activeTab === "overview" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Account Details</p>
              <InfoRow label="User ID" value={
                <span className="flex items-center justify-end gap-1.5">
                  <span className="font-mono text-xs text-slate-600">{user.id.slice(0, 16)}…</span>
                  <CopyButton
                    text={user.id}
                    onCopied={() => addToast("success", "User ID copied")}
                    onFailed={() => addToast("error",   "Could not access clipboard")}
                  />
                </span>
              } />
              <InfoRow label="Name"          value={user.name} />
              <InfoRow label="Email"         value={user.email ?? "—"} />
              <InfoRow label="Phone"         value={(user as any).phone ?? "—"} />
              <InfoRow label="Role"          value={<span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ROLE_STYLE[user.role] ?? "bg-slate-100"}`}>{user.role}</span>} />
              <InfoRow label="Status"        value={user.isFrozen
                ? <span className="rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-[11px] font-semibold">Frozen</span>
                : <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[11px] font-semibold">Active</span>
              } />
              <InfoRow label="Registered"    value={fmtDate(user.createdAt)} />
              <InfoRow label="Last Login"    value={fmtDate(user.lastLoginAt)} />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Financial Summary</p>
              <InfoRow label="Main Wallet"   value={<span className="font-bold text-emerald-700">{fmtINR(user.mainBalance)}</span>} />
              <InfoRow label="Invested"      value={<span className="font-bold text-violet-700">{fmtINR(user.investedBalance)}</span>} />
              <InfoRow label="Commission"    value={<span className="font-bold text-blue-700">{fmtINR((user as any).commissionBalance ?? 0)}</span>} />
              <InfoRow label="Total AUM"     value={<span className="font-extrabold text-slate-900">{fmtINR(parseFloat(user.mainBalance) + parseFloat(user.investedBalance))}</span>} />
              <InfoRow label="Recent Deposits" value={`${deposits.length} records`} />
              <InfoRow label="Recent Investments" value={`${investments.length} records`} />
            </div>
          </div>
        )}

        {/* Tab: Wallet / Deposits */}
        {activeTab === "wallet" && (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Recent Deposits</p>
              <span className="text-xs text-slate-400">{deposits.length} records</span>
            </div>
            {deposits.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Wallet size={28} className="text-slate-300 mb-3" />
                <p className="text-sm text-slate-400">No deposits yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {deposits.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
                        <ArrowDownLeft size={14} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Wallet Recharge</p>
                        <p className="text-[11px] text-slate-400">{fmtShort(d.depositedAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${DEPOSIT_STATUS[d.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {d.status}
                      </span>
                      <p className="text-sm font-bold text-emerald-600 tabular-nums">{fmtINR(d.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Investments */}
        {activeTab === "investments" && (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Recent Investments</p>
              <span className="text-xs text-slate-400">{investments.length} records</span>
            </div>
            {investments.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <TrendingUp size={28} className="text-slate-300 mb-3" />
                <p className="text-sm text-slate-400">No investments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {investments.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
                        <TrendingUp size={14} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Investment Plan</p>
                        <p className="text-[11px] text-slate-400">{fmtShort(inv.investedAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${INV_STATUS[inv.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {inv.status}
                      </span>
                      <p className="text-sm font-bold text-violet-700 tabular-nums">{fmtINR(inv.principalAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: KYC */}
        {activeTab === "kyc" && (
          <div className="space-y-4">
            {!kyc ? (
              <div className="flex flex-col items-center py-16 rounded-2xl border border-slate-100 bg-white text-center">
                <FileCheck size={28} className="text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-700">No KYC submitted</p>
                <p className="text-xs text-slate-400 mt-1.5">User hasn't started the KYC process yet.</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">KYC Summary</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</p>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${KYC_BADGE[kyc.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
                        {kyc.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Aadhaar</p>
                      <p className="text-xs font-mono text-slate-800">{kyc.aadhaarNumber ?? "—"}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">PAN</p>
                      <p className="text-xs font-mono text-slate-800 tracking-widest">{kyc.panNumber ?? "—"}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Submitted</p>
                      <p className="text-xs text-slate-700">{fmtShort(kyc.createdAt)}</p>
                    </div>
                  </div>
                  {kyc.rejectionReason && (
                    <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-xs text-red-700">
                      <span className="font-semibold">Rejection: </span>{kyc.rejectionReason}
                    </div>
                  )}
                </div>
                <Link href={`/admin/kyc/${kyc.id}`}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  <FileCheck size={15} /> Open Full KYC Review →
                </Link>
              </>
            )}
          </div>
        )}

      </div>

      {/* Confirm freeze/unfreeze dialog */}
      {confirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${confirm ? "bg-red-100" : "bg-emerald-100"}`}>
                {confirm ? <ShieldX size={18} className="text-red-600" /> : <BadgeCheck size={18} className="text-emerald-600" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{confirm ? "Freeze Account?" : "Unfreeze Account?"}</h3>
                <p className="text-xs text-slate-500">{confirm ? "User loses all platform access." : "User regains full access."}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirm(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="button" disabled={freeze.isPending} onClick={() => handleFreeze(confirm)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${confirm ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                {freeze.isPending
                  ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                  : "Confirm"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastList toasts={toasts} onRemove={removeToast} />
    </>
  );
}
