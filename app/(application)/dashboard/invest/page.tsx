"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw, History, Search, SlidersHorizontal,
  TrendingUp, Sparkles, X, ChevronDown,
  LayoutGrid, List, ArrowLeft, CheckCircle2,
} from "lucide-react";

import { useUser }             from "@/api-client/user";
import {
  useActivePackages,
  type ActivePackage,
  type InvestmentRecord,
} from "@/api-client/invest";
import { useQueryClient }      from "@tanstack/react-query";
import { ACTIVE_PACKAGES_KEY } from "@/api-client/invest";

import { PackageCard, PackageCardSkeleton } from "@/components/invest/PackageCard";
import { PackageDetailModal }      from "@/components/invest/PackageDetailModal";
import { InvestmentFlowModal }     from "@/components/invest/InvestmentFlowModal";
import { InvestmentHistoryTable }  from "@/components/invest/InvestmentHistoryTable";

// ─── Filter / sort types ──────────────────────────────────────────────────────

type SortKey  = "popular" | "roi_high" | "roi_low" | "tenure_short" | "tenure_long";
type ViewMode = "grid" | "list";

interface FilterState {
  search:    string;
  sort:      SortKey;
  minROI:    number | null;
  maxTenure: number | null;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular",      label: "Most Popular"    },
  { key: "roi_high",     label: "Highest ROI"     },
  { key: "roi_low",      label: "Lowest ROI"      },
  { key: "tenure_short", label: "Shortest Tenure" },
  { key: "tenure_long",  label: "Longest Tenure"  },
];

