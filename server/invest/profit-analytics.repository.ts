/**
 * Profit Analytics Repository — user-scoped analytics queries.
 *
 * All queries are strictly scoped to a single userId.
 * No cross-user data is ever returned.
 *
 * Design goals:
 *  - Reuse existing Prisma models: Investment, WeeklyProfitAccumulation, Package
 *  - No business logic duplication — raw aggregations only
 *  - Efficient: batch queries with Promise.all(), no N+1 patterns
 */

import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalyticsRange = "7d" | "30d" | "90d" | "6m" | "1y" | "lifetime";

export interface UserProfitKpis {
  totalInvested:        number;
  portfolioValue:       number;
  totalProfit:          number;
  totalRoi:             number;   // percentage
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
  status:          string;   // dominant status
  investedAt:      string;   // earliest investment date
}

export interface MonthlyProfitPoint {
  month:    string;   // "Jan 25"
  invested: number;
  profit:   number;
  roi:      number;   // percentage for that month's cohort
}

export interface DailyProfitPoint {
  date:   string;   // ISO date "YYYY-MM-DD"
  profit: number;
}

export interface PortfolioGrowthPoint {
  date:  string;   // ISO date
  value: number;   // cumulative portfolio value at that date
}

export interface ProfitDistributionPoint {
  label:      string;
  invested:   number;
  returns:    number;
  profit:     number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRangeStart(range: AnalyticsRange): Date | null {
  if (range === "lifetime") return null;
  const now = Date.now();
  const msMap: Record<AnalyticsRange, number> = {
    "7d":       7   * 86_400_000,
    "30d":      30  * 86_400_000,
    "90d":      90  * 86_400_000,
    "6m":       183 * 86_400_000,
    "1y":       365 * 86_400_000,
    "lifetime": 0,
  };
  return new Date(now - msMap[range]);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ─── 1. KPI summary ──────────────────────────────────────────────────────────

export async function getUserProfitKpis(userId: string): Promise<UserProfitKpis> {
  const todayStart = startOfDay(new Date());
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [investments, todayProfitAgg, monthProfitAgg] = await Promise.all([
    // All investments for this user (not deleted)
    prisma.investment.findMany({
      where: { userId, deletedAt: null },
      select: {
        id:                true,
        packageId:         true,
        principalAmount:   true,
        totalProfitEarned: true,
        dailyReturnRate:   true,
        tenureDays:        true,
        completedDays:     true,
        status:            true,
        package: { select: { name: true } },
      },
    }),

    // Today's credited profit
    prisma.weeklyProfitAccumulation.aggregate({
      where: {
        userId,
        status:     "CREDITED",
        creditedAt: { gte: todayStart },
      },
      _sum: { netProfit: true },
    }),

    // This month's credited profit
    prisma.weeklyProfitAccumulation.aggregate({
      where: {
        userId,
        status:     "CREDITED",
        creditedAt: { gte: monthStart },
      },
      _sum: { netProfit: true },
    }),
  ]);

  let totalInvested      = 0;
  let totalProfit        = 0;
  let activeInvestments  = 0;
  let maturedInvestments = 0;
  let cancelledInvestments = 0;
  let withdrawnInvestments = 0;
  let estimatedFutureValue = 0;

  // Package ROI map for "best performing" insight
  const packageRoiMap = new Map<string, { name: string; profit: number; invested: number }>();

  for (const inv of investments) {
    const principal = Number(inv.principalAmount);
    const profit    = Number(inv.totalProfitEarned);
    const estReturn = principal * (Number(inv.dailyReturnRate) / 100) * inv.tenureDays;

    totalInvested += principal;
    totalProfit   += profit;

    switch (inv.status) {
      case "ACTIVE":    activeInvestments++;    break;
      case "MATURED":   maturedInvestments++;   break;
      case "CANCELLED": cancelledInvestments++; break;
      case "WITHDRAWN": withdrawnInvestments++; break;
    }

    if (inv.status === "ACTIVE") {
      estimatedFutureValue += principal + estReturn;
    } else if (inv.status === "MATURED") {
      estimatedFutureValue += principal + profit;
    }

    // Accumulate per-package for ROI
    const existing = packageRoiMap.get(inv.packageId);
    if (existing) {
      existing.profit   += profit;
      existing.invested += principal;
    } else {
      packageRoiMap.set(inv.packageId, {
        name:     inv.package.name,
        profit,
        invested: principal,
      });
    }
  }

  const portfolioValue = totalInvested + totalProfit;
  const totalRoi       = totalInvested > 0
    ? parseFloat(((totalProfit / totalInvested) * 100).toFixed(2))
    : 0;

  // Best package by ROI
  let bestPackageName: string | null = null;
  let bestPackageRoi  = 0;
  for (const [, pkg] of packageRoiMap) {
    const roi = pkg.invested > 0 ? (pkg.profit / pkg.invested) * 100 : 0;
    if (roi > bestPackageRoi) {
      bestPackageRoi  = parseFloat(roi.toFixed(2));
      bestPackageName = pkg.name;
    }
  }

  return {
    totalInvested,
    portfolioValue,
    totalProfit,
    totalRoi,
    todayProfit:          Number(todayProfitAgg._sum.netProfit  ?? 0),
    monthProfit:          Number(monthProfitAgg._sum.netProfit  ?? 0),
    activeInvestments,
    maturedInvestments,
    cancelledInvestments,
    withdrawnInvestments,
    bestPackageName,
    bestPackageRoi,
    estimatedFutureValue,
  };
}

// ─── 2. Package-level analytics ──────────────────────────────────────────────

export async function getPackageAnalytics(userId: string): Promise<PackageAnalyticsRow[]> {
  const investments = await prisma.investment.findMany({
    where: { userId, deletedAt: null },
    select: {
      id:                true,
      packageId:         true,
      principalAmount:   true,
      totalProfitEarned: true,
      dailyReturnRate:   true,
      tenureDays:        true,
      completedDays:     true,
      status:            true,
      investedAt:        true,
      package: { select: { name: true, code: true } },
    },
    orderBy: { investedAt: "asc" },
  });

  const packageMap = new Map<string, PackageAnalyticsRow>();

  for (const inv of investments) {
    const principal = Number(inv.principalAmount);
    const profit    = Number(inv.totalProfitEarned);
    const existing  = packageMap.get(inv.packageId);

    if (existing) {
      existing.invested     += principal;
      existing.currentValue += principal + profit;
      existing.profit       += profit;
      existing.count        += 1;
      // Keep earliest investedAt
      if (inv.investedAt.toISOString() < existing.investedAt) {
        existing.investedAt = inv.investedAt.toISOString();
      }
      // Dominant status: ACTIVE > MATURED > rest
      if (inv.status === "ACTIVE") existing.status = "ACTIVE";
      else if (inv.status === "MATURED" && existing.status !== "ACTIVE") {
        existing.status = "MATURED";
      }
    } else {
      packageMap.set(inv.packageId, {
        packageId:       inv.packageId,
        packageName:     inv.package.name,
        packageCode:     inv.package.code,
        invested:        principal,
        currentValue:    principal + profit,
        profit,
        roi:             0,
        dailyReturnRate: Number(inv.dailyReturnRate),
        tenureDays:      inv.tenureDays,
        count:           1,
        status:          inv.status,
        investedAt:      inv.investedAt.toISOString(),
      });
    }
  }

  return Array.from(packageMap.values())
    .map((p) => ({
      ...p,
      roi: p.invested > 0 ? parseFloat(((p.profit / p.invested) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.invested - a.invested);
}

// ─── 3. Monthly profit trend ─────────────────────────────────────────────────

export async function getMonthlyProfitTrend(userId: string): Promise<MonthlyProfitPoint[]> {
  // Pull profit accumulations for the last 24 months
  const since = new Date();
  since.setMonth(since.getMonth() - 24);

  const [profitRows, investmentRows] = await Promise.all([
    prisma.weeklyProfitAccumulation.findMany({
      where: {
        userId,
        status:    "CREDITED",
        creditedAt: { gte: since },
      },
      select: { netProfit: true, creditedAt: true },
      orderBy: { creditedAt: "asc" },
    }),

    prisma.investment.findMany({
      where:   { userId, deletedAt: null, investedAt: { gte: since } },
      select:  { principalAmount: true, investedAt: true },
      orderBy: { investedAt: "asc" },
    }),
  ]);

  // Aggregate profit by month
  const profitByMonth  = new Map<string, number>();
  const investByMonth  = new Map<string, number>();

  for (const row of profitRows) {
    if (!row.creditedAt) continue;
    const d   = row.creditedAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    profitByMonth.set(key, (profitByMonth.get(key) ?? 0) + Number(row.netProfit));
  }

  for (const inv of investmentRows) {
    const d   = inv.investedAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    investByMonth.set(key, (investByMonth.get(key) ?? 0) + Number(inv.principalAmount));
  }

  // Combine and sort
  const allKeys = new Set([...profitByMonth.keys(), ...investByMonth.keys()]);

  return Array.from(allKeys)
    .sort()
    .map((key) => {
      const [year, month] = key.split("-");
      const invested = investByMonth.get(key) ?? 0;
      const profit   = profitByMonth.get(key)  ?? 0;
      const roi      = invested > 0 ? parseFloat(((profit / invested) * 100).toFixed(2)) : 0;
      const label    = new Date(parseInt(year), parseInt(month) - 1, 1)
        .toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      return { month: label, invested, profit, roi };
    });
}

// ─── 4. Daily profit series (for area chart) ─────────────────────────────────

export async function getDailyProfitSeries(
  userId: string,
  range:  AnalyticsRange
): Promise<DailyProfitPoint[]> {
  const rangeStart = getRangeStart(range);
  const where = {
    userId,
    status: "CREDITED" as const,
    ...(rangeStart ? { creditedAt: { gte: rangeStart } } : {}),
  };

  const rows = await prisma.weeklyProfitAccumulation.findMany({
    where,
    select: { netProfit: true, profitDate: true, creditedAt: true },
    orderBy: { profitDate: "asc" },
  });

  const buckets = new Map<string, number>();
  for (const row of rows) {
    // Use profitDate as the canonical date key
    const d   = row.profitDate;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + Number(row.netProfit));
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, profit]) => ({ date, profit }));
}

// ─── 5. Portfolio growth series ──────────────────────────────────────────────

export async function getPortfolioGrowthSeries(userId: string): Promise<PortfolioGrowthPoint[]> {
  const investments = await prisma.investment.findMany({
    where: { userId, deletedAt: null },
    select: {
      principalAmount:   true,
      totalProfitEarned: true,
      dailyReturnRate:   true,
      tenureDays:        true,
      investedAt:        true,
      maturityDate:      true,
      status:            true,
    },
    orderBy: { investedAt: "asc" },
  });

  if (investments.length === 0) return [];

  const firstDate = investments[0].investedAt;
  const today     = new Date();

  // Build a daily cumulative portfolio value series
  const buckets   = new Map<string, { principal: number; profit: number }>();

  for (const inv of investments) {
    const principal  = Number(inv.principalAmount);
    const dailyRate  = Number(inv.dailyReturnRate) / 100;
    const start      = startOfDay(inv.investedAt);
    const end        = startOfDay(
      inv.status === "ACTIVE" ? today : inv.maturityDate
    );

    const days = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 86_400_000)
    );

    for (let i = 0; i <= days; i++) {
      const d   = new Date(start.getTime() + i * 86_400_000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const existing = buckets.get(key) ?? { principal: 0, profit: 0 };
      existing.principal += principal;
      existing.profit    += principal * dailyRate * i;
      buckets.set(key, existing);
    }
  }

  // Down-sample to max 90 points for chart performance
  const allPoints = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, value: parseFloat((v.principal + v.profit).toFixed(2)) }));

  if (allPoints.length <= 90) return allPoints;

  const step     = Math.floor(allPoints.length / 90);
  const sampled  = allPoints.filter((_, i) => i % step === 0 || i === allPoints.length - 1);
  return sampled;
}

