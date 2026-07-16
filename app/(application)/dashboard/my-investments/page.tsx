"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Download, LayoutGrid, List,
  TrendingUp, BarChart3, History, ChevronDown, ChevronUp,
  Sparkles,
} from "lucide-react";

import { useUser }            from "@/api-client/user";
import { useQueryClient }     from "@tanstack/react-query";
import {
  useAllInvestments,
  useInvestmentHistory,
  derivePortfolioStats,
  MY_INVESTMENTS_ALL_KEY,
  INVEST_HISTORY_KEY,
} from "@/api-client/invest";
import type { InvestmentRecord } from "@/api-client/invest";
import { formatINRCompact }   from "@/api-client/invest";

import { PortfolioSummaryCards, PortfolioSummaryCardsSkeleton } from "@/components/my-investments/PortfolioSummaryCards";
import { PortfolioGrowthChart }         from "@/components/my-investments/charts/PortfolioGrowthChart";
import { InvestmentDistributionChart }  from "@/components/my-investments/charts/InvestmentDistributionChart";
import { ReturnsComparisonChart }       from "@/components/my-investments/charts/ReturnsComparisonChart";
import { MonthlyTrendChart }            from "@/components/my-investments/charts/MonthlyTrendChart";
import { RoiComparisonChart }           from "@/components/my-investments/charts/RoiComparisonChart";
import { LockInTimelineChart }          from "@/components/my-investments/charts/LockInTimelineChart";
import { InvestmentsTable }             from "@/components/my-investments/InvestmentsTable";
import { MyInvestmentCard, MyInvestmentCardSkeleton } from "@/components/my-investments/MyInvestmentCard";
import {
  InvestmentFilters,
  applyFilters,
  hasActiveFilters,
  DEFAULT_FILTERS,
} from "@/components/my-investments/InvestmentFilters";
import type { InvestmentFilterState }   from "@/components/my-investments/InvestmentFilters";

// ─── View mode ────────────────────────────────────────────────────────────────

