"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw, History, Search, SlidersHorizontal,
  TrendingUp, Sparkles, X, Filter, ChevronDown,
  LayoutGrid, List, ArrowLeft,
} from "lucide-react";

import { useUser }             from "@/api-client/user";
import {
  useActivePackages,
  type ActivePackage,
  type InvestmentRecord,
} from "@/api-client/invest";
import { useQueryClient }      from "@tanstack/react-query";
import { ACTIVE_PACKAGES_KEY } from "@/api-client/invest";

import { InvestSummaryCards }      from "@/components/invest/InvestSummaryCards";
import { PackageCard, PackageCardSkeleton } from "@/components/invest/PackageCard";
import { PackageDetailModal }      from "@/components/invest/PackageDetailModal";
import { InvestmentFlowModal }     from "@/components/invest/InvestmentFlowModal";
import { InvestmentHistoryTable }  from "@/components/invest/InvestmentHistoryTable";

// ─── Filter / sort types ──────────────────────────────────────────────────────

type SortKey = "popular" | "roi_high" | "roi_low" | "tenure_short" | "tenure_long";
type ViewMode = "grid" | "list";

interface FilterState {
  search:   string;
  sort:     SortKey;
  minROI:   number | null;
  maxTenure: number | null;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular",      label: "Most Popular"   },
  { key: "roi_high",     label: "Highest ROI"    },
  { key: "roi_low",      label: "Lowest ROI"     },
  { key: "tenure_short", label: "Shortest Tenure" },
  { key: "tenure_long",  label: "Longest Tenure"  },
];

function sortPackages(packages: ActivePackage[], sort: SortKey): ActivePackage[] {
  const arr = [...packages];
  switch (sort) {
    case "popular":      return arr.sort((a, b) => b.totalInvestors  - a.totalInvestors);
    case "roi_high":     return arr.sort((a, b) => b.dailyReturnRate - a.dailyReturnRate);
    case "roi_low":      return arr.sort((a, b) => a.dailyReturnRate - b.dailyReturnRate);
    case "tenure_short": return arr.sort((a, b) => a.tenureDays      - b.tenureDays);
    case "tenure_long":  return arr.sort((a, b) => b.tenureDays      - a.tenureDays);
    default:             return arr;
  }
}

function filterPackages(packages: ActivePackage[], filters: FilterState): ActivePackage[] {
  let result = packages;

  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    );
  }

  if (filters.minROI !== null) {
    result = result.filter((p) => p.dailyReturnRate >= (filters.minROI ?? 0));
  }

  if (filters.maxTenure !== null) {
    result = result.filter((p) => p.tenureDays <= (filters.maxTenure ?? Infinity));
  }

  return sortPackages(result, filters.sort);
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyPackages({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
        <TrendingUp size={26} className="text-slate-400" />
      </div>
      {hasFilters ? (
        <>
          <div>
            <p className="text-base font-bold text-slate-700">No plans match your filters</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filter criteria.</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Clear Filters
          </button>
        </>
      ) : (
        <div>
          <p className="text-base font-bold text-slate-700">No investment plans available</p>
          <p className="text-sm text-slate-400 mt-1">Check back soon — new plans are added regularly.</p>
        </div>
      )}
    </div>
  );
}

// ─── Toast notification ───────────────────────────────────────────────────────