// ─── Pure business logic helpers (unchanged) ──────────────────────────────────

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
        (p.description ?? "").toLowerCase().includes(q),
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
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <TrendingUp size={22} className="text-muted-foreground" aria-hidden="true" />
      </div>
      {hasFilters ? (
        <>
          <div>
            <p className="text-sm font-bold text-foreground">No plans match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filter criteria.</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Clear Filters
          </button>
        </>
      ) : (
        <div>
          <p className="text-sm font-bold text-foreground">No investment plans available</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon — new plans are added regularly.</p>
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-foreground px-5 py-3.5 shadow-2xl text-background min-w-0 max-w-sm w-full sm:w-auto mx-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
        <Sparkles size={13} className="text-primary-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold flex-1 min-w-0 truncate">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvestPage() {
  const router = useRouter();
  const { user, isLoading: userLoading }                                     = useUser();
  const { data: packages, isLoading: packagesLoading, refetch, isRefetching } = useActivePackages();
  const qc = useQueryClient();

  type ModalState =
    | { kind: "none" }
    | { kind: "detail"; pkg: ActivePackage }
    | { kind: "invest"; pkg: ActivePackage };

  const [modal,       setModal]       = useState<ModalState>({ kind: "none" });
  const [toast,       setToast]       = useState<string>("");
  const [view,        setView]        = useState<ViewMode>("grid");
  const [showHistory, setShowHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login?next=/dashboard/invest");
    }
  }, [user, userLoading, router]);

  const filteredPackages = filterPackages(packages ?? [], filters);

  const openDetail = useCallback((pkg: ActivePackage) => setModal({ kind: "detail", pkg }), []);
  const openInvest = useCallback((pkg: ActivePackage) => setModal({ kind: "invest", pkg }), []);
  const closeModal = useCallback(() => setModal({ kind: "none" }), []);

  const handleInvestSuccess = useCallback((investment: InvestmentRecord) => {
    setModal({ kind: "none" });
    setToast(`Investment in ${investment.packageName} confirmed! 🎉`);
    qc.invalidateQueries({ queryKey: ACTIVE_PACKAGES_KEY });
  }, [qc]);

  const handleDetailToInvest = useCallback((pkg: ActivePackage) => {
    setModal({ kind: "invest", pkg });
  }, []);

  // ── Loading / auth guard ─────────────────────────────────────────────────

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const totalPackages = filteredPackages.length;

  return (
    <>
      <div className="min-h-screen bg-background">

        {/* ── Sticky top bar ───────────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">

            {/* Left — back + title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/dashboard"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft size={15} aria-hidden="true" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-foreground leading-none">Invest Now</h1>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                  Professionally managed investment plans
                </p>
              </div>
            </div>

            {/* Right — actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  showHistory
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-pressed={showHistory}
              >
                <History size={13} aria-hidden="true" />
                <span className="hidden sm:inline">History</span>
              </button>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                aria-label="Refresh packages"
              >
                <RefreshCw size={13} className={isRefetching ? "animate-spin" : ""} aria-hidden="true" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Page content ─────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">

          {/* ── Page header — slim, no decorative hero ──────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
            <div>
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                Investment Plans
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Choose a plan that fits your goals and start earning daily returns.
              </p>
            </div>
            {/* Trust signals — horizontal, minimal */}
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              {[
                "Daily returns",
                "100% capital backed",
                "No hidden fees",
              ].map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  <CheckCircle2 size={10} className="text-primary shrink-0" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Investment history (collapsible) ──────────────────────── */}
          {showHistory && (
            <section aria-label="My investment history">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground">My Investments</h2>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <X size={12} aria-hidden="true" /> Hide
                </button>
              </div>
              <InvestmentHistoryTable />
            </section>
          )}

          {/* ── Available packages section ──────────────────────────────── */}
          <section aria-label="Available investment plans">

            {/* Section toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  {packagesLoading
                    ? "Loading plans…"
                    : `${totalPackages} plan${totalPackages !== 1 ? "s" : ""} available`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div
                  className="flex rounded-xl border border-border bg-card overflow-hidden"
                  role="group"
                  aria-label="View mode"
                >
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className={`flex h-8 w-8 items-center justify-center transition-colors ${
                      view === "grid"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-label="Grid view"
                    aria-pressed={view === "grid"}
                  >
                    <LayoutGrid size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={`flex h-8 w-8 items-center justify-center transition-colors ${
                      view === "list"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-label="List view"
                    aria-pressed={view === "list"}
                  >
                    <List size={13} aria-hidden="true" />
                  </button>
                </div>

                {/* Filter toggle */}
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    showFilters || hasFilters
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  aria-pressed={showFilters}
                  aria-expanded={showFilters}
                >
                  <SlidersHorizontal size={12} aria-hidden="true" />
                  Filter
                  {hasFilters && (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
                      aria-label="Filters active"
                    >
                      ●
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="mb-4 rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
                <div className="grid sm:grid-cols-3 gap-3">
                  {/* Search */}
                  <div className="relative sm:col-span-1">
                    <Search
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={filters.search}
                      onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                      placeholder="Search plans…"
                      className="w-full rounded-xl border border-border bg-muted/50 pl-8 pr-4 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                      aria-label="Search plans"
                    />
                  </div>

                  {/* Sort */}
                  <div className="relative">
                    <select
                      value={filters.sort}
                      onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as SortKey }))}
                      className="w-full appearance-none rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition pr-8"
                      aria-label="Sort plans"
                    >
                      {SORT_OPTIONS.map(({ key, label }) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Max tenure */}
                  <div className="relative">
                    <select
                      value={filters.maxTenure ?? ""}
                      onChange={(e) => setFilters((f) => ({
                        ...f,
                        maxTenure: e.target.value ? Number(e.target.value) : null,
                      }))}
                      className="w-full appearance-none rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition pr-8"
                      aria-label="Filter by tenure"
                    >
                      <option value="">Any Tenure</option>
                      <option value="30">Up to 30 days</option>
                      <option value="90">Up to 90 days</option>
                      <option value="180">Up to 180 days</option>
                      <option value="365">Up to 365 days</option>
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {hasFilters && (
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {totalPackages} result{totalPackages !== 1 ? "s" : ""}
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-xs font-semibold text-destructive hover:opacity-80 transition-opacity"
                    >
                      <X size={11} aria-hidden="true" /> Clear all
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Package grid / list */}
            <div
              className={
                view === "grid"
                  ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  : "flex flex-col gap-3"
              }
            >
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
          </section>

          {/* ── Bottom info strip ────────────────────────────────────────── */}
          <div className="grid sm:grid-cols-3 gap-3 pb-4" aria-label="Important information">
            {[
              {
                icon: "🔒",
                title: "Capital Lock-in",
                desc:  "Your investment is locked for the full tenure. No early withdrawal is permitted.",
              },
              {
                icon: "📈",
                title: "Weekly Profits",
                desc:  "Profits accumulate daily and are credited to your wallet every week.",
              },
              {
                icon: "🛡️",
                title: "Safe & Secure",
                desc:  "All transactions are encrypted and processed via verified payment gateways.",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card px-4 py-4 flex items-start gap-3"
              >
                <span className="text-lg shrink-0 mt-0.5" aria-hidden="true">{icon}</span>
                <div>
                  <p className="text-xs font-bold text-foreground">{title}</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed text-muted-foreground">{desc}</p>
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

      {toast && (
        <SuccessToast message={toast} onClose={() => setToast("")} />
      )}
    </>
  );
}
