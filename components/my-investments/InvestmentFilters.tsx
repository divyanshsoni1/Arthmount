"use client";

import { useCallback } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusFilter  = "ALL" | "ACTIVE" | "MATURED" | "CANCELLED" | "WITHDRAWN";
export type MethodFilter  = "ALL" | "WALLET" | "RAZORPAY";
export type LockFilter    = "ALL" | "LOCKED" | "UNLOCKED";

export interface InvestmentFilterState {
  search:     string;
  status:     StatusFilter;
  method:     MethodFilter;
  lockStatus: LockFilter;
  dateFrom:   string;
  dateTo:     string;
  minAmount:  string;
  maxAmount:  string;
}

export const DEFAULT_FILTERS: InvestmentFilterState = {
  search:     "",
  status:     "ALL",
  method:     "ALL",
  lockStatus: "ALL",
  dateFrom:   "",
  dateTo:     "",
  minAmount:  "",
  maxAmount:  "",
};

// ─── Filter logic (applied to InvestmentRecord[]) ────────────────────────────

export function applyFilters<T extends {
  packageName:   string;
  packageCode:   string;
  transactionRef: string | null;
  status:        string;
  paymentMethod: string | null;
  investedAt:    string;
  principalAmount: number;
  maturityDate:  string;
}>(records: T[], filters: InvestmentFilterState): T[] {
  let result = records;

  // Search
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.packageName.toLowerCase().includes(q) ||
        r.packageCode.toLowerCase().includes(q) ||
        (r.transactionRef ?? "").toLowerCase().includes(q)
    );
  }

  // Status
  if (filters.status !== "ALL") {
    result = result.filter((r) => r.status === filters.status);
  }

  // Payment method
  if (filters.method !== "ALL") {
    result = result.filter((r) => r.paymentMethod === filters.method);
  }

  // Lock status
  if (filters.lockStatus === "LOCKED") {
    result = result.filter((r) => r.status === "ACTIVE");
  } else if (filters.lockStatus === "UNLOCKED") {
    result = result.filter((r) => r.status !== "ACTIVE");
  }

  // Date range
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    result = result.filter((r) => new Date(r.investedAt).getTime() >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo).getTime() + 86_400_000;
    result = result.filter((r) => new Date(r.investedAt).getTime() <= to);
  }

  // Amount range
  if (filters.minAmount) {
    const min = parseFloat(filters.minAmount);
    if (!isNaN(min)) result = result.filter((r) => r.principalAmount >= min);
  }
  if (filters.maxAmount) {
    const max = parseFloat(filters.maxAmount);
    if (!isNaN(max)) result = result.filter((r) => r.principalAmount <= max);
  }

  return result;
}

export function hasActiveFilters(f: InvestmentFilterState): boolean {
  return (
    f.search.trim() !== "" ||
    f.status     !== "ALL" ||
    f.method     !== "ALL" ||
    f.lockStatus !== "ALL" ||
    f.dateFrom   !== ""    ||
    f.dateTo     !== ""    ||
    f.minAmount  !== ""    ||
    f.maxAmount  !== ""
  );
}

// ─── Pill button ──────────────────────────────────────────────────────────────

function Pill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all whitespace-nowrap ${
        active
          ? "bg-emerald-500 text-white shadow-sm"
          : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  filters:       InvestmentFilterState;
  onChange:      (f: InvestmentFilterState) => void;
  onReset:       () => void;
  resultCount:   number;
  totalCount:    number;
  showAdvanced:  boolean;
  onToggleAdv:   () => void;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function InvestmentFilters({
  filters, onChange, onReset, resultCount, totalCount, showAdvanced, onToggleAdv,
}: Props) {
  const set = useCallback(
    (patch: Partial<InvestmentFilterState>) => onChange({ ...filters, ...patch }),
    [filters, onChange]
  );

  const active = hasActiveFilters(filters);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search by package, code or transaction ID…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => set({ search: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={onToggleAdv}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
            showAdvanced
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal size={13} />
          <span className="hidden sm:inline">Filters</span>
          {active && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
              ●
            </span>
          )}
        </button>

        {/* Reset */}
        {active && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Quick status pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["ALL", "ACTIVE", "MATURED", "WITHDRAWN", "CANCELLED"] as StatusFilter[]).map((s) => (
          <Pill
            key={s}
            label={s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            active={filters.status === s}
            onClick={() => set({ status: s })}
          />
        ))}
        <span className="ml-auto text-[11px] text-slate-400 tabular-nums hidden sm:block">
          {resultCount} of {totalCount} shown
        </span>
      </div>

      {/* Advanced panel */}
      {showAdvanced && (
        <div className="pt-1 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Payment method */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Payment Method
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {(["ALL", "WALLET", "RAZORPAY"] as MethodFilter[]).map((m) => (
                <Pill
                  key={m}
                  label={m === "ALL" ? "All" : m === "RAZORPAY" ? "Online" : "Wallet"}
                  active={filters.method === m}
                  onClick={() => set({ method: m })}
                />
              ))}
            </div>
          </div>

          {/* Lock status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Lock Status
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {(["ALL", "LOCKED", "UNLOCKED"] as LockFilter[]).map((l) => (
                <Pill
                  key={l}
                  label={l === "ALL" ? "All" : l.charAt(0) + l.slice(1).toLowerCase()}
                  active={filters.lockStatus === l}
                  onClick={() => set({ lockStatus: l })}
                />
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Investment Date
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => set({ dateFrom: e.target.value })}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <span className="text-slate-400 text-xs">—</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => set({ dateTo: e.target.value })}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Amount range */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Amount Range (₹)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={filters.minAmount}
                onChange={(e) => set({ minAmount: e.target.value })}
                placeholder="Min"
                className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <span className="text-slate-400 text-xs">—</span>
              <input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => set({ maxAmount: e.target.value })}
                placeholder="Max"
                className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
