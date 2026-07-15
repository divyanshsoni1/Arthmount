"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, Building2, Smartphone, History, XCircle, Loader2 } from "lucide-react";
import {
  useWithdrawalHistory,
  useCancelWithdrawal,
  fmtWithdrawINR,
  fmtWithdrawDateTime,
  WITHDRAWAL_STATUS_CONFIG,
  type WithdrawalRecord,
  type WithdrawalStatus,
} from "@/api-client/withdraw";
import { extractWithdrawError } from "@/api-client/withdraw";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WithdrawalStatus }) {
  const cfg = WITHDRAWAL_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

// ─── Row actions ──────────────────────────────────────────────────────────────

function CancelButton({ id }: { id: string }) {
  const cancel   = useCancelWithdrawal();
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => cancel.mutate(id, { onSettled: () => setConfirm(false) })}
          disabled={cancel.isPending}
          className="flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-600 disabled:opacity-60"
        >
          {cancel.isPending ? <Loader2 size={10} className="animate-spin" /> : null}
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setConfirm(false)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition-colors"
    >
      <XCircle size={11} /> Cancel
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
        <History size={24} className="text-slate-300" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-600">
          {filtered ? "No withdrawals match this filter" : "No withdrawal history yet"}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {filtered ? "Try a different status filter." : "Your withdrawal requests will appear here."}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all",        label: "All"        },
  { value: "PENDING",    label: "Pending"    },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED",  label: "Completed"  },
  { value: "REJECTED",   label: "Rejected"   },
  { value: "CANCELLED",  label: "Cancelled"  },
];

export function WithdrawalHistory() {
  const [page,   setPage]   = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useWithdrawalHistory(page, status === "all" ? undefined : status);

  const records = (data?.records ?? []).filter((r: WithdrawalRecord) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.transactionReference?.toLowerCase().includes(q) ||
      r.upiId?.toLowerCase().includes(q)                ||
      r.bankName?.toLowerCase().includes(q)             ||
      r.accountNumber?.includes(q)
    );
  });

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <History size={15} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900">Withdrawal History</h3>
          {data && <span className="text-xs text-slate-400">({data.total} total)</span>}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-0 max-w-xs">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
            <Search size={12} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search reference, bank…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto px-5 py-3 border-b border-slate-50">
        <SlidersHorizontal size={12} className="text-slate-400 shrink-0" />
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => { setStatus(value); setPage(1); }}
            className={`
              shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition-colors
              ${status === value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/50">
              {["Date", "Amount", "Destination", "Reference", "Status", "Completed", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState filtered={status !== "all" || !!search} />
                </td>
              </tr>
            ) : (
              records.map((r: WithdrawalRecord) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  {/* Date */}
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {fmtWithdrawDateTime(r.requestedAt)}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-bold text-slate-900 tabular-nums">{fmtWithdrawINR(r.amount)}</p>
                    <p className="text-[11px] text-emerald-600 tabular-nums">Net: {fmtWithdrawINR(r.netAmount)}</p>
                  </td>

                  {/* Destination */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {r.method === "BANK"
                        ? <><Building2 size={12} className="text-blue-400 shrink-0" />
                            <span className="text-xs text-slate-700">{r.bankName ?? ""} ••••{(r.accountNumber ?? "").slice(-4)}</span>
                          </>
                        : <><Smartphone size={12} className="text-violet-400 shrink-0" />
                            <span className="text-xs text-slate-700">{r.upiId}</span>
                          </>
                      }
                    </div>
                  </td>

                  {/* Reference */}
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
                      {r.transactionReference ?? "—"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                    {r.rejectionReason && (
                      <p className="mt-0.5 text-[10px] text-red-500 max-w-[160px] truncate" title={r.rejectionReason}>
                        {r.rejectionReason}
                      </p>
                    )}
                  </td>

                  {/* Completed at */}
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {fmtWithdrawDateTime(r.processedAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {r.status === "PENDING" && <CancelButton id={r.id} />}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(data?.pages ?? 0) > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <span className="text-xs text-slate-400">Page {page} of {data?.pages}</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data!.pages, p + 1))}
              disabled={page === data?.pages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
