/**
 * Client-side invest hooks — TanStack Query wrappers for the invest API.
 * Follows the exact same patterns as api-client/wallet.ts.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";
import { DASHBOARD_KEY, INVESTMENTS_KEY } from "@/api-client/dashboard";
import { WALLET_BALANCE_KEY } from "@/api-client/wallet";

// ─── Shared ───────────────────────────────────────────────────────────────────

interface ApiSuccess<T> { success: true; data: T }

export function extractInvestError(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message ?? "Something went wrong. Please try again.";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivePackage {
  id:              string;
  name:            string;
  code:            string;
  description:     string | null;
  minAmount:       number;
  maxAmount:       number;
  dailyReturnRate: number;
  tenureDays:      number;
  displayOrder:    number;
  totalInvestors:  number;
  activeInvestors: number;
  totalInvested:   number;
}

export interface InvestmentRecord {
  id:               string;
  packageId:        string;
  packageName:      string;
  packageCode:      string;
  principalAmount:  number;
  dailyReturnRate:  number;
  tenureDays:       number;
  completedDays:    number;
  totalProfitEarned: number;
  totalProfitPaid:  number;
  pendingProfit:    number;
  investedAt:       string;
  maturityDate:     string;
  status:           "ACTIVE" | "MATURED" | "CANCELLED" | "WITHDRAWN";
  paymentMethod:    string | null;
  transactionRef:   string | null;
}

export interface InvestmentHistoryResult {
  investments: InvestmentRecord[];
  total:       number;
  page:        number;
  pages:       number;
}

export interface CreateInvestOrderResult {
  orderId:     string;
  amount:      number;   // paise
  currency:    string;
  keyId:       string;
  packageId:   string;
  packageName: string;
}

export interface VerifyInvestPaymentPayload {
  packageId:         string;
  amount:            number;
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const ACTIVE_PACKAGES_KEY  = ["invest", "packages"]         as const;
export const INVEST_HISTORY_KEY   = (page: number) => ["invest", "history", page] as const;
export const INVEST_DETAIL_KEY    = (id: string)   => ["invest", "detail", id]    as const;

// ─── useActivePackages ────────────────────────────────────────────────────────

export function useActivePackages() {
  return useQuery<ActivePackage[]>({
    queryKey: ACTIVE_PACKAGES_KEY,
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<{ packages: ActivePackage[] }>>(
        "/invest/packages"
      );
      return res.data.data.packages;
    },
    staleTime: 60_000,
    retry:     false,
  });
}

// ─── useInvestmentHistory ─────────────────────────────────────────────────────

export function useInvestmentHistory(page = 1) {
  return useQuery<InvestmentHistoryResult>({
    queryKey: INVEST_HISTORY_KEY(page),
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<InvestmentHistoryResult>>(
        `/invest?page=${page}&limit=10`
      );
      return res.data.data;
    },
    staleTime: 30_000,
    retry:     false,
  });
}

// ─── useInvestmentDetail ──────────────────────────────────────────────────────

export function useInvestmentDetail(id: string) {
  return useQuery<InvestmentRecord>({
    queryKey: INVEST_DETAIL_KEY(id),
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<{ investment: InvestmentRecord }>>(
        `/invest/${id}`
      );
      return res.data.data.investment;
    },
    enabled:   !!id,
    staleTime: 30_000,
    retry:     false,
  });
}

// ─── useInvestFromWallet ──────────────────────────────────────────────────────

export function useInvestFromWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["invest", "walletInvest"],
    mutationFn:  async (payload: { packageId: string; amount: number }) => {
      const res = await apiClient.post<ApiSuccess<{ investment: InvestmentRecord }>>(
        "/invest",
        payload
      );
      return res.data.data.investment;
    },
    onSuccess: () => {
      // Refresh wallet balance (debited), dashboard summary, investment lists
      qc.invalidateQueries({ queryKey: WALLET_BALANCE_KEY });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
      qc.invalidateQueries({ queryKey: ["invest", "history"] });
      qc.invalidateQueries({ queryKey: INVESTMENTS_KEY(1) });
      qc.invalidateQueries({ queryKey: ACTIVE_PACKAGES_KEY });
    },
  });
}

// ─── useCreateInvestOrder ─────────────────────────────────────────────────────

export function useCreateInvestOrder() {
  return useMutation({
    mutationKey: ["invest", "createOrder"],
    mutationFn:  async (payload: { packageId: string; amount: number }) => {
      const res = await apiClient.post<ApiSuccess<CreateInvestOrderResult>>(
        "/invest/create-order",
        payload
      );
      return res.data.data;
    },
  });
}

// ─── useVerifyInvestPayment ───────────────────────────────────────────────────

export function useVerifyInvestPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["invest", "verifyPayment"],
    mutationFn:  async (payload: VerifyInvestPaymentPayload) => {
      const res = await apiClient.post<ApiSuccess<{ investment: InvestmentRecord }>>(
        "/invest/verify-payment",
        payload
      );
      return res.data.data.investment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WALLET_BALANCE_KEY });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
      qc.invalidateQueries({ queryKey: ["invest", "history"] });
      qc.invalidateQueries({ queryKey: INVESTMENTS_KEY(1) });
      qc.invalidateQueries({ queryKey: ACTIVE_PACKAGES_KEY });
    },
  });
}

// ─── Format helpers ───────────────────────────────────────────────────────────

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

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Days remaining until lock-in end (maturityDate). Negative = matured. */
export function daysRemaining(maturityDate: string): number {
  const diff = new Date(maturityDate).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

/** Compute lock-in progress percentage 0–100 */
export function lockInProgress(completedDays: number, tenureDays: number): number {
  if (tenureDays === 0) return 100;
  return Math.min(100, Math.round((completedDays / tenureDays) * 100));
}

/** Total return at maturity: principal + (principal × dailyRate × tenure) */
export function estimateMaturityValue(
  principal:       number,
  dailyReturnRate: number,
  tenureDays:      number
): { totalReturn: number; maturityValue: number } {
  const totalReturn  = principal * (dailyReturnRate / 100) * tenureDays;
  const maturityValue = principal + totalReturn;
  return { totalReturn, maturityValue };
}

// ─── Portfolio stats (computed client-side from full history) ─────────────────

export interface PortfolioStats {
  totalPortfolioValue:  number;
  totalInvested:        number;
  totalProfit:          number;
  totalReturnsPercent:  number;
  activeCount:          number;
  maturedCount:         number;
  cancelledCount:       number;
  withdrawnCount:       number;
  availableToWithdraw:  number;
  lockedAmount:         number;
  monthlyEarnings:      number;
  estimatedFutureValue: number;
  byPackage:            PackagePerformance[];
  monthlyTrend:         MonthlyTrendPoint[];
  growthSeries:         GrowthPoint[];
}

export interface PackagePerformance {
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
}

export interface MonthlyTrendPoint {
  month:    string; // "Jan 25"
  invested: number;
  returns:  number;
}

export interface GrowthPoint {
  date:  string; // ISO
  value: number;
}

export const MY_INVESTMENTS_ALL_KEY = ["invest", "my-investments", "all"] as const;

/** Fetches ALL user investments (up to 500) for full portfolio analytics */
export function useAllInvestments() {
  return useQuery<InvestmentHistoryResult>({
    queryKey: MY_INVESTMENTS_ALL_KEY,
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<InvestmentHistoryResult>>(
        `/invest?page=1&limit=500`
      );
      return res.data.data;
    },
    staleTime: 60_000,
    retry:     false,
  });
}

