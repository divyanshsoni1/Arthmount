/**
 * Client-side admin hooks — TanStack Query wrappers for all admin API calls.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";

// ─── Shared ───────────────────────────────────────────────────────────────────

interface ApiSuccess<T> { success: true; data: T }
export function extractError(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message ?? "Something went wrong.";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformStats {
  totalUsers: number; activeUsers: number; frozenUsers: number;
  newToday: number; newThisWeek: number; newThisMonth: number;
  kyc: { pending: number; inReview: number; approved: number; rejected: number };
  deposits: { total: number; totalCount: number; successful: number; successCount: number };
  withdrawals: { total: number; totalCount: number };
  investments: { activeAmount: number; activeCount: number };
  wallet: { totalMainBalance: number; totalInvestedBalance: number };
}

export interface ChartPoint { date: string; users?: number; amount?: number }

export interface AdminUser {
  id: string; name: string; email: string | null; phone: string | null;
  role: string; kycStatus: string; isFrozen: boolean;
  mainBalance: string; investedBalance: string; commissionBalance?: string;
  createdAt: string; lastLoginAt: string | null; deletedAt?: string | null;
}

export interface AdminKyc {
  id: string; status: string;
  panNumber: string | null; aadhaarNumber: string | null;
  panFrontUrl: string | null; panBackUrl: string | null;
  aadhaarFrontUrl: string | null; aadhaarBackUrl: string | null;
  selfieUrl: string | null;
  rejectionReason: string | null;
  createdAt: string; updatedAt: string;
  user: { id: string; name: string; email: string | null; phone: string | null; createdAt: string };
  reviewer?: { id: string; name: string } | null;
}

export interface AdminUserDetail extends AdminUser {
  kycDocument: AdminKyc | null;
  depositRequests: { id: string; amount: string; status: string; depositedAt: string | null }[];
  investments: { id: string; principalAmount: string; status: string; investedAt: string }[];
}

export interface AuditLog {
  id: string; action: string; resourceType: string; resourceId: string | null;
  title: string; description: string | null; status: string;
  createdAt: string; ipAddress: string | null;
  admin: { id: string; name: string } | null;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ stats: PlatformStats; growth: ChartPoint[]; deposits: ChartPoint[] }>>("/admin/stats");
      return r.data.data;
    },
    staleTime: 60_000, retry: false,
  });
}

// ─── KYC list ─────────────────────────────────────────────────────────────────

export function useAdminKycList(status: string, page: number, search?: string) {
  return useQuery({
    queryKey: ["admin", "kyc", status, page, search ?? ""],
    queryFn: async () => {
      const params = new URLSearchParams({ status, page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const r = await apiClient.get<ApiSuccess<{ records: AdminKyc[]; total: number; pages: number }>>(`/admin/kyc?${params}`);
      return r.data.data;
    },
    staleTime: 30_000, retry: false,
  });
}

export function useAdminKycDetail(id: string) {
  return useQuery({
    queryKey: ["admin", "kyc", "detail", id],
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ kyc: AdminKyc }>>(`/admin/kyc/${id}`);
      return r.data.data.kyc;
    },
    enabled: !!id, staleTime: 0, retry: false,
  });
}

export function useApproveKyc(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "kyc", "approve", id],
    mutationFn: async () => { await apiClient.patch(`/admin/kyc/${id}`, { action: "APPROVE" }); },
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["admin", "kyc"] }); },
  });
}

export function useRejectKyc(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "kyc", "reject", id],
    mutationFn: async (reason: string) => { await apiClient.patch(`/admin/kyc/${id}`, { action: "REJECT", rejectionReason: reason }); },
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["admin", "kyc"] }); },
  });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export function useAdminUserList(search: string, role: string, page: number, kycStatus?: string, frozen?: string) {
  return useQuery({
    queryKey: ["admin", "users", search, role, page, kycStatus ?? "", frozen ?? ""],
    queryFn: async () => {
      const params = new URLSearchParams({ search, role, page: String(page), limit: "20" });
      if (kycStatus && kycStatus !== "ALL") params.set("kycStatus", kycStatus);
      if (frozen && frozen !== "ALL") params.set("frozen", frozen);
      const r = await apiClient.get<ApiSuccess<{ users: AdminUser[]; total: number; pages: number }>>(
        `/admin/users?${params}`
      );
      return r.data.data;
    },
    staleTime: 30_000, retry: false,
  });
}

export function useAdminUserDetail(id: string) {
  return useQuery({
    queryKey: ["admin", "users", "detail", id],
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ user: AdminUserDetail }>>(`/admin/users/${id}`);
      return r.data.data.user;
    },
    enabled: !!id, staleTime: 0, retry: false,
  });
}

export function useFreezeUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "freeze", id],
    mutationFn: async (freeze: boolean) => { await apiClient.post(`/admin/users/${id}/freeze`, { freeze }); },
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

// ─── Refresh signed URL (client-side helper) ─────────────────────────────────

/**
 * Fetches a fresh signed URL for a given object key from the admin signed-url endpoint.
 * Called client-side when a document fails to load (expired URL).
 */
export async function fetchSignedUrl(key: string): Promise<string> {
  const r = await apiClient.get<ApiSuccess<{ url: string }>>(`/admin/kyc/signed-url?key=${encodeURIComponent(key)}`);
  return r.data.data.url;
}

// ─── Analytics (premium dashboard) ───────────────────────────────────────────

export type AnalyticsRange = "today" | "week" | "15days" | "month" | "3months" | "6months" | "year";

export interface AnalyticsKpis {
  totalPortfolio:   number;
  activeCapital:    number;
  walletLiquidity:  number;
  investedBalance:  number;
  todayProfit:      number;
  depositsCurrent:  number;
  portfolioChange:  number;
  capitalChange:    number;
  profitChange:     number;
  todayProfitChange: number;
}

export interface CapitalHealthPoint { date: string; invested: number; withdrawn: number }
export interface PackageCapital     { package: string; amount: number; count: number }
export interface PackageProfit      { package: string; profit: number; count: number }

export interface ActivityItem {
  id:        string;
  type:      "investment" | "deposit" | "withdrawal" | "audit";
  userName:  string;
  action:    string;
  amount:    number | null;
  timestamp: string;
  status:    "success" | "pending" | "info";
  meta?:     string;
}

export interface AnalyticsPayload {
  kpis:             AnalyticsKpis;
  capitalHealth:    CapitalHealthPoint[];
  capitalByPackage: PackageCapital[];
  profitByPackage:  PackageProfit[];
  liveActivity:     ActivityItem[];
}

export function useAdminAnalytics(range: AnalyticsRange) {
  return useQuery({
    queryKey: ["admin", "analytics", range],
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<AnalyticsPayload>>(`/admin/analytics?range=${range}`);
      return r.data.data;
    },
    staleTime: 30_000,
    retry: false,
    refetchInterval: 60_000,
  });
}

// ─── Audit logs ───────────────────────────────────────────────────────────────

export function useAuditLogs(page: number) {
  return useQuery({
    queryKey: ["admin", "audit-logs", page],
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ logs: AuditLog[]; total: number; pages: number }>>(`/admin/audit-logs?page=${page}&limit=30`);
      return r.data.data;
    },
    staleTime: 30_000, retry: false,
  });
}
