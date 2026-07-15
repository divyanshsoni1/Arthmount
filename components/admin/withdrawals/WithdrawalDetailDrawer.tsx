"use client";

import { useState } from "react";
import {
  X, Building2, Smartphone, User, Calendar, BadgeCheck,
  ShieldAlert, CheckCircle2, Loader2, XCircle, AlertTriangle,
  Copy, ExternalLink, Clock, ArrowRight,
} from "lucide-react";
import {
  useAdminWithdrawalDetail,
  useAdminWithdrawalAction,
  extractError,
  type AdminWithdrawalRow,
  type WithdrawalAction,
} from "@/api-client/admin";
import { WITHDRAWAL_STATUS_CONFIG } from "@/api-client/withdraw";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(v: string | number): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ─── Row helpers ──────────────────────────────────────────────────────────────

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-xs text-slate-400 w-36">{label}</span>
      <span className={`text-right text-xs font-semibold text-slate-800 break-all ${mono ? "font-mono" : ""}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
      <span className="h-px flex-1 bg-slate-100" />
      {children}
      <span className="h-px flex-1 bg-slate-100" />
    </p>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = WITHDRAWAL_STATUS_CONFIG[status as keyof typeof WITHDRAWAL_STATUS_CONFIG]
    ?? { cls: "bg-slate-100 text-slate-500", dotColor: "bg-slate-400", label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${cfg.cls}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

// ─── Confirmation dialog ──────────────────────────────────────────────────────

interface ConfirmDialogProps {
  action:           WithdrawalAction;
  withdrawalRef:    string;
  amount:           string;
  userName:         string;
  rejectionReason:  string;
  onChangeReason:   (v: string) => void;
  onConfirm:        () => void;
  onCancel:         () => void;
  isSubmitting:     boolean;
  error:            string | null;
}

const ACTION_CONFIG: Record<WithdrawalAction, {
  title: string; desc: string; btnLabel: string;
  btnClass: string; icon: React.ElementType; warning?: string;
}> = {
  APPROVED:   { title: "Approve Withdrawal", desc: "Approve and move to Processing queue.", btnLabel: "Approve", btnClass: "bg-emerald-600 hover:bg-emerald-700", icon: CheckCircle2 },
  PROCESSING: { title: "Begin Processing",   desc: "Mark as actively being processed.",    btnLabel: "Start Processing", btnClass: "bg-violet-600 hover:bg-violet-700", icon: Loader2 },
  COMPLETED:  { title: "Mark as Completed",  desc: "Confirm funds have been transferred.", btnLabel: "Mark Paid", btnClass: "bg-blue-600 hover:bg-blue-700", icon: CheckCircle2, warning: "This action is irreversible. Confirm the funds have been sent." },
  REJECTED:   { title: "Reject Withdrawal",  desc: "Reject and automatically refund the user's wallet.", btnLabel: "Reject & Refund", btnClass: "bg-red-600 hover:bg-red-700", icon: XCircle, warning: "The withdrawal amount will be automatically refunded to the user's wallet." },
};

function ConfirmDialog({
  action, withdrawalRef, amount, userName,
  rejectionReason, onChangeReason,
  onConfirm, onCancel, isSubmitting, error,
}: ConfirmDialogProps) {
  const cfg = ACTION_CONFIG[action];
  const Icon = cfg.icon;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isSubmitting && onCancel()} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 pt-6 pb-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${action === "REJECTED" ? "bg-red-100" : "bg-emerald-100"}`}>
            <Icon size={18} className={action === "REJECTED" ? "text-red-600" : "text-emerald-600"} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{cfg.title}</h3>
            <p className="text-xs text-slate-500">{cfg.desc}</p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 divide-y divide-slate-100 text-xs">
            <div className="flex justify-between px-3 py-2"><span className="text-slate-500">User</span><span className="font-semibold">{userName}</span></div>
            <div className="flex justify-between px-3 py-2"><span className="text-slate-500">Amount</span><span className="font-bold text-slate-900">{fmtINR(amount)}</span></div>
            <div className="flex justify-between px-3 py-2"><span className="text-slate-500">Reference</span><span className="font-mono text-slate-600">{withdrawalRef?.slice(0, 20) ?? "—"}</span></div>
          </div>

          {action === "REJECTED" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => onChangeReason(e.target.value)}
                placeholder="e.g. Invalid bank details, Fraud detected, Insufficient verification…"
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 placeholder:text-slate-300"
              />
            </div>
          )}

          {cfg.warning && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-600" />
              <p className="text-xs text-amber-700">{cfg.warning}</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
              <XCircle size={13} className="shrink-0 mt-0.5 text-red-500" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onCancel} disabled={isSubmitting}
            className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || (action === "REJECTED" && !rejectionReason.trim())}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${cfg.btnClass}`}
          >
            {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Next action buttons ──────────────────────────────────────────────────────

function NextActions({
  status, onAction,
}: {
  status: string;
  onAction: (a: WithdrawalAction) => void;
}) {
  if (status === "PENDING") return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onAction("APPROVED")}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm">
        <CheckCircle2 size={13} /> Approve
      </button>
      <button type="button" onClick={() => onAction("REJECTED")}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-600 transition-colors shadow-sm">
        <XCircle size={13} /> Reject
      </button>
    </div>
  );

  if (status === "APPROVED") return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onAction("PROCESSING")}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 transition-colors shadow-sm">
        <Loader2 size={13} /> Begin Processing
      </button>
      <button type="button" onClick={() => onAction("REJECTED")}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors">
        <XCircle size={13} /> Reject
      </button>
    </div>
  );

  if (status === "PROCESSING") return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onAction("COMPLETED")}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm">
        <CheckCircle2 size={13} /> Mark as Paid
      </button>
      <button type="button" onClick={() => onAction("REJECTED")}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors">
        <XCircle size={13} /> Reject
      </button>
    </div>
  );

  return null;
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface DrawerProps {
  id:      string;
  onClose: () => void;
}

export function WithdrawalDetailDrawer({ id, onClose }: DrawerProps) {
  const { data: withdrawal, isLoading } = useAdminWithdrawalDetail(id);
  const action  = useAdminWithdrawalAction();

  const [pendingAction, setPendingAction] = useState<WithdrawalAction | null>(null);
  const [rejectReason,  setRejectReason]  = useState("");
  const [actionError,   setActionError]   = useState<string | null>(null);

  function handleAction(a: WithdrawalAction) {
    setRejectReason("");
    setActionError(null);
    setPendingAction(a);
  }

  function handleConfirm() {
    if (!pendingAction || !withdrawal) return;
    setActionError(null);
    action.mutate(
      { id, action: pendingAction, rejectionReason: pendingAction === "REJECTED" ? rejectReason : undefined },
      {
        onSuccess: () => setPendingAction(null),
        onError:   (err) => setActionError(extractError(err)),
      }
    );
  }

  const w = withdrawal;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Withdrawal Detail</h2>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              {w?.transactionReference ?? id.slice(0, 16) + "…"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded-lg bg-slate-100" style={{ width: `${60 + (i % 4) * 10}%` }} />
              ))}
            </div>
          ) : !w ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <ShieldAlert size={28} className="text-slate-300" />
              <p className="text-sm text-slate-500">Withdrawal not found.</p>
            </div>
          ) : (
            <>
              {/* Status + amount hero */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <StatusBadge status={w.status} />
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-slate-900 tabular-nums">{fmtINR(w.amount)}</p>
                    <p className="text-xs text-emerald-600 font-semibold">Net: {fmtINR(w.netAmount)}</p>
                  </div>
                </div>
                {/* Status flow */}
                <div className="flex items-center gap-1 text-[10px] text-slate-400 flex-wrap">
                  {["PENDING","APPROVED","PROCESSING","COMPLETED"].map((s, i, arr) => (
                    <span key={s} className="flex items-center gap-1">
                      <span className={`font-bold ${w.status === s ? "text-slate-800" : w.status === "REJECTED" && s !== "COMPLETED" ? "text-slate-300" : "text-slate-400"}`}>{s}</span>
                      {i < arr.length - 1 && <ArrowRight size={9} />}
                    </span>
                  ))}
                </div>
                {w.rejectionReason && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                    <XCircle size={12} className="shrink-0 mt-0.5 text-red-500" />
                    <p className="text-xs text-red-700">{w.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* User details */}
              <SectionTitle>User</SectionTitle>
              <div className="rounded-xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
                <DetailRow label="Name"       value={w.user.name} />
                <DetailRow label="Email"      value={w.user.email ?? "—"} />
                <DetailRow label="Phone"      value={w.user.phone ?? "—"} />
                <DetailRow label="KYC Status" value={
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    w.user.kycStatus === "APPROVED" ? "bg-emerald-100 text-emerald-700"
                    : w.user.kycStatus === "REJECTED" ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                  }`}>{w.user.kycStatus}</span>
                } />
                <DetailRow label="Wallet Balance" value={fmtINR(w.user.mainBalance)} />
                <DetailRow label="Joined"      value={fmtDateShort(w.user.createdAt)} />
              </div>

              {/* Withdrawal details */}
              <SectionTitle>Withdrawal</SectionTitle>
              <div className="rounded-xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
                <DetailRow label="Withdrawal ID"  value={
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-slate-600">{w.id.slice(0, 12)}…</span>
                    <button type="button" onClick={() => copyToClipboard(w.id)} className="text-slate-300 hover:text-slate-500">
                      <Copy size={10} />
                    </button>
                  </span>
                } />
                <DetailRow label="Reference" value={
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-slate-600">{w.transactionReference ?? "—"}</span>
                    {w.transactionReference && (
                      <button type="button" onClick={() => copyToClipboard(w.transactionReference!)} className="text-slate-300 hover:text-slate-500">
                        <Copy size={10} />
                      </button>
                    )}
                  </span>
                } />
                <DetailRow label="Amount"    value={fmtINR(w.amount)} />
                <DetailRow label="Fee"       value={parseFloat(w.fee) === 0 ? "FREE" : fmtINR(w.fee)} />
                <DetailRow label="Tax"       value={parseFloat(w.tax) === 0 ? "₹0.00" : fmtINR(w.tax)} />
                <DetailRow label="Net Amount" value={<span className="text-emerald-600 font-bold">{fmtINR(w.netAmount)}</span>} />
                <DetailRow label="Requested" value={fmtDate(w.requestedAt)} />
                {w.approvedAt  && <DetailRow label="Approved"   value={fmtDate(w.approvedAt)} />}
                {w.processedAt && <DetailRow label="Processed"  value={fmtDate(w.processedAt)} />}
                {w.approvedBy  && <DetailRow label="Processed By" value={w.approvedBy.name} />}
              </div>

              {/* Payout details */}
              <SectionTitle>{w.method === "BANK" ? "Bank Account" : "UPI"}</SectionTitle>
              <div className="rounded-xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
                {w.method === "BANK" ? (
                  <>
                    <DetailRow label="Holder"  value={w.accountHolderName ?? "—"} />
                    <DetailRow label="Bank"    value={w.bankName ?? "—"} />
                    <DetailRow label="Account" value={
                      <span className="flex items-center gap-1">
                        <Building2 size={11} className="text-blue-400" />
                        ••••{(w.accountNumber ?? "").slice(-4)}
                      </span>
                    } />
                    <DetailRow label="IFSC"    value={w.ifscCode ?? "—"} mono />
                  </>
                ) : (
                  <DetailRow label="UPI ID" value={
                    <span className="flex items-center gap-1">
                      <Smartphone size={11} className="text-violet-400" />
                      {w.upiId}
                    </span>
                  } />
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {w && !isLoading && (
          <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4">
            <NextActions status={w.status} onAction={handleAction} />
            {(w.status === "COMPLETED" || w.status === "CANCELLED") && (
              <p className="text-center text-xs text-slate-400 mt-2">This request is read-only.</p>
            )}
          </div>
        )}
      </aside>

      {/* Confirmation overlay */}
      {pendingAction && w && (
        <ConfirmDialog
          action={pendingAction}
          withdrawalRef={w.transactionReference ?? w.id}
          amount={w.amount}
          userName={w.user.name}
          rejectionReason={rejectReason}
          onChangeReason={setRejectReason}
          onConfirm={handleConfirm}
          onCancel={() => !action.isPending && setPendingAction(null)}
          isSubmitting={action.isPending}
          error={actionError}
        />
      )}
    </>
  );
}
