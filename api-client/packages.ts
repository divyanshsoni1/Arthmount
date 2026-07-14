/**
 * Client-side packages hooks — TanStack Query wrappers for the admin packages API.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";

// ─── Shared ───────────────────────────────────────────────────────────────────

interface ApiSuccess<T> { success: true; data: T }

export function extractPackageError(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message ?? "Something went wrong.";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminPackage {
  id:              string;
  name:            string;
  code:            string;
  description:     string | null;
  minAmount:       number;
  maxAmount:       number;
  dailyReturnRate: number;
  tenureDays:      number;
  isActive:        boolean;
  isVisible:       boolean;
  displayOrder:    number;
  createdAt:       string;
  updatedAt:       string;
  totalInvestors:  number;
  activeInvestors: number;
  totalInvested:   number;
}

export interface AdminPackageDetail extends AdminPackage {
  activeInvestments: number;
  totalProfitPaid:   number;
  pendingProfit:     number;
  avgInvestment:     number;
  todayInvestment:   number;
  todayInvestors:    number;
}

export type PackageSortBy =
  | "latest" | "oldest"
  | "highestInvestment" | "lowestInvestment"
  | "mostInvestors" | "leastInvestors";

export type PackageStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface CapitalGrowthPoint    { date: string; amount: number; count: number }
export interface ProfitDistribItem     { name: string; value: number; color: string }
export interface InvestorGrowthPoint   { date: string; count: number }
export interface InvestmentDistribItem { range: string; count: number }

export interface PackageAnalytics {
  capitalGrowth:            CapitalGrowthPoint[];
  profitDistribution:       ProfitDistribItem[];
  investorGrowth:           InvestorGrowthPoint[];
  investmentDistribution:   InvestmentDistribItem[];
}

// ─── Top investors ────────────────────────────────────────────────────────────

export interface TopInvestor {
  userId:          string;
  name:            string;
  email:           string | null;
  joinDate:        string | null;
  totalInvested:   number;
  totalProfit:     number;
  investmentCount: number;
  growthPct:       number;
}

// ─── Investments table ────────────────────────────────────────────────────────

export interface PackageInvestmentRow {
  id:              string;
  userId:          string;
  userName:        string;
  userEmail:       string | null;
  amount:          number;
  dailyReturnRate: number;
  tenureDays:      number;
  completedDays:   number;
  remainingDays:   number;
  totalProfit:     number;
  paidProfit:      number;
  pendingProfit:   number;
  investedAt:      string;
  maturityDate:    string;
  status:          string;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface PackageActivityItem {
  id:        string;
  type:      string;
  title:     string;
  amount:    number | null;
  userName:  string;
  timestamp: string;
  status:    string;
}

// ─── Create / Update payload ──────────────────────────────────────────────────

export interface CreatePackagePayload {
  name:            string;
  description?:    string;
  minAmount:       number;
  maxAmount:       number;
  dailyReturnRate: number;
  tenureDays:      number;
  isActive:        boolean;
}

export type UpdatePackagePayload = Partial<CreatePackagePayload & { isVisible: boolean }>;

// ─── Hooks: list ─────────────────────────────────────────────────────────────

export function useAdminPackages(opts: {
  search:  string;
  status:  PackageStatusFilter;
  sortBy:  PackageSortBy;
  page:    number;
}) {
  const { search, status, sortBy, page } = opts;
  return useQuery({
    queryKey: ["admin", "packages", search, status, sortBy, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        search, status, sortBy, page: String(page), limit: "20",
      });
      const r = await apiClient.get<ApiSuccess<{
        packages: AdminPackage[]; total: number; pages: number;
      }>>(`/admin/packages?${params}`);
      return r.data.data;
    },
    staleTime: 30_000,
    retry: false,
  });
}

// ─── Hooks: single ────────────────────────────────────────────────────────────

export function useAdminPackage(id: string) {
  return useQuery({
    queryKey: ["admin", "packages", "detail", id],
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ package: AdminPackageDetail }>>(
        `/admin/packages/${id}`
      );
      return r.data.data.package;
    },
    enabled: !!id,
    staleTime: 0,
    retry: false,
  });
}

// ─── Hooks: analytics ────────────────────────────────────────────────────────

export function usePackageAnalytics(id: string, days: number) {
  return useQuery({
    queryKey: ["admin", "packages", "analytics", id, days],
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<PackageAnalytics>>(
        `/admin/packages/${id}/analytics?days=${days}`
      );
      return r.data.data;
    },
    enabled: !!id,
    staleTime: 60_000,
    retry: false,
    refetchInterval: 120_000,
  });
}

// ─── Hooks: top investors ────────────────────────────────────────────────────

export function useTopInvestors(id: string) {
  return useQuery({
    queryKey: ["admin", "packages", "investors", id],
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ investors: TopInvestor[] }>>(
        `/admin/packages/${id}/investors?limit=10`
      );
      return r.data.data.investors;
    },
    enabled: !!id,
    staleTime: 60_000,
    retry: false,
  });
}

// ─── Hooks: investments table ────────────────────────────────────────────────

export function usePackageInvestments(id: string, opts: {
  page:   number;
  search: string;
  status: string;
  sortBy: string;
}) {
  const { page, search, status, sortBy } = opts;
  return useQuery({
    queryKey: ["admin", "packages", "investments", id, page, search, status, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page), limit: "15", search, status, sortBy,
      });
      const r = await apiClient.get<ApiSuccess<{
        investments: PackageInvestmentRow[]; total: number; pages: number;
      }>>(`/admin/packages/${id}/investments?${params}`);
      return r.data.data;
    },
    enabled: !!id,
    staleTime: 30_000,
    retry: false,
  });
}

// ─── Hooks: activity ─────────────────────────────────────────────────────────

export function usePackageActivity(id: string) {
  return useQuery({
    queryKey: ["admin", "packages", "activity", id],
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ activity: PackageActivityItem[] }>>(
        `/admin/packages/${id}/activity?limit=40`
      );
      return r.data.data.activity;
    },
    enabled: !!id,
    staleTime: 30_000,
    retry: false,
    refetchInterval: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePackagePayload) => {
      const r = await apiClient.post<ApiSuccess<{ package: AdminPackage }>>(
        "/admin/packages", payload
      );
      return r.data.data.package;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "packages"] }); },
  });
}

export function useUpdatePackage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdatePackagePayload) => {
      const r = await apiClient.patch<ApiSuccess<{ package: AdminPackage }>>(
        `/admin/packages/${id}`, payload
      );
      return r.data.data.package;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "packages"] });
      qc.invalidateQueries({ queryKey: ["admin", "packages", "detail", id] });
    },
  });
}

export function useDeletePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/packages/${id}`);
      return id;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "packages"] }); },
  });
}

export function useTogglePackage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (isActive: boolean) => {
      const r = await apiClient.patch<ApiSuccess<{ package: AdminPackage }>>(
        `/admin/packages/${id}/toggle`, { isActive }
      );
      return r.data.data.package;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "packages"] });
      qc.invalidateQueries({ queryKey: ["admin", "packages", "detail", id] });
    },
  });
}