/** Derives rich portfolio stats from a flat list of InvestmentRecord */
export function derivePortfolioStats(investments: InvestmentRecord[]): PortfolioStats {
  let totalInvested        = 0;
  let totalProfit          = 0;
  let activeCount          = 0;
  let maturedCount         = 0;
  let cancelledCount       = 0;
  let withdrawnCount       = 0;
  let availableToWithdraw  = 0;
  let lockedAmount         = 0;
  let estimatedFutureValue = 0;

  const packageMap = new Map<string, PackagePerformance>();

  // Monthly bucket: key = "YYYY-MM"
  const monthlyBuckets = new Map<string, { invested: number; returns: number }>();

  for (const inv of investments) {
    const principal = inv.principalAmount;
    const profit    = inv.totalProfitEarned;
    const { totalReturn: estReturn } = estimateMaturityValue(
      principal, inv.dailyReturnRate, inv.tenureDays
    );

    totalInvested += principal;
    totalProfit   += profit;

    switch (inv.status) {
      case "ACTIVE":    activeCount++;    lockedAmount += principal; break;
      case "MATURED":   maturedCount++;   availableToWithdraw += principal + profit; break;
      case "CANCELLED": cancelledCount++; break;
      case "WITHDRAWN": withdrawnCount++; break;
    }

    if (inv.status === "ACTIVE") {
      estimatedFutureValue += principal + estReturn;
    } else if (inv.status === "MATURED") {
      estimatedFutureValue += principal + profit;
    }

    // Per-package aggregation
    const existing = packageMap.get(inv.packageId);
    if (existing) {
      existing.invested     += principal;
      existing.profit       += profit;
      existing.currentValue += principal + profit;
      existing.count        += 1;
    } else {
      packageMap.set(inv.packageId, {
        packageId:       inv.packageId,
        packageName:     inv.packageName,
        packageCode:     inv.packageCode,
        invested:        principal,
        currentValue:    principal + profit,
        profit,
        roi:             0,
        dailyReturnRate: inv.dailyReturnRate,
        tenureDays:      inv.tenureDays,
        count:           1,
        status:          inv.status,
      });
    }

    // Monthly trend
    const d    = new Date(inv.investedAt);
    const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const slot = monthlyBuckets.get(key) ?? { invested: 0, returns: 0 };
    slot.invested += principal;
    slot.returns  += profit;
    monthlyBuckets.set(key, slot);
  }

  // Compute ROI per package
  const byPackage = Array.from(packageMap.values()).map((p) => ({
    ...p,
    roi: p.invested > 0 ? parseFloat(((p.profit / p.invested) * 100).toFixed(2)) : 0,
  }));

  // Monthly trend — last 12 months sorted
  const monthlyTrend: MonthlyTrendPoint[] = Array.from(monthlyBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, val]) => {
      const [y, m] = key.split("-");
      const label  = new Date(Number(y), Number(m) - 1, 1)
        .toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      return { month: label, invested: val.invested, returns: val.returns };
    });

  // Growth series — cumulative portfolio value over time (by investment date)
  const sortedByDate = [...investments].sort(
    (a, b) => new Date(a.investedAt).getTime() - new Date(b.investedAt).getTime()
  );
  let cumulative = 0;
  const growthSeries: GrowthPoint[] = sortedByDate.map((inv) => {
    cumulative += inv.principalAmount + inv.totalProfitEarned;
    return { date: inv.investedAt, value: cumulative };
  });

  const totalReturnsPercent =
    totalInvested > 0
      ? parseFloat(((totalProfit / totalInvested) * 100).toFixed(2))
      : 0;

  // Approx monthly earnings: total profit / months since first investment
  const firstDate   = sortedByDate[0]?.investedAt;
  const monthsElapsed = firstDate
    ? Math.max(1, Math.ceil(
        (Date.now() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
      ))
    : 1;
  const monthlyEarnings = parseFloat((totalProfit / monthsElapsed).toFixed(2));

  return {
    totalPortfolioValue:  totalInvested + totalProfit,
    totalInvested,
    totalProfit,
    totalReturnsPercent,
    activeCount,
    maturedCount,
    cancelledCount,
    withdrawnCount,
    availableToWithdraw,
    lockedAmount,
    monthlyEarnings,
    estimatedFutureValue,
    byPackage,
    monthlyTrend,
    growthSeries,
  };
}
