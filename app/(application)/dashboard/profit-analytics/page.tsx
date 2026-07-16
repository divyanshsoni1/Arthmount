"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw, Download, TrendingUp, BarChart3,
  CircleDollarSign, Target, Activity, Wallet,
  Clock, Sparkles, AlertTriangle, ArrowLeft,
  ChevronDown, ChevronUp, Layers,
} from "lucide-react";

import { useUser }          from "@/api-client/user";
import { useQueryClient }   from "@tanstack/react-query";
import {
  useProfitAnalytics,
  deriveProfitInsights,
  PROFIT_ANALYTICS_KEY,
  formatINRCompact,
  formatINR,
  type AnalyticsRange,
  ALL_RANGES,
  RANGE_LABELS,
} from "@/api-client/profit-analytics";

import { PortfolioGrowthChart }      from "@/components/my-investments/charts/PortfolioGrowthChart";
import { InvestmentDistributionChart } from "@/components/my-investments/charts/InvestmentDistributionChart";
import { RoiComparisonChart }        from "@/components/my-investments/charts/RoiComparisonChart";
import { PackageProfitChart }        from "@/components/profit-analytics/charts/PackageProfitChart";
import { ProfitTrendChart }          from "@/components/profit-analytics/charts/ProfitTrendChart";
import { ProfitDistributionChart }   from "@/components/profit-analytics/charts/ProfitDistributionChart";
import { ProfitInsights, ProfitInsightsSkeleton } from "@/components/profit-analytics/ProfitInsights";
import {
  PackagePerformanceCards,
  PackagePerformanceCardsSkeleton,
} from "@/components/profit-analytics/PackagePerformanceCards";

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:    string;
  value:    string;
  sub?:     string;
  icon:     React.ElementType;
  color:    string;          // Tailwind bg class for icon container
  trend?:   "up" | "down" | "neutral";
  loading?: boolean;
}

function KpiCard({ label, value, sub, icon: Icon, color, trend, loading }: KpiCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        {trend === "up"   && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5">↑</span>}
        {trend === "down" && <span className="text-[10px] font-bold text-red-500 bg-red-50 rounded-full px-1.5 py-0.5">↓</span>}
      </div>
      {loading ? (
        <div className="space-y-1.5">
          <div className="h-5 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
        </div>
      ) : (
        <>
          <p className="text-lg font-extrabold tabular-nums text-slate-900 leading-tight">{value}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{label}</p>
          {sub && <p className="text-[10px] text-slate-300 mt-0.5 truncate">{sub}</p>}
        </>
      )}
    </div>
  );
}

// ─── KPI skeleton grid ────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-5 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, subtitle, icon: Icon, iconCls, children, defaultOpen = true,
}: {
  title: string; subtitle?: string; icon: React.ElementType;
  iconCls: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className={`flex h-7 w-7 items-center justify-center rounded-xl ${iconCls}`}>
            <Icon size={13} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900 leading-none">{title}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {open
          ? <ChevronUp size={15} className="text-slate-400 shrink-0" />
          : <ChevronDown size={15} className="text-slate-400 shrink-0" />
        }
      </button>
      {open && children}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100">
          <BarChart3 size={32} className="text-violet-500" />
        </div>
        <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow">
          <Sparkles size={12} className="text-white" />
        </div>
      </div>
      <div className="max-w-sm">
        <h3 className="text-lg font-extrabold text-slate-800">No investments yet</h3>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          You haven&apos;t started investing yet. Make your first investment to unlock your Profit Analytics dashboard.
        </p>
      </div>
      <Link
        href="/dashboard/invest"
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-95 transition-all"
      >
        <TrendingUp size={15} /> Invest Now
      </Link>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
        <AlertTriangle size={22} className="text-red-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-700">Failed to load analytics</p>
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

// ─── CSV export ───────────────────────────────────────────────────────────────

import type { PackageAnalyticsRow } from "@/api-client/profit-analytics";