type ViewMode = "cards" | "table";

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(investments: InvestmentRecord[]) {
  const headers = [
    "Package","Code","Invested At","Principal (₹)","Profit (₹)",
    "ROI (%)","Daily Rate (%)","Tenure (Days)","Completed Days",
    "Maturity Date","Status","Payment Method","Transaction Ref",
  ];
  const rows = investments.map((inv) => {
    const roi = inv.principalAmount > 0
      ? ((inv.totalProfitEarned / inv.principalAmount) * 100).toFixed(2)
      : "0.00";
    return [
      `"${inv.packageName}"`,
      inv.packageCode,
      new Date(inv.investedAt).toLocaleDateString("en-IN"),
      inv.principalAmount,
      inv.totalProfitEarned.toFixed(2),
      roi,
      inv.dailyReturnRate,
      inv.tenureDays,
      inv.completedDays,
      new Date(inv.maturityDate).toLocaleDateString("en-IN"),
      inv.status,
      inv.paymentMethod ?? "",
      inv.transactionRef ?? "",
    ].join(",");
  });
  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `arthmount-investments-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100">
          <TrendingUp size={32} className="text-emerald-500" />
        </div>
        <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow">
          <Sparkles size={12} className="text-white" />
        </div>
      </div>
      <div className="max-w-sm">
        <h3 className="text-lg font-extrabold text-slate-800">No investments yet</h3>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          You haven't started investing yet. Explore our plans and grow your wealth with daily returns.
        </p>
      </div>
      <Link
        href="/dashboard/invest"
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-95 transition-all"
      >
        <TrendingUp size={15} /> Browse Investment Plans
      </Link>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
        <TrendingUp size={22} className="text-red-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-700">Failed to load your investments</p>
        <p className="text-xs text-slate-400 mt-1">Check your connection and try again.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
      >
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title, subtitle, icon: Icon, color, open, onToggle,
}: {
  title: string; subtitle?: string; icon: React.ElementType;
  color: string; open: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between text-left"
    >
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${color}`}>
          <Icon size={14} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyInvestmentsPage() {
  const router = useRouter();
  const qc     = useQueryClient();
  const { user, isLoading: userLoading } = useUser();

  // Data
  const {
    data:       allData,
    isLoading:  allLoading,
    isRefetching,
    error:      allError,
    refetch:    refetchAll,
  } = useAllInvestments();

  const [tablePage, setTablePage] = useState(1);
  const {
    data:      pageData,
    isLoading: pageLoading,
    refetch:   refetchPage,
  } = useInvestmentHistory(tablePage);

  // UI state
  const [viewMode,      setViewMode]      = useState<ViewMode>("cards");
  const [filters,       setFilters]       = useState<InvestmentFilterState>(DEFAULT_FILTERS);
  const [showAdvFilters,setShowAdvFilters] = useState(false);
  const [showCharts,    setShowCharts]    = useState(true);
  const [showCards,     setShowCards]     = useState(true);

  // Auth guard
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login?next=/dashboard/my-investments");
    }
  }, [user, userLoading, router]);

  // Derived stats
  const allInvestments = useMemo(() => allData?.investments ?? [], [allData]);

  const stats = useMemo(
    () => (allInvestments.length > 0 ? derivePortfolioStats(allInvestments) : null),
    [allInvestments]
  );

  // Filter the full list for cards view
  const filteredAll = useMemo(
    () => applyFilters(allInvestments, filters),
    [allInvestments, filters]
  );

  // For table view we use the paginated API (server-side pagination)
  // and apply client-side filter only to what's on the current page
  const filteredPage = useMemo(
    () => applyFilters(pageData?.investments ?? [], filters),
    [pageData, filters]
  );

  const handleRefresh = useCallback(() => {
    refetchAll();
    refetchPage();
    qc.invalidateQueries({ queryKey: MY_INVESTMENTS_ALL_KEY });
    qc.invalidateQueries({ queryKey: INVEST_HISTORY_KEY(tablePage) });
  }, [refetchAll, refetchPage, qc, tablePage]);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setShowAdvFilters(false);
  }, []);

  // Loading / auth
  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }
  if (!user) return null;

  const isEmpty      = !allLoading && !allError && allInvestments.length === 0;
  const hasError     = !!allError;
  const isFiltered   = hasActiveFilters(filters);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky top bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-slate-900 leading-none">My Investments</h1>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                Track, analyze and manage your portfolio
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View toggle */}
            <div className="hidden sm:flex rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex h-8 w-8 items-center justify-center transition-colors ${
                  viewMode === "cards" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50"
                }`}
                aria-label="Card view"
              >
                <LayoutGrid size={13} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex h-8 w-8 items-center justify-center transition-colors ${
                  viewMode === "table" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50"
                }`}
                aria-label="Table view"
              >
                <List size={13} />
              </button>
            </div>

            {/* Export */}
            {allInvestments.length > 0 && (
              <button
                type="button"
                onClick={() => exportCSV(filteredAll)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                title="Export CSV"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            {/* Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefetching || allLoading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              aria-label="Refresh portfolio"
            >
              <RefreshCw size={13} className={(isRefetching || allLoading) ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">

        {/* ── Summary KPI cards ─────────────────────────────────────────────── */}
        {allLoading
          ? <PortfolioSummaryCardsSkeleton />
          : <PortfolioSummaryCards stats={stats ?? undefined} loading={allLoading} />
        }

        {/* ── Error state ───────────────────────────────────────────────────── */}
        {hasError && <ErrorState onRetry={handleRefresh} />}

        {/* ── Empty state ───────────────────────────────────────────────────── */}
        {isEmpty && <EmptyState />}

        {/* ── Charts section ────────────────────────────────────────────────── */}
        {!isEmpty && !hasError && stats && (
          <div className="space-y-3">
            <SectionHeader
              title="Portfolio Analytics"
              subtitle="Interactive charts — click to explore"
              icon={BarChart3}
              color="bg-gradient-to-br from-violet-500 to-purple-600"
              open={showCharts}
              onToggle={() => setShowCharts((v) => !v)}
            />

            {showCharts && (
              <div className="space-y-4">
                {/* Row 1: Growth chart (full width) */}
                <PortfolioGrowthChart
                  data={stats.growthSeries}
                  loading={allLoading}
                />

                {/* Row 2: Distribution + Returns */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <InvestmentDistributionChart
                    data={stats.byPackage}
                    loading={allLoading}
                  />
                  <ReturnsComparisonChart
                    data={stats.byPackage}
                    loading={allLoading}
                  />
                </div>

                {/* Row 3: Monthly trend + ROI comparison */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <MonthlyTrendChart
                    data={stats.monthlyTrend}
                    loading={allLoading}
                  />
                  <RoiComparisonChart
                    data={stats.byPackage}
                    loading={allLoading}
                  />
                </div>

                {/* Row 4: Lock-in timeline (full width) */}
                <LockInTimelineChart
                  investments={allInvestments}
                  loading={allLoading}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Investments section ────────────────────────────────────────────── */}
        {!isEmpty && !hasError && (
          <div className="space-y-3">
            <SectionHeader
              title="My Investments"
              subtitle={`${allInvestments.length} total investment${allInvestments.length !== 1 ? "s" : ""}`}
              icon={History}
              color="bg-gradient-to-br from-emerald-500 to-teal-600"
              open={showCards}
              onToggle={() => setShowCards((v) => !v)}
            />

            {showCards && (
              <div className="space-y-3">
                {/* Filters */}
                <InvestmentFilters
                  filters={filters}
                  onChange={setFilters}
                  onReset={handleResetFilters}
                  resultCount={viewMode === "cards" ? filteredAll.length : filteredPage.length}
                  totalCount={allInvestments.length}
                  showAdvanced={showAdvFilters}
                  onToggleAdv={() => setShowAdvFilters((v) => !v)}
                />

                {/* Mobile view toggle */}
                <div className="flex sm:hidden items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      viewMode === "cards"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <LayoutGrid size={12} /> Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      viewMode === "table"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <List size={12} /> Table
                  </button>
                </div>

                {/* Card grid view */}
                {viewMode === "cards" && (
                  <div>
                    {allLoading ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => <MyInvestmentCardSkeleton key={i} />)}
                      </div>
                    ) : filteredAll.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-slate-100 bg-white">
                        <TrendingUp size={24} className="text-slate-300" />
                        <p className="text-sm font-semibold text-slate-500">
                          {isFiltered ? "No investments match your filters." : "No investments found."}
                        </p>
                        {isFiltered && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="text-xs font-semibold text-emerald-600 hover:underline"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredAll.map((inv, idx) => (
                          <MyInvestmentCard key={inv.id} investment={inv} index={idx} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Table view */}
                {viewMode === "table" && (
                  <InvestmentsTable
                    investments={filteredPage}
                    loading={pageLoading}
                    totalCount={pageData?.total}
                    page={tablePage}
                    totalPages={pageData?.pages ?? 1}
                    onPageChange={(p) => {
                      setTablePage(p);
                      // reset filter state on page change if filtering is complex
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
        {!allLoading && (
          <div className="flex flex-wrap items-center justify-center gap-3 py-4">
            <Link
              href="/dashboard/invest"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90 transition-all"
            >
              <TrendingUp size={14} /> Invest in New Plan
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <BarChart3 size={14} /> Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
