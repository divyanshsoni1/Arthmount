import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";

interface ApiSuccess<T> { success: true; data: T }

export interface DashboardUser {
  id: string; name: string; email: string | null; phone: string | null;
  mainBalance: string; investedBalance: string; commissionBalance: string;
  kycStatus: string; createdAt: string; lastLoginAt: string | null;
}

export interface PortfolioSummary {
  user:                 DashboardUser;
  portfolioValue:       number;
  walletBalance:        number;
  investedBalance:      number;
  totalInvested:        number;
  totalProfit:          number;
  todayProfit:          number;
  monthProfit:          number;
  yearProfit:           number;
  roi:                  string;
  activeInvestments:    number;
  completedInvestments: number;
  totalInvestments:     number;
  pendingWithdrawals:   number;
  recentDeposits: {
    id: string; amount: number; depositedAt: string; status: string; method: string;
  }[];
}

export interface ProfitChartPoint { date: string; profit: number }

export interface ActivityEntry {
  id: string; transactionType: string; entryType: string;
  amount: number; description: string; createdAt: string;
}

export interface Investment {
  id: string; packageName: string; packageCode: string;
  dailyReturnRate: number; principalAmount: number;
  totalProfitEarned: number; pendingProfit: number;
  status: string; investedAt: string; maturityDate: string;
  completedDays: number; tenureDays: number;
}

export const DASHBOARD_KEY  = ["dashboard", "summary"] as const;
export const INVESTMENTS_KEY = (page: number) => ["dashboard", "investments", page] as const;

export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{
        summary:  PortfolioSummary;
        chart:    ProfitChartPoint[];
        activity: ActivityEntry[];
      }>>("/dashboard");
      return r.data.data;
    },
    staleTime: 60_000, retry: false,
  });
}

export function useInvestments(page = 1) {
  return useQuery({
    queryKey: INVESTMENTS_KEY(page),
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{
        investments: Investment[]; total: number; pages: number;
      }>>(`/dashboard/investments?page=${page}&limit=10`);
      return r.data.data;
    },
    staleTime: 60_000, retry: false,
  });
}

export function fmtINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(2)}K`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
