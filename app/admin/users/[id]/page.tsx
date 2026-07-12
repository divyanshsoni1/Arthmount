"use client";

import { use, useState }                            from "react";
import Link                                          from "next/link";
import { useAdminUserDetail, useFreezeUser, extractError } from "@/api-client/admin";
import { ArrowLeft, BadgeCheck, Loader2, ShieldX } from "lucide-react";

function fmtINR(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const KYC_BADGE: Record<string, string> = {
  PENDING:       "bg-amber-100 text-amber-700",
  IN_REVIEW:     "bg-blue-100 text-blue-700",
  APPROVED:      "bg-emerald-100 text-emerald-700",
  AUTO_APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED:      "bg-red-100 text-red-700",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
      <p className="text-xs text-slate-500 shrink-0 w-36">{label}</p>
      <p className="text-sm font-medium text-slate-800 text-right">{value}</p>
    </div>
  );
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }      = use(params);
  const { data: user, isLoading } = useAdminUserDetail(id);
  const freeze      = useFreezeUser(id);
  const [err,setErr]= useState<string | null>(null);
  const [confirm, setConfirm] = useState<boolean | null>(null); // null=hidden, true=freeze, false=unfreeze

  const handleFreeze = async (val: boolean) => {
    setErr(null);
    try {
      await freeze.mutateAsync(val);
      setConfirm(null);
    } catch (e) { setErr(extractError(e)); }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!user) return <p className="p-6 text-slate-500">User not found.</p>;

  const kyc = (user as any).kycDocument;
  const deposits    = (user as any).depositRequests ?? [];
  const investments = (user as any).investments    ?? [];

  return (
    <>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        <Link href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={15} /> Back to Users
        </Link>

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-emerald-700 p-6 text-white flex items-center gap-5 shadow-lg shadow-primary/20">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-extrabold">
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold truncate">{user.name}</h1>
            <p className="text-sm text-emerald-200">{user.email ?? "—"} · {(user as any).phone ?? "—"}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{user.role}</span>
              {user.isFrozen && (
                <span className="rounded-full bg-red-400/80 px-2.5 py-0.5 text-xs font-semibold">Frozen</span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold bg-white/20 ${KYC_BADGE[(user as any).kycStatus]}`}>
                KYC: {(user as any).kycStatus?.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Account info */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Account</p>
            <InfoRow label="User ID"       value={<span className="font-mono text-xs">{user.id.slice(0, 16)}...</span>} />
            <InfoRow label="Registered"    value={fmtDate(user.createdAt)} />
            <InfoRow label="Last Login"    value={fmtDate((user as any).lastLoginAt)} />
            <InfoRow label="Role"          value={user.role} />
            <InfoRow label="Status"        value={user.isFrozen ? "Frozen" : "Active"} />
          </div>

          {/* Wallet */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Wallet</p>
            <InfoRow label="Main Balance"      value={fmtINR(user.mainBalance)}       />
            <InfoRow label="Invested Balance"  value={fmtINR(user.investedBalance)}   />
            <InfoRow label="Commission"        value={fmtINR((user as any).commissionBalance ?? 0)} />
            <InfoRow label="Recent Deposits"   value={`${deposits.length} records`}   />
            <InfoRow label="Active Investments" value={`${investments.length} records`} />
          </div>
        </div>

        {/* KYC summary */}
        {kyc && (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">KYC Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${KYC_BADGE[kyc.status] ?? "bg-slate-100 text-slate-500"}`}>
                  {kyc.status.replace("_", " ")}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500">Aadhaar</p>
                <p className="text-xs font-mono text-slate-800">{kyc.aadhaarNumber ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">PAN</p>
                <p className="text-xs font-mono text-slate-800 tracking-widest">{kyc.panNumber ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Submitted</p>
                <p className="text-xs text-slate-800">{fmtDate(kyc.createdAt)}</p>
              </div>
            </div>
            {kyc.rejectionReason && (
              <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
                Rejection: {kyc.rejectionReason}
              </div>
            )}
            <div className="mt-3">
              <Link href={`/admin/kyc/${kyc.id}`}
                className="text-xs font-semibold text-primary hover:underline">
                Open full KYC review →
              </Link>
            </div>
          </div>
        )}

        {/* Account actions */}
        {err && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">{err}</div>
        )}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Account Actions</p>
          <div className="flex flex-wrap gap-3">
            {user.isFrozen ? (
              <button type="button" onClick={() => setConfirm(false)}
                disabled={freeze.isPending}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
                <BadgeCheck size={14} /> Unfreeze Account
              </button>
            ) : (
              <button type="button" onClick={() => setConfirm(true)}
                disabled={freeze.isPending}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50">
                <ShieldX size={14} /> Freeze Account
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {confirm ? "Freeze Account?" : "Unfreeze Account?"}
            </h3>
            <p className="text-sm text-slate-500">
              {confirm
                ? "The user will not be able to log in or perform any transactions."
                : "The user will regain full access to their account."}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirm(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button"
                disabled={freeze.isPending}
                onClick={() => handleFreeze(confirm)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${confirm ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                {freeze.isPending
                  ? <><Loader2 size={14} className="animate-spin" /> Processing...</>
                  : "Confirm"
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
