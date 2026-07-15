"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, TrendingUp, Lock, CheckCircle,
  XCircle, ArrowUpCircle, Clock, ExternalLink, BarChart3,
} from "lucide-react";
import {
  useInvestmentHistory,
  formatINR, formatDate, daysRemaining, lockInProgress,
  type InvestmentRecord,
} from "@/api-client/invest";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; cls: string; dot: string }> = {
  ACTIVE:    { label: "Active",    icon: TrendingUp,    cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  MATURED:   { label: "Matured",   icon: CheckCircle,   cls: "bg-blue-50 text-blue-700 border-blue-200",         dot: "bg-blue-500"    },
  CANCELLED: { label: "Cancelled", icon: XCircle,       cls: "bg-slate-50 text-slate-500 border-slate-200",      dot: "bg-slate-400"   },
  WITHDRAWN: { label: "Withdrawn", icon: ArrowUpCircle, cls: "bg-amber-50 text-amber-700 border-amber-200",      dot: "bg-amber-500"   },
};

function StatusChip({ status }: { status: string }) {
  const cfg  = STATUS_CFG[status] ?? STATUS_CFG.CANCELLED;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Lock-in progress bar ─────────────────────────────────────────────────────

function LockInProgress({ investment }: { investment: InvestmentRecord }) {
  const progress = lockInProgress(investment.completedDays, investment.tenureDays);
  const remaining = daysRemaining(investment.maturityDate);
  const isLocked  = investment.status === "ACTIVE";
  const isMatured = investment.status === "MATURED";

  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          {isLocked ? <Lock size={9} className="text-amber-500" /> : <CheckCircle size={9} className="text-emerald-500" />}
          {isMatured ? "Matured" : isLocked ? `${Math.max(0, remaining)}d left` : "—"}
        </span>
        <span className="text-[10px] font-bold text-slate-600 tabular-nums">{progress}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isMatured ? "bg-blue-500" : "bg-emerald-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
        {investment.completedDays}/{investment.tenureDays} days
      </p>
    </div>
  );
}

// ─── Mobile investment card ────────────────────────────────────────────────────

function MobileInvestmentCard({ investment }: { investment: InvestmentRecord }) {
  const profit     = investment.totalProfitEarned;
  const isPositive = profit > 0;

  return (
    <div className="border border-slate-100 rounded-xl p-4 space-y-3 bg-white">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{investment.packageName}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {investment.dailyReturnRate}%/day · {formatDate(investment.investedAt)}
          </p>
        </div>
        <StatusChip status={investment.status} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <p className="text-[10px] text-slate-400">Invested</p>
          <p className="text-xs font-bold text-slate-800 tabular-nums">{formatINR(investment.principalAmount)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-2 py-2">
          <p className="text-[10px] text-emerald-600">Profit</p>
          <p className={`text-xs font-bold tabular-nums ${isPositive ? "text-emerald-700" : "text-slate-500"}`}>
            {isPositive ? "+" : ""}{formatINR(profit)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <p className="text-[10px] text-slate-400">Matures</p>
          <p className="text-xs font-bold text-slate-700">{formatDate(investment.maturityDate)}</p>
        </div>
      </div>

      <LockInProgress investment={investment} />
    </div>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: i === 0 ? "8rem" : i === 6 ? "5rem" : "4rem" }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

interface InvestmentHistoryTableProps {
  /** If provided, only this status is shown (for filtered views) */
  filterStatus?: string;
}

export function InvestmentHistoryTable({ filterStatus }: InvestmentHistoryTableProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInvestmentHistory(page);

  const rows = (data?.investments ?? []).filter(
    (inv) => !filterStatus || inv.status === filterStatus
  );

  const isEmpty = !isLoading && rows.length === 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BarChart3 size={15} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900">Investment History</h3>
        </div>
        {data && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
            {data.total} total
          </span>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/60">
              {["Plan", "Invested", "Profit", "Progress", "Maturity", "Method", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              : isEmpty
              ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                        <TrendingUp size={22} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">No investments yet</p>
                      <p className="text-xs text-slate-400">Start investing in a plan to see your history here.</p>
                    </div>
                  </td>
                </tr>
              )
              : rows.map((inv: InvestmentRecord) => {
                const isPositive = inv.totalProfitEarned > 0;
                const method = inv.paymentMethod === "RAZORPAY" ? "Online" : "Wallet";
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Plan */}
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900 truncate max-w-[10rem]">{inv.packageName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{inv.dailyReturnRate}%/day</p>
                    </td>

                    {/* Invested */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-800 tabular-nums">{formatINR(inv.principalAmount)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(inv.investedAt)}</p>
                    </td>

                    {/* Profit */}
                    <td className="px-4 py-3.5">
                      <p className={`font-bold tabular-nums ${isPositive ? "text-emerald-600" : "text-slate-400"}`}>
                        {isPositive ? "+" : ""}{formatINR(inv.totalProfitEarned)}
                      </p>
                      {inv.pendingProfit > 0 && (
                        <p className="text-[11px] text-amber-500 mt-0.5">{formatINR(inv.pendingProfit)} pending</p>
                      )}
                    </td>

                    {/* Progress */}
                    <td className="px-4 py-3.5">
                      <LockInProgress investment={inv} />
                    </td>

                    {/* Maturity */}
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(inv.maturityDate)}
                    </td>

                    {/* Method */}
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-semibold ${method === "Online" ? "text-blue-600" : "text-emerald-600"}`}>
                        {method}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusChip status={inv.status} />
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden divide-y divide-slate-50">
        {isLoading
          ? [...Array(3)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ))
          : isEmpty
          ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2">
              <TrendingUp size={28} className="text-slate-300" />
              <p className="text-sm text-slate-400">No investments yet.</p>
            </div>
          )
          : rows.map((inv) => (
            <div key={inv.id} className="p-4">
              <MobileInvestmentCard investment={inv} />
            </div>
          ))
        }
      </div>

      {/* Pagination */}
      {(data?.pages ?? 0) > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Page {page} of {data?.pages}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data!.pages, p + 1))}
              disabled={page === data?.pages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
