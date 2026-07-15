"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  TrendingUp, Lock, CheckCircle, XCircle, ArrowUpCircle,
  ExternalLink, ArrowUpDown, Eye,
} from "lucide-react";
import Link from "next/link";
import type { InvestmentRecord } from "@/api-client/invest";
import {
  formatINR, formatINRCompact, formatDate,
  daysRemaining, lockInProgress,
} from "@/api-client/invest";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "packageName" | "investedAt" | "principalAmount" | "totalProfitEarned" | "roi" | "maturityDate" | "status";
type SortDir = "asc" | "desc";

interface Column {
  key:     SortKey | "progress" | "paymentMethod" | "actions";
  label:   string;
  sortable?: boolean;
  hidden?:  boolean;
}

const COLUMNS: Column[] = [
  { key: "packageName",        label: "Package",        sortable: true  },
  { key: "investedAt",         label: "Date",           sortable: true  },
  { key: "principalAmount",    label: "Invested",       sortable: true  },
  { key: "totalProfitEarned",  label: "Profit",         sortable: true  },
  { key: "roi",                label: "ROI",            sortable: true  },
  { key: "progress",           label: "Progress",       sortable: false },
  { key: "maturityDate",       label: "Matures",        sortable: true  },
  { key: "status",             label: "Status",         sortable: true  },
  { key: "paymentMethod",      label: "Method",         sortable: false },
  { key: "actions",            label: "",               sortable: false },
];

// ─── Status chip ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  ACTIVE:    { label: "Active",    icon: TrendingUp,    cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  MATURED:   { label: "Matured",   icon: CheckCircle,   cls: "bg-blue-50 text-blue-700 border-blue-200",         dot: "bg-blue-500"    },
  CANCELLED: { label: "Cancelled", icon: XCircle,       cls: "bg-slate-50 text-slate-500 border-slate-200",      dot: "bg-slate-400"   },
  WITHDRAWN: { label: "Withdrawn", icon: ArrowUpCircle, cls: "bg-amber-50 text-amber-700 border-amber-200",      dot: "bg-amber-500"   },
} as const;