function exportCSV(packages: PackageAnalyticsRow[] | undefined) {
  if (!packages?.length) return;
  const headers = ["Package", "Code", "Invested (₹)", "Current Value (₹)", "Profit (₹)", "ROI (%)", "Daily Rate (%)", "Tenure (Days)", "Status", "Since"];
  const rows = packages.map((p: PackageAnalyticsRow) => [
    `"${p.packageName}"`, p.packageCode,
    p.invested.toFixed(2), p.currentValue.toFixed(2),
    p.profit.toFixed(2), p.roi,
    p.dailyReturnRate, p.tenureDays,
    p.status,
    new Date(p.investedAt).toLocaleDateString("en-IN"),
  ].join(","));
  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `arthmount-profit-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfitAnalyticsPage() {
  const router = useRouter();
  const qc     = useQueryClient();

  const { user, isLoading: userLoading } = useUser();
  const [range, setRange] = useState<AnalyticsRange>("lifetime");

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useProfitAnalytics(range);

  // Auth guard — USER role only
  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.replace("/login?next=/dashboard/profit-analytics");
      return;
    }
    const adminRoles = new Set(["ADMIN", "SUPER_ADMIN", "SUPPORT"]);
    if (adminRoles.has(user.role)) {
      router.replace("/admin");
    }
  }, [user, userLoading, router]);

  const handleRefresh = useCallback(() => {
    ALL_RANGES.forEach((r) => {
      qc.invalidateQueries({ queryKey: PROFIT_ANALYTICS_KEY(r) });
    });
    refetch();
  }, [qc, refetch]);

  const insights = useMemo(
    () => (data ? deriveProfitInsights(data) : []),
    [data]
  );

  // Loading spinner while user session resolves
  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }
  if (!user) return null;

  const kpis        = data?.kpis;
  const packages    = data?.packages   ?? [];
  const monthlyTrend = data?.monthlyTrend ?? [];
  const growthSeries = data?.growthSeries ?? [];
  const distribution = data?.distribution ?? [];

  const isEmpty = !isLoading && !error && packages.length === 0 && kpis?.totalInvested === 0;
  const hasError = !!error;

  const profitTrend = kpis && kpis.totalProfit > 0 ? "up" : kpis && kpis.totalProfit < 0 ? "down" : "neutral";

  // KPI card definitions — 6 essential metrics
  const kpiCards: KpiCardProps[] = [
    {
      label:   "Total Invested",
      value:   formatINRCompact(kpis?.totalInvested ?? 0),
      sub:     `${(kpis?.activeInvestments ?? 0) + (kpis?.maturedInvestments ?? 0)} investments`,
      icon:    TrendingUp,
      color:   "bg-blue-500",
      trend:   (kpis?.totalInvested ?? 0) > 0 ? "up" : "neutral",
    },
    {
      label:   "Portfolio Value",
      value:   formatINRCompact(kpis?.portfolioValue ?? 0),
      sub:     "Principal + Profit",
      icon:    BarChart3,
      color:   "bg-emerald-500",
      trend:   (kpis?.portfolioValue ?? 0) > (kpis?.totalInvested ?? 0) ? "up" : "neutral",
    },
    {
      label:   "Total Profit",
      value:   formatINRCompact(kpis?.totalProfit ?? 0),
      sub:     "Credited to wallet",
      icon:    CircleDollarSign,
      color:   (kpis?.totalProfit ?? 0) >= 0 ? "bg-teal-500" : "bg-red-500",
      trend:   profitTrend as "up" | "down" | "neutral",
    },
    {
      label:   "Overall ROI",
      value:   `${(kpis?.totalRoi ?? 0) > 0 ? "+" : ""}${kpis?.totalRoi ?? 0}%`,
      sub:     "Return on investment",
      icon:    Target,
      color:   (kpis?.totalRoi ?? 0) > 0 ? "bg-violet-500" : "bg-slate-500",
      trend:   (kpis?.totalRoi ?? 0) > 0 ? "up" : "neutral",
    },
    {
      label:   "Today's Profit",
      value:   formatINRCompact(kpis?.todayProfit ?? 0),
      sub:     "Credited today",
      icon:    Sparkles,
      color:   "bg-amber-500",
      trend:   (kpis?.todayProfit ?? 0) > 0 ? "up" : "neutral",
    },
    {
      label:   "Active Plans",
      value:   String(kpis?.activeInvestments ?? 0),
      sub:     `${kpis?.maturedInvestments ?? 0} matured`,
      icon:    Activity,
      color:   "bg-cyan-500",
      trend:   (kpis?.activeInvestments ?? 0) > 0 ? "up" : "neutral",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky top bar ──────────────────────────────────────────────────── */}
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
              <h1 className="text-base font-extrabold text-slate-900 leading-none">Profit Analytics</h1>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                Track your investment performance and portfolio growth
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            {(data?.packages?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => exportCSV(data?.packages)}
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                title="Export CSV"
              >
                <Download size={13} />
                Export
              </button>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              aria-label="Refresh analytics"
            >
              <RefreshCw size={13} className={(isLoading || isFetching) ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Page body ───────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-7">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-slate-800 to-violet-900 p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-violet-500/10" />
          <div className="pointer-events-none absolute -left-6 bottom-0   h-28 w-28 rounded-full bg-white/5"    />
          <div className="pointer-events-none absolute right-28 bottom-4  h-24 w-24 rounded-full bg-blue-500/10" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20">
                  <BarChart3 size={15} className="text-violet-400" />
                </div>
                <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                  Profit Analytics
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                {user.name.split(" ")[0]}&apos;s Portfolio
              </h2>
              <p className="text-sm text-white/60 mt-1.5 max-w-md">
                A complete view of your returns, portfolio growth, and investment performance across all packages.
              </p>
            </div>

            {/* Quick stats */}
            {kpis && !isLoading && (
              <div className="flex flex-wrap gap-5">
                {[
                  { label: "Portfolio Value", value: formatINRCompact(kpis.portfolioValue), highlight: true },
                  { label: "Total Profit",    value: `+${formatINRCompact(kpis.totalProfit)}` },
                  { label: "Overall ROI",     value: `+${kpis.totalRoi}%` },
                ].map(({ label, value, highlight }) => (
                  <div key={label}>
                    <p className="text-[11px] text-white/40 uppercase tracking-wider">{label}</p>
                    <p className={`text-xl font-extrabold tabular-nums mt-0.5 ${highlight ? "" : "text-violet-400"}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Time range filter ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-700">Analytics Period</p>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm flex-wrap">
            {ALL_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  range === r
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error state ──────────────────────────────────────────────────── */}
        {hasError && <ErrorState onRetry={handleRefresh} />}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {isEmpty && !hasError && <EmptyState />}

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        {!hasError && (
          isLoading ? <KpiSkeleton /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {kpiCards.map((card) => (
                <KpiCard key={card.label} {...card} loading={isLoading} />
              ))}
            </div>
          )
        )}

        {/* ── Main content (only when we have data) ────────────────────────── */}
        {!isEmpty && !hasError && (
          <>
            {/* ── Portfolio Insights ─────────────────────────────────────── */}
            {isLoading
              ? <ProfitInsightsSkeleton />
              : <ProfitInsights insights={insights} loading={isLoading} />
            }

            {/* ── Portfolio Growth chart ─────────────────────────────────── */}
            <Section
              title="Portfolio Growth"
              subtitle="Cumulative value over time — adjust the range above"
              icon={TrendingUp}
              iconCls="bg-emerald-500"
            >
              <PortfolioGrowthChart data={growthSeries} loading={isLoading} />
            </Section>

            {/* ── Profit Trend chart ─────────────────────────────────────── */}
            <Section
              title="Profit Trend"
              subtitle="Monthly invested capital vs returns credited"
              icon={Activity}
              iconCls="bg-pink-500"
            >
              <ProfitTrendChart data={monthlyTrend} loading={isLoading} />
            </Section>

            {/* ── Charts: package analysis (2-col on large screens) ─────── */}
            <Section
              title="Package Analysis"
              subtitle="Performance comparison across all investment packages"
              icon={BarChart3}
              iconCls="bg-violet-500"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PackageProfitChart    data={packages}   loading={isLoading} />
                <RoiComparisonChart    data={packages}   loading={isLoading} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <InvestmentDistributionChart data={packages} loading={isLoading} />
                <ProfitDistributionChart     data={distribution} loading={isLoading} />
              </div>
            </Section>

            {/* ── Package Performance Cards ─────────────────────────────── */}
            <Section
              title="Package Performance"
              subtitle="Detailed card view with sparklines and lock-in progress"
              icon={Layers}
              iconCls="bg-blue-500"
            >
              {isLoading
                ? <PackagePerformanceCardsSkeleton />
                : <PackagePerformanceCards packages={packages} loading={isLoading} />
              }
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