// ─── 6. Profit distribution (quarterly/annual buckets) ───────────────────────

export async function getProfitDistribution(userId: string): Promise<ProfitDistributionPoint[]> {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 3);   // last 3 years

  const [profitRows, investRows] = await Promise.all([
    prisma.weeklyProfitAccumulation.findMany({
      where: {
        userId,
        status:    "CREDITED",
        creditedAt: { gte: since },
      },
      select: { netProfit: true, creditedAt: true },
    }),
    prisma.investment.findMany({
      where:   { userId, deletedAt: null, investedAt: { gte: since } },
      select:  { principalAmount: true, totalProfitEarned: true, investedAt: true },
    }),
  ]);

  // Bucket by quarter (Q1 24, Q2 24, …)
  const quarters = new Map<string, { invested: number; profit: number }>();

  function quarterKey(d: Date): string {
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `Q${q} ${d.getFullYear().toString().slice(2)}`;
  }

  for (const row of profitRows) {
    if (!row.creditedAt) continue;
    const key = quarterKey(row.creditedAt);
    const slot = quarters.get(key) ?? { invested: 0, profit: 0 };
    slot.profit += Number(row.netProfit);
    quarters.set(key, slot);
  }

  for (const inv of investRows) {
    const key  = quarterKey(inv.investedAt);
    const slot = quarters.get(key) ?? { invested: 0, profit: 0 };
    slot.invested += Number(inv.principalAmount);
    quarters.set(key, slot);
  }

  // Sort chronologically
  const sorted = Array.from(quarters.entries()).sort(([a], [b]) => {
    // Parse "Q1 24" → comparable: year * 10 + quarter
    const parse = (s: string) => {
      const [q, yr] = s.split(" ");
      return parseInt(yr) * 10 + parseInt(q.slice(1));
    };
    return parse(a) - parse(b);
  });

  return sorted.map(([label, v]) => ({
    label,
    invested: parseFloat(v.invested.toFixed(2)),
    returns:  parseFloat((v.invested + v.profit).toFixed(2)),
    profit:   parseFloat(v.profit.toFixed(2)),
  }));
}