function StatusChip({ status }: { status: string }) {
  const cfg  = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.CANCELLED;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function sortInvestments(
  rows: InvestmentRecord[],
  key: SortKey,
  dir: SortDir
): InvestmentRecord[] {
  return [...rows].sort((a, b) => {
    let va: string | number;
    let vb: string | number;

    switch (key) {
      case "packageName":
        va = a.packageName.toLowerCase();
        vb = b.packageName.toLowerCase();
        break;
      case "investedAt":
        va = new Date(a.investedAt).getTime();
        vb = new Date(b.investedAt).getTime();
        break;
      case "maturityDate":
        va = new Date(a.maturityDate).getTime();
        vb = new Date(b.maturityDate).getTime();
        break;
      case "roi":
        va = a.principalAmount > 0 ? (a.totalProfitEarned / a.principalAmount) * 100 : 0;
        vb = b.principalAmount > 0 ? (b.totalProfitEarned / b.principalAmount) * 100 : 0;
        break;
      default:
        va = (a as any)[key] ?? 0;
        vb = (b as any)[key] ?? 0;
    }

    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50">
      {COLUMNS.map((c) => (
        <td key={c.key} className="px-3 py-3.5">
          <div
            className="h-4 animate-pulse rounded bg-slate-100"
            style={{ width: c.key === "packageName" ? "8rem" : c.key === "actions" ? "2rem" : "4rem" }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function MobileCard({ inv }: { inv: InvestmentRecord }) {
  const profit     = inv.totalProfitEarned;
  const roi        = inv.principalAmount > 0 ? ((profit / inv.principalAmount) * 100).toFixed(1) : "0.0";
  const progress   = lockInProgress(inv.completedDays, inv.tenureDays);
  const remaining  = daysRemaining(inv.maturityDate);
  const isActive   = inv.status === "ACTIVE";

  return (
    <div className="border-b border-slate-50 p-4 last:border-0">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{inv.packageName}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {inv.dailyReturnRate}%/day · {formatDate(inv.investedAt)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusChip status={inv.status} />
          <Link href={`/dashboard/my-investments/${inv.id}`}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
              <ExternalLink size={12} />
            </span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-slate-50 p-2 text-center">
          <p className="text-[10px] text-slate-400">Invested</p>
          <p className="text-xs font-bold text-slate-800 tabular-nums">{formatINRCompact(inv.principalAmount)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2 text-center">
          <p className="text-[10px] text-emerald-600">Profit</p>
          <p className={`text-xs font-bold tabular-nums ${profit > 0 ? "text-emerald-700" : "text-slate-400"}`}>
            {profit > 0 ? "+" : ""}{formatINRCompact(profit)}
          </p>
        </div>
        <div className="rounded-lg bg-violet-50 p-2 text-center">
          <p className="text-[10px] text-violet-600">ROI</p>
          <p className={`text-xs font-bold tabular-nums ${Number(roi) > 0 ? "text-violet-700" : "text-slate-400"}`}>
            {Number(roi) > 0 ? "+" : ""}{roi}%
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            {isActive ? <Lock size={9} className="text-amber-500" /> : <CheckCircle size={9} className="text-blue-500" />}
            {isActive ? `${Math.max(0, remaining)}d left` : inv.status === "MATURED" ? "Matured" : "—"}
          </span>
          <span className="text-[10px] font-bold text-slate-600 tabular-nums">{progress}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${inv.status === "MATURED" ? "bg-blue-500" : "bg-emerald-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">{inv.completedDays}/{inv.tenureDays} days</p>
      </div>
    </div>
  );
}

// ─── Header cell ─────────────────────────────────────────────────────────────

function Th({
  col, sortKey, sortDir, onSort,
}: {
  col: Column;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === col.key;
  return (
    <th
      className={`px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap select-none ${
        col.sortable ? "cursor-pointer hover:text-slate-600 transition-colors" : ""
      }`}
      onClick={col.sortable ? () => onSort(col.key as SortKey) : undefined}
    >
      <span className="flex items-center gap-1">
        {col.label}
        {col.sortable && (
          active ? (
            sortDir === "asc" ? <ChevronUp size={12} className="text-emerald-500" /> : <ChevronDown size={12} className="text-emerald-500" />
          ) : (
            <ArrowUpDown size={10} className="opacity-30" />
          )
        )}
      </span>
    </th>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  investments: InvestmentRecord[];
  loading?:    boolean;
  totalCount?: number;
  page:        number;
  totalPages:  number;
  onPageChange: (p: number) => void;
}

const PAGE_SIZE = 10;

// ─── Main ─────────────────────────────────────────────────────────────────────

export function InvestmentsTable({
  investments, loading, totalCount, page, totalPages, onPageChange,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("investedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = useCallback((key: SortKey) => {
    setSortDir((prev) => (sortKey === key ? (prev === "asc" ? "desc" : "asc") : "desc"));
    setSortKey(key);
  }, [sortKey]);

  const sorted = useMemo(
    () => sortInvestments(investments, sortKey, sortDir),
    [investments, sortKey, sortDir]
  );

  const isEmpty = !loading && sorted.length === 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Table header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900">All Investments</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
          {loading ? "…" : totalCount ?? sorted.length} total
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/60">
              {COLUMNS.map((col) => (
                <Th key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              : isEmpty
              ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                        <TrendingUp size={20} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">No investments found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters or start a new investment.</p>
                    </div>
                  </td>
                </tr>
              )
              : sorted.map((inv) => {
                const profit    = inv.totalProfitEarned;
                const roi       = inv.principalAmount > 0 ? ((profit / inv.principalAmount) * 100).toFixed(1) : "0.0";
                const progress  = lockInProgress(inv.completedDays, inv.tenureDays);
                const remaining = daysRemaining(inv.maturityDate);
                const isActive  = inv.status === "ACTIVE";
                const method    = inv.paymentMethod === "RAZORPAY" ? "Online" : inv.paymentMethod === "WALLET" ? "Wallet" : inv.paymentMethod ?? "—";

                return (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Package */}
                    <td className="px-3 py-3.5">
                      <p className="font-semibold text-slate-900 max-w-[10rem] truncate">{inv.packageName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{inv.packageCode}</p>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-3.5 whitespace-nowrap text-xs text-slate-600">
                      {formatDate(inv.investedAt)}
                    </td>

                    {/* Invested */}
                    <td className="px-3 py-3.5">
                      <p className="font-bold text-slate-800 tabular-nums whitespace-nowrap">{formatINR(inv.principalAmount)}</p>
                    </td>

                    {/* Profit */}
                    <td className="px-3 py-3.5">
                      <p className={`font-bold tabular-nums whitespace-nowrap ${profit > 0 ? "text-emerald-600" : profit < 0 ? "text-red-500" : "text-slate-400"}`}>
                        {profit > 0 ? "+" : ""}{formatINR(profit)}
                      </p>
                      {inv.pendingProfit > 0 && (
                        <p className="text-[10px] text-amber-500 mt-0.5">{formatINRCompact(inv.pendingProfit)} pending</p>
                      )}
                    </td>

                    {/* ROI */}
                    <td className="px-3 py-3.5">
                      <span className={`text-xs font-bold tabular-nums ${Number(roi) > 0 ? "text-violet-600" : "text-slate-400"}`}>
                        {Number(roi) > 0 ? "+" : ""}{roi}%
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="px-3 py-3.5 min-w-[120px]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400">
                          {isActive ? `${Math.max(0, remaining)}d left` : inv.status === "MATURED" ? "Done" : "—"}
                        </span>
                        <span className="text-[10px] font-bold text-slate-600 tabular-nums">{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${inv.status === "MATURED" ? "bg-blue-500" : "bg-emerald-500"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">{inv.completedDays}/{inv.tenureDays}d</p>
                    </td>

                    {/* Maturity */}
                    <td className="px-3 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(inv.maturityDate)}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5">
                      <StatusChip status={inv.status} />
                    </td>

                    {/* Method */}
                    <td className="px-3 py-3.5">
                      <span className={`text-[11px] font-semibold ${method === "Online" ? "text-blue-600" : method === "Wallet" ? "text-emerald-600" : "text-slate-400"}`}>
                        {method}
                      </span>
                      {inv.transactionRef && (
                        <p className="text-[10px] text-slate-300 font-mono mt-0.5 truncate max-w-[6rem]">{inv.transactionRef}</p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3.5">
                      <Link href={`/dashboard/my-investments/${inv.id}`}>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors">
                          <Eye size={13} />
                        </span>
                      </Link>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="sm:hidden">
        {loading
          ? [...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border-b border-slate-50">
                <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ))
          : isEmpty
          ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2">
              <TrendingUp size={24} className="text-slate-300" />
              <p className="text-sm text-slate-400">No investments found.</p>
            </div>
          )
          : sorted.map((inv) => <MobileCard key={inv.id} inv={inv} />)
        }
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                    p === page
                      ? "bg-emerald-500 text-white"
                      : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
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
