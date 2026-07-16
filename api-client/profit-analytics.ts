/**
 * Client-side Profit Analytics hooks — TanStack Query wrappers for
 * GET /api/invest/analytics.
 *
 * Follows the exact same patterns as api-client/invest.ts and
 * api-client/dashboard.ts (single axios apiClient, structured query keys,
 * staleTime, no Zustand — local state only).
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient }                from "@/lib/client";

// ─── Shared ───────────────────────────────────────────────────────────────────

interface ApiSuccess<T> { success: true; data: T }

export function extractAnalyticsError(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message ?? "Something went wrong. Please try again.";
}

// ─── Range type (mirrors server) ─────────────────────────────────────────────

export type AnalyticsRange = "7d" | "30d" | "90d" | "6m" | "1y" | "lifetime";

export const RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d":       "7 Days",
  "30d":      "30 Days",
  "90d":      "90 Days",
  "6m":       "6 Months",
  "1y":       "1 Year",
  "lifetime": "Lifetime",
};

export const ALL_RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "6m", "1y", "lifetime"];

// ─── Response types (match server repository exports) ────────────────────────

export interface ProfitKpis {
  totalInvested:        number;
  portfolioValue:       number;
  totalProfit:          number;
  totalRoi:             number;
  todayProfit:          number;
  monthProfit:          number;
  activeInvestments:    number;
  maturedInvestments:   number;
  cancelledInvestments: number;
  withdrawnInvestments: number;
  bestPackageName:      string | null;
  bestPackageRoi:       number;
  estimatedFutureValue: number;
}

export interface PackageAnalyticsRow {
  packageId:       string;
  packageName:     string;
  packageCode:     string;
  invested:        number;
  currentValue:    number;
  profit:          number;
  roi:             number;
  dailyReturnRate: number;
  tenureDays:      number;
  count:           number;
  status:          string;
  investedAt:      string;
}

export interface MonthlyProfitPoint {
  month:    string;
  invested: number;
  profit:   number;
  roi:      number;
}

export interface DailyProfitPoint {
  date:   string;
  profit: number;
}

export interface PortfolioGrowthPoint {
  date:  string;
  value: number;
}

export interface ProfitDistributionPoint {
  label:    string;
  invested: number;
  returns:  number;
  profit:   number;
}

export interface ProfitAnalyticsData {
  range:        AnalyticsRange;
  kpis:         ProfitKpis;
  packages:     PackageAnalyticsRow[];
  monthlyTrend: MonthlyProfitPoint[];
  dailySeries:  DailyProfitPoint[];
  growthSeries: PortfolioGrowthPoint[];
  distribution: ProfitDistributionPoint[];
}

// ─── Query key ────────────────────────────────────────────────────────────────

export const PROFIT_ANALYTICS_KEY = (range: AnalyticsRange) =>
  ["invest", "profit-analytics", range] as const;

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useProfitAnalytics(range: AnalyticsRange = "lifetime") {
  return useQuery<ProfitAnalyticsData>({
    queryKey: PROFIT_ANALYTICS_KEY(range),
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<ProfitAnalyticsData>>(
        `/invest/analytics?range=${range}`
      );
      return res.data.data;
    },
    staleTime:       60_000,   // 1 minute — financial data refreshes on demand
    retry:           1,
    refetchOnWindowFocus: false,
  });
}

// ─── Invalidation helper (call after investments change) ─────────────────────

export function useInvalidateProfitAnalytics() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["invest", "profit-analytics"] });
  };
}

// ─── Derived insight types ────────────────────────────────────────────────────

export interface ProfitInsight {
  id:       string;
  type:     "success" | "info" | "warning" | "neutral";
  icon:     string;
  label:    string;
  value:    string;
  sub?:     string;
}

/**
 * Derives human-readable insights from analytics data.
 * Pure function — no side effects, no fabricated financial advice.
 */
