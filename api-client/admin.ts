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

// ─── Admin Withdrawal Management ──────────────────────────────────────────────

export type AdminWithdrawalStatus =
  | "PENDING" | "APPROVED" | "PROCESSING"
  | "COMPLETED" | "REJECTED" | "FAILED" | "CANCELLED";

export type AdminWithdrawalMethod = "BANK" | "UPI";

export interface AdminWithdrawalUser {
  id:          string;
  name:        string;
  email:       string | null;
  phone:       string | null;
  kycStatus:   string;
  isFrozen:    boolean;
  mainBalance: string;
  createdAt:   string;
}

export interface AdminWithdrawalRow {
  id:                   string;
  userId:               string;
  amount:               string;
  fee:                  string;
  tax:                  string;
  netAmount:            string;
  method:               AdminWithdrawalMethod;
  accountHolderName:    string | null;
  bankName:             string | null;
  accountNumber:        string | null;
  ifscCode:             string | null;
  upiId:                string | null;
  transactionReference: string | null;
  status:               AdminWithdrawalStatus;
  rejectionReason:      string | null;
  approvedById:         string | null;
  requestedAt:          string;
  approvedAt:           string | null;
  processedAt:          string | null;
  remarks:              string | null;
  createdAt:            string;
  updatedAt:            string;
  user:                 AdminWithdrawalUser;
  approvedBy:           { id: string; name: string } | null;
}

export interface AdminWithdrawalListResult {
  records: AdminWithdrawalRow[];
  total:   number;
  page:    number;
  pages:   number;
}

export interface AdminWithdrawalStats {
  total:      number;
  pending:    { count: number; amount: number };
  processing: { count: number; amount: number };
  completed:  { count: number; amount: number };
  rejected:   { count: number; amount: number };
  cancelled:  { count: number; amount: number };
  failed:     { count: number; amount: number };
  totalAmount: number;
  todayCount:  number;
  todayAmount: number;
  monthCount:  number;
  monthAmount: number;
}

export interface AdminWithdrawalListParams {
  page?:       number;
  limit?:      number;
  status?:     string;
  method?:     string;
  search?:     string;
  dateFrom?:   string;
  dateTo?:     string;
  minAmount?:  number;
  maxAmount?:  number;
  order?:      "asc" | "desc";
}

// ── Query keys ─────────────────────────────────────────────────────────────────
export const ADMIN_WITHDRAWALS_KEY  = (params: AdminWithdrawalListParams) =>
  ["admin", "withdrawals", "list", params] as const;
export const ADMIN_WITHDRAWAL_STATS_KEY = ["admin", "withdrawals", "stats"] as const;
export const ADMIN_WITHDRAWAL_DETAIL_KEY = (id: string) =>
  ["admin", "withdrawals", "detail", id] as const;

// ── useAdminWithdrawalStats ────────────────────────────────────────────────────
export function useAdminWithdrawalStats() {
  return useQuery<AdminWithdrawalStats>({
    queryKey: ADMIN_WITHDRAWAL_STATS_KEY,
    queryFn:  async () => {
      const r = await apiClient.get<ApiSuccess<AdminWithdrawalStats>>(
        "/admin/withdrawals/stats"
      );
      return r.data.data;
    },
    staleTime: 30_000,
    retry: false,
    refetchInterval: 60_000,
  });
}

// ── useAdminWithdrawals ────────────────────────────────────────────────────────
export function useAdminWithdrawals(params: AdminWithdrawalListParams = {}) {
  return useQuery<AdminWithdrawalListResult>({
    queryKey: ADMIN_WITHDRAWALS_KEY(params),
    queryFn:  async () => {
      const p = new URLSearchParams();
      if (params.page)      p.set("page",      String(params.page));
      if (params.limit)     p.set("limit",     String(params.limit));
      if (params.status && params.status !== "ALL") p.set("status", params.status);
      if (params.method && params.method !== "ALL") p.set("method", params.method);
      if (params.search)    p.set("search",    params.search);
      if (params.dateFrom)  p.set("dateFrom",  params.dateFrom);
      if (params.dateTo)    p.set("dateTo",    params.dateTo);
      if (params.minAmount !== undefined) p.set("minAmount", String(params.minAmount));
      if (params.maxAmount !== undefined) p.set("maxAmount", String(params.maxAmount));
      if (params.order)     p.set("order",     params.order);
      const r = await apiClient.get<ApiSuccess<AdminWithdrawalListResult>>(
        `/admin/withdrawals?${p.toString()}`
      );
      return r.data.data;
    },
    staleTime: 20_000,
    retry: false,
  });
}

// ── useAdminWithdrawalDetail ───────────────────────────────────────────────────
export function useAdminWithdrawalDetail(id: string) {
  return useQuery<AdminWithdrawalRow>({
    queryKey: ADMIN_WITHDRAWAL_DETAIL_KEY(id),
    queryFn:  async () => {
      const r = await apiClient.get<ApiSuccess<{ withdrawal: AdminWithdrawalRow }>>(
        `/admin/withdrawals/${id}`
      );
      return r.data.data.withdrawal;
    },
    enabled:   !!id,
    staleTime: 0,
    retry: false,
  });
}

// ── useAdminWithdrawalAction ───────────────────────────────────────────────────
export type WithdrawalAction = "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED";

export function useAdminWithdrawalAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["admin", "withdrawals", "action"],
    mutationFn:  async ({
      id, action, rejectionReason,
    }: {
      id:               string;
      action:           WithdrawalAction;
      rejectionReason?: string;
    }) => {
      const r = await apiClient.patch<ApiSuccess<{ withdrawal: AdminWithdrawalRow }>>(
        `/admin/withdrawals/${id}`,
        { action, rejectionReason }
      );
      return r.data.data.withdrawal;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ADMIN_WITHDRAWAL_STATS_KEY });
      qc.invalidateQueries({ queryKey: ["admin", "withdrawals", "list"] });
      qc.invalidateQueries({ queryKey: ADMIN_WITHDRAWAL_DETAIL_KEY(id) });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