function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3.5 shadow-2xl text-white animate-in slide-in-from-bottom-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500">
        <Sparkles size={13} />
      </div>
      <p className="text-sm font-semibold">{message}</p>
      <button type="button" onClick={onClose} className="ml-2 text-white/50 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvestPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { data: packages, isLoading: packagesLoading, refetch, isRefetching } = useActivePackages();
  const qc = useQueryClient();

  // ── Modal state ──────────────────────────────────────────────────────────────
  type ModalState =
    | { kind: "none" }
    | { kind: "detail";  pkg: ActivePackage }
    | { kind: "invest";  pkg: ActivePackage };

  const [modal,   setModal]   = useState<ModalState>({ kind: "none" });
  const [toast,   setToast]   = useState<string>("");
  const [view,    setView]    = useState<ViewMode>("grid");
  const [showHistory, setShowHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>({
    search:    "",
    sort:      "popular",
    minROI:    null,
    maxTenure: null,
  });

  const hasFilters =
    filters.search.trim() !== "" ||
    filters.minROI !== null ||
    filters.maxTenure !== null ||
    filters.sort !== "popular";

  const clearFilters = useCallback(() => {
    setFilters({ search: "", sort: "popular", minROI: null, maxTenure: null });
  }, []);

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login?next=/dashboard/invest");
    }
  }, [user, userLoading, router]);

  // ── Filtered packages ────────────────────────────────────────────────────────
  const filteredPackages = filterPackages(packages ?? [], filters);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const openDetail = useCallback((pkg: ActivePackage) => {
    setModal({ kind: "detail", pkg });
  }, []);

  const openInvest = useCallback((pkg: ActivePackage) => {
    setModal({ kind: "invest", pkg });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ kind: "none" });
  }, []);

  const handleInvestSuccess = useCallback((investment: InvestmentRecord) => {
    setModal({ kind: "none" });
    setToast(`Investment in ${investment.packageName} confirmed! 🎉`);
    // Packages might have updated investor counts
    qc.invalidateQueries({ queryKey: ACTIVE_PACKAGES_KEY });
  }, [qc]);

  // Switch from detail modal to invest modal
  const handleDetailToInvest = useCallback((pkg: ActivePackage) => {
    setModal({ kind: "invest", pkg });
  }, []);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const totalPackages = filteredPackages.length;

  return (
    <>
      <div className="min-h-screen bg-slate-50">

        {/* ── Sticky top bar ───────────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            {/* Left: back + title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/dashboard"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft size={16} />
              </Link>
              <div className="min-w-0">
                <h1 className="text-base font-extrabold text-slate-900 leading-none">Invest Now</h1>
                <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                  Grow your wealth with professionally managed plans
                </p>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  showHistory
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <History size={13} />
                <span className="hidden sm:inline">History</span>
              </button>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                aria-label="Refresh packages"
              >
                <RefreshCw size={13} className={isRefetching ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Page content ─────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">

          {/* Hero banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] to-slate-700 p-6 text-white shadow-lg">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/10 pointer-events-none" />
            <div className="absolute -left-6  bottom-0  h-28 w-28 rounded-full bg-white/5   pointer-events-none" />
            <div className="absolute  right-20 bottom-4 h-20 w-20 rounded-full bg-blue-500/10 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20">
                  <TrendingUp size={15} className="text-emerald-400" />
                </div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Investment Plans
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                Grow Your Wealth
              </h2>
              <p className="text-sm text-white/60 mt-1.5 max-w-md">
                Invest in professionally managed plans with guaranteed daily returns.
                Capital locked for plan duration — no early withdrawals.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { label: "Daily Returns",  value: "Credited weekly"  },
                  { label: "Capital Safe",   value: "100% backed"      },
                  { label: "Transparent",    value: "No hidden fees"   },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                    <Sparkles size={10} className="text-emerald-400" />
                    <span className="text-[11px] font-semibold text-white/80">{label}:</span>
                    <span className="text-[11px] text-white/60">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <InvestSummaryCards />

          {/* Investment history (collapsible) */}
          {showHistory && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-800">My Investments</h2>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                >
                  <X size={12} /> Hide
                </button>
              </div>
              <InvestmentHistoryTable />
            </div>
          )}

          {/* ── Available packages section ──────────────────────────────── */}
          <div>
            {/* Section header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Available Plans</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {packagesLoading
                    ? "Loading plans…"
                    : `${totalPackages} plan${totalPackages !== 1 ? "s" : ""} available`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className={`flex h-8 w-8 items-center justify-center transition-colors ${
                      view === "grid" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50"
                    }`}
                    aria-label="Grid view"
                  >
                    <LayoutGrid size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={`flex h-8 w-8 items-center justify-center transition-colors ${
                      view === "list" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50"
                    }`}
                    aria-label="List view"
                  >
                    <List size={13} />
                  </button>
                </div>

                {/* Filter toggle */}
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    showFilters || hasFilters
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <SlidersHorizontal size={12} />
                  Filter
                  {hasFilters && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                      ●
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
                <div className="grid sm:grid-cols-3 gap-3">
                  {/* Search */}
                  <div className="relative sm:col-span-1">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                      placeholder="Search plans…"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                    />
                  </div>

                  {/* Sort */}
                  <div className="relative">
                    <select
                      value={filters.sort}
                      onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as SortKey }))}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition pr-8"
                    >
                      {SORT_OPTIONS.map(({ key, label }) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Max tenure */}
                  <div className="relative">
                    <select
                      value={filters.maxTenure ?? ""}
                      onChange={(e) => setFilters((f) => ({
                        ...f,
                        maxTenure: e.target.value ? Number(e.target.value) : null,
                      }))}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition pr-8"
                    >
                      <option value="">Any Tenure</option>
                      <option value="30">Up to 30 days</option>
                      <option value="90">Up to 90 days</option>
                      <option value="180">Up to 180 days</option>
                      <option value="365">Up to 365 days</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {hasFilters && (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-slate-400">
                      Showing {totalPackages} result{totalPackages !== 1 ? "s" : ""}
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                    >
                      <X size={11} /> Clear all
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Package grid / list */}
            <div className={
              view === "grid"
                ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-3"
            }>
              {packagesLoading
                ? [...Array(6)].map((_, i) => <PackageCardSkeleton key={i} />)
                : filteredPackages.length === 0
                ? <EmptyPackages hasFilters={hasFilters} onClear={clearFilters} />
                : filteredPackages.map((pkg, i) => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      index={i}
                      onInvest={openInvest}
                      onDetail={openDetail}
                    />
                  ))
              }
            </div>
          </div>

          {/* Bottom tips strip */}
          <div className="grid sm:grid-cols-3 gap-3 pb-4">
            {[
              {
                emoji: "🔒",
                title: "Capital Lock-in",
                desc:  "Your investment is locked for the full tenure. No early withdrawal is permitted.",
                cls:   "border-amber-100 bg-amber-50",
                title_cls: "text-amber-800",
                desc_cls:  "text-amber-600",
              },
              {
                emoji: "📈",
                title: "Weekly Profits",
                desc:  "Profits are accumulated daily and credited to your wallet every week.",
                cls:   "border-emerald-100 bg-emerald-50",
                title_cls: "text-emerald-800",
                desc_cls:  "text-emerald-600",
              },
              {
                emoji: "🛡️",
                title: "Safe & Secure",
                desc:  "All transactions are encrypted and processed via verified payment gateways.",
                cls:   "border-blue-100 bg-blue-50",
                title_cls: "text-blue-800",
                desc_cls:  "text-blue-600",
              },
            ].map(({ emoji, title, desc, cls, title_cls, desc_cls }) => (
              <div key={title} className={`rounded-2xl border px-4 py-4 flex items-start gap-3 ${cls}`}>
                <span className="text-xl shrink-0 mt-0.5">{emoji}</span>
                <div>
                  <p className={`text-xs font-bold ${title_cls}`}>{title}</p>
                  <p className={`text-[11px] mt-0.5 leading-relaxed ${desc_cls}`}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {modal.kind === "detail" && (
        <PackageDetailModal
          pkg={modal.pkg}
          onClose={closeModal}
          onInvest={handleDetailToInvest}
        />
      )}

      {modal.kind === "invest" && (
        <InvestmentFlowModal
          pkg={modal.pkg}
          onClose={closeModal}
          onSuccess={handleInvestSuccess}
        />
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <SuccessToast message={toast} onClose={() => setToast("")} />
      )}
    </>
  );
}