export function deriveProfitInsights(data: ProfitAnalyticsData): ProfitInsight[] {
  const { kpis, packages } = data;
  const insights: ProfitInsight[] = [];

  if (packages.length === 0) return insights;

  // Best performing package by ROI
  const best = [...packages].sort((a, b) => b.roi - a.roi)[0];
  if (best && best.roi > 0) {
    insights.push({
      id:    "best-roi",
      type:  "success",
      icon:  "🏆",
      label: "Best ROI",
      value: `${best.roi}% ROI`,
      sub:   best.packageName,
    });
  }

  // Highest profit package
  const highestProfit = [...packages].sort((a, b) => b.profit - a.profit)[0];
  if (highestProfit && highestProfit.profit > 0) {
    insights.push({
      id:    "highest-profit",
      type:  "success",
      icon:  "💰",
      label: "Highest Profit",
      value: formatINRCompact(highestProfit.profit),
      sub:   highestProfit.packageName,
    });
  }

  // Largest investment
  const largest = [...packages].sort((a, b) => b.invested - a.invested)[0];
  if (largest) {
    insights.push({
      id:    "largest-investment",
      type:  "info",
      icon:  "📊",
      label: "Largest Investment",
      value: formatINRCompact(largest.invested),
      sub:   largest.packageName,
    });
  }

  // Portfolio diversification
  if (packages.length > 1) {
    const totalInvested = packages.reduce((s, p) => s + p.invested, 0);
    const dominantPkg   = packages[0];
    const dominantPct   = totalInvested > 0
      ? Math.round((dominantPkg.invested / totalInvested) * 100)
      : 0;

    insights.push({
      id:    "diversification",
      type:  packages.length >= 3 ? "success" : "info",
      icon:  "🎯",
      label: "Diversification",
      value: `${packages.length} packages`,
      sub:   `${dominantPct}% in ${dominantPkg.packageName}`,
    });
  }

  // Overall ROI
  if (kpis.totalRoi > 0) {
    insights.push({
      id:    "overall-roi",
      type:  kpis.totalRoi >= 15 ? "success" : "info",
      icon:  "📈",
      label: "Overall ROI",
      value: `+${kpis.totalRoi}%`,
      sub:   "on total invested capital",
    });
  }

  // Lowest performing (only if multiple packages and there's a clear laggard)
  if (packages.length > 1) {
    const worst = [...packages].sort((a, b) => a.roi - b.roi)[0];
    if (worst && worst.roi < best.roi * 0.5) {
      insights.push({
        id:    "lowest-performer",
        type:  worst.roi < 0 ? "warning" : "neutral",
        icon:  worst.roi < 0 ? "⚠️" : "🔍",
        label: worst.roi < 0 ? "Negative Returns" : "Lowest Performer",
        value: `${worst.roi}% ROI`,
        sub:   worst.packageName,
      });
    }
  }

  // Estimated future value
  if (kpis.estimatedFutureValue > kpis.portfolioValue) {
    const gain = kpis.estimatedFutureValue - kpis.totalInvested;
    insights.push({
      id:    "future-value",
      type:  "success",
      icon:  "🚀",
      label: "Projected Returns",
      value: formatINRCompact(kpis.estimatedFutureValue),
      sub:   `+${formatINRCompact(gain)} at full maturity`,
    });
  }

  // Active investments count
  if (kpis.activeInvestments > 0) {
    insights.push({
      id:    "active-count",
      type:  "info",
      icon:  "⚡",
      label: "Active Plans",
      value: `${kpis.activeInvestments} running`,
      sub:   `${kpis.maturedInvestments} matured, ${kpis.withdrawnInvestments} withdrawn`,
    });
  }

  return insights;
}

// ─── Re-export formatting helpers (from invest.ts for convenience) ────────────

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style:                 "currency",
    currency:              "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatINRCompact(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)}Cr`;
  if (value >= 100_000)    return `₹${(value / 100_000).toFixed(2)}L`;
  if (value >= 1_000)      return `₹${(value / 1_000).toFixed(1)}K`;
  return formatINR(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
