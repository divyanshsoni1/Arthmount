/**
 * TransactionFilters — enterprise-grade search + filter bar.
 * Debounced search, type pills, entry-type toggle, date range, amount range, sort.
 * Fully controlled — parent owns the filter state.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search, X, SlidersHorizontal, ChevronDown, ChevronUp,
  Calendar, DollarSign,
} from "lucide-react";
import type { TxnFilters, TxnType, TxnEntryType } from "@/api-client/transactions";
import { TXN_TYPE_LABELS } from "@/api-client/transactions";

// ─── Filter pill button ───────────────────────────────────────────────────────

function Pill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold
        transition-all duration-150 whitespace-nowrap
        ${active
          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
        }
      `}
    >
      {label}
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: TxnType; label: string }[] = (
  Object.entries(TXN_TYPE_LABELS) as [TxnType, string][]
).map(([value, label]) => ({ value, label }));

const ENTRY_OPTIONS: { value: TxnEntryType | ""; label: string }[] = [
  { value: "",       label: "All"    },
  { value: "CREDIT", label: "Credit" },
  { value: "DEBIT",  label: "Debit"  },
];

const SORT_OPTIONS: { value: "desc" | "asc"; label: string }[] = [
  { value: "desc", label: "Latest first" },
  { value: "asc",  label: "Oldest first" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  filters:   TxnFilters;
  onChange:  (patch: Partial<TxnFilters>) => void;
  onReset:   () => void;
  isLoading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionFilters({ filters, onChange, onReset, isLoading }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localSearch,  setLocalSearch]  = useState(filters.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local search when external filters are reset
  useEffect(() => {
    setLocalSearch(filters.search ?? "");
  }, [filters.search]);

  const handleSearchChange = (v: string) => {
    setLocalSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ search: v || undefined, page: 1 });
    }, 350);
  };

  const toggleType = (type: TxnType) => {
    const current = filters.types ?? [];
    const next    = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onChange({ types: next.length > 0 ? next : undefined, page: 1 });
  };

  const hasActiveFilters =
    !!filters.search ||
    (filters.types?.length ?? 0) > 0 ||
    !!filters.entryType ||
    !!filters.from ||
    !!filters.to ||
    filters.amountMin != null ||
    filters.amountMax != null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* ── Primary row ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search transactions…"
            className="
              w-full rounded-xl border border-slate-200 bg-slate-50
              py-2 pl-9 pr-8 text-sm text-slate-800 placeholder-slate-400
              focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100
              transition-colors
            "
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Entry type toggle */}
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
          {ENTRY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange({ entryType: o.value || undefined, page: 1 })}
              className={`
                rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150
                ${(filters.entryType ?? "") === o.value
                  ? "bg-white shadow-sm text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
                }
              `}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={filters.sort ?? "desc"}
            onChange={(e) => onChange({ sort: e.target.value as "asc" | "desc", page: 1 })}
            className="
              appearance-none rounded-xl border border-slate-200 bg-slate-50
              py-2 pl-3 pr-8 text-xs font-semibold text-slate-700
              focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100
              transition-colors cursor-pointer
            "
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="
            flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50
            px-3 py-2 text-xs font-semibold text-slate-600
            hover:border-emerald-300 hover:text-emerald-700 transition-colors
          "
        >
          <SlidersHorizontal size={13} />
          Filters
          {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {hasActiveFilters && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          )}
        </button>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => { onReset(); setLocalSearch(""); setShowAdvanced(false); }}
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={13} /> Reset
          </button>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        )}
      </div>

      {/* ── Transaction type pills ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-slate-50">
        <Pill
          label="All Types"
          active={!filters.types?.length}
          onClick={() => onChange({ types: undefined, page: 1 })}
        />
        {TYPE_OPTIONS.map((o) => (
          <Pill
            key={o.value}
            label={o.label}
            active={filters.types?.includes(o.value) ?? false}
            onClick={() => toggleType(o.value)}
          />
        ))}
      </div>

      {/* ── Advanced filters (collapsible) ─────────────────────────────── */}
      {showAdvanced && (
        <div className="flex flex-wrap gap-4 px-4 py-3 bg-slate-50/70 border-t border-slate-100">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Date range</span>
            <input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => onChange({ from: e.target.value || undefined, page: 1 })}
              className="
                rounded-lg border border-slate-200 bg-white
                px-2.5 py-1.5 text-xs text-slate-700
                focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100
              "
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={filters.to ?? ""}
              min={filters.from}
              onChange={(e) => onChange({ to: e.target.value || undefined, page: 1 })}
              className="
                rounded-lg border border-slate-200 bg-white
                px-2.5 py-1.5 text-xs text-slate-700
                focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100
              "
            />
          </div>

          {/* Amount range */}
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Amount</span>
            <input
              type="number"
              min={0}
              placeholder="Min ₹"
              value={filters.amountMin ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? undefined : Number(e.target.value);
                onChange({ amountMin: v, page: 1 });
              }}
              className="
                w-24 rounded-lg border border-slate-200 bg-white
                px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400
                focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100
              "
            />
            <span className="text-xs text-slate-400">—</span>
            <input
              type="number"
              min={0}
              placeholder="Max ₹"
              value={filters.amountMax ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? undefined : Number(e.target.value);
                onChange({ amountMax: v, page: 1 });
              }}
              className="
                w-24 rounded-lg border border-slate-200 bg-white
                px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400
                focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100
              "
            />
          </div>
        </div>
      )}
    </div>
  );
}
