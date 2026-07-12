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
  mainBalance: string; investedBalance: string;
  createdAt: string; lastLoginAt: string | null;
}

export interface AdminKyc {
  id: string; status: string;
  panNumber: string | null; aadhaarNumber: string | null;
  panFrontUrl: string | null; aadhaarFrontUrl: string | null;
  aadhaarBackUrl: string | null; selfieUrl: string | null;
  rejectionReason: string | null;
  createdAt: string; updatedAt: string;
  user: { id: string; name: string; email: string | null; phone: string | null; createdAt: string };
  reviewer?: { id: string; name: string } | null;
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

export function useAdminKycList(status: string, page: number) {
  return useQuery({
    queryKey: ["admin", "kyc", status, page],
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ records: AdminKyc[]; total: number; pages: number }>>(`/admin/kyc?status=${status}&page=${page}&limit=20`);
      return r.data.data;
    },
    staleTime: 30_000, retry: false,
  });
}

export function useAdminKycDetail(id: string) {
  return useQuery({
    queryKey: ["admin", "kyc", id],
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

export function useAdminUserList(search: string, role: string, page: number) {
  return useQuery({
    queryKey: ["admin", "users", search, role, page],
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ users: AdminUser[]; total: number; pages: number }>>(
        `/admin/users?search=${encodeURIComponent(search)}&role=${role}&page=${page}&limit=20`
      );
      return r.data.data;
    },
    staleTime: 30_000, retry: false,
  });
}

export function useAdminUserDetail(id: string) {
  return useQuery({
    queryKey: ["admin", "users", id],
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ user: AdminUser & { kycDocument: AdminKyc | null; depositRequests: unknown[]; investments: unknown[] } }>>(`/admin/users/${id}`);
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
