/**
 * Client-side withdrawal hooks — TanStack Query wrappers.
 * Follows the exact same patterns as api-client/wallet.ts and api-client/invest.ts.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";
import { WALLET_BALANCE_KEY } from "@/api-client/wallet";
import { DASHBOARD_KEY }      from "@/api-client/dashboard";

// ─── Shared ───────────────────────────────────────────────────────────────────

interface ApiSuccess<T> { success: true; data: T }

export function extractWithdrawError(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message ?? "Something went wrong. Please try again.";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type WithdrawalStatus =
  | "PENDING" | "APPROVED" | "PROCESSING"
  | "COMPLETED" | "REJECTED" | "FAILED" | "CANCELLED";

export type WithdrawalMethod = "BANK" | "UPI";
export type WithdrawalSource = "WALLET" | "INVESTMENT";

export interface MaturedInvestment {
  id:                string;
  packageId:         string;
  packageName:       string;
  packageCode:       string;
  principalAmount:   number;
  totalProfitEarned: number;
  pendingProfit:     number;
  dailyReturnRate:   number;
  tenureDays:        number;
  completedDays:     number;
  investedAt:        string;
  maturityDate:      string;
  status:            string;
}

export interface WithdrawSummary {
  walletBalance:      number;
  investedBalance:    number;
  maturedAmount:      number;
  maturedCount:       number;
  lockedAmount:       number;
  lockedCount:        number;
  totalWithdrawable:  number;
  pendingCount:       number;
  pendingAmount:      number;
  lifetimeAmount:     number;
  lifetimeCount:      number;
  maturedInvestments: MaturedInvestment[];
}

export interface WithdrawalRecord {
  id:                   string;
  userId:               string;
  amount:               string;
  fee:                  string;
  tax:                  string;
  netAmount:            string;
  method:               WithdrawalMethod;
  accountHolderName:    string | null;
  bankName:             string | null;
  accountNumber:        string | null;
  ifscCode:             string | null;
  upiId:                string | null;
  transactionReference: string | null;
  status:               WithdrawalStatus;
  rejectionReason:      string | null;
  approvedById:         string | null;
  requestedAt:          string;
  approvedAt:           string | null;
  processedAt:          string | null;
  remarks:              string | null;
  createdAt:            string;
  updatedAt:            string;
}

export interface WithdrawalHistoryResult {
  records: WithdrawalRecord[];
  total:   number;
  page:    number;
  pages:   number;
}

export interface FeePreview {
  amount:          number;
  fee:             number;
  tax:             number;
  netAmount:       number;
  processingTime:  string;
}

// Payout payload types
export interface BankPayoutPayload {
  method:            "BANK";
  accountHolderName: string;
  bankName:          string;
  accountNumber:     string;
  ifscCode:          string;
}

export interface UpiPayoutPayload {
  method: "UPI";
  upiId:  string;
}

export type PayoutPayload = BankPayoutPayload | UpiPayoutPayload;

export interface RequestWithdrawalPayload {
  source:        WithdrawalSource;
  investmentId?: string;
  amount:        number;
  payout:        PayoutPayload;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const WITHDRAW_SUMMARY_KEY = ["withdraw", "summary"]                    as const;
export const WITHDRAW_HISTORY_KEY = (page: number, status?: string) =>
  ["withdraw", "history", page, status ?? "all"]                               as const;
export const WITHDRAW_DETAIL_KEY  = (id: string) => ["withdraw", "detail", id] as const;
export const WITHDRAW_FEES_KEY    = (amount: number) => ["withdraw", "fees", amount] as const;

// ─── useWithdrawSummary ───────────────────────────────────────────────────────

export function useWithdrawSummary() {
  return useQuery<WithdrawSummary>({
    queryKey: WITHDRAW_SUMMARY_KEY,
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<WithdrawSummary>>("/withdraw");
      return res.data.data;
    },
    staleTime: 30_000,
    retry:     false,
  });
}

// ─── useWithdrawalHistory ─────────────────────────────────────────────────────

export function useWithdrawalHistory(page = 1, status?: string) {
  return useQuery<WithdrawalHistoryResult>({
    queryKey: WITHDRAW_HISTORY_KEY(page, status),
    queryFn:  async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status && status !== "all") params.set("status", status);
      const res = await apiClient.get<ApiSuccess<WithdrawalHistoryResult>>(
        `/withdraw/history?${params.toString()}`
      );
      return res.data.data;
    },
    staleTime: 30_000,
    retry:     false,
  });
}

// ─── useWithdrawalDetail ──────────────────────────────────────────────────────

export function useWithdrawalDetail(id: string) {
  return useQuery<WithdrawalRecord>({
    queryKey: WITHDRAW_DETAIL_KEY(id),
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<{ withdrawal: WithdrawalRecord }>>(
        `/withdraw/${id}`
      );
      return res.data.data.withdrawal;
    },
    enabled:   !!id,
    staleTime: 30_000,
    retry:     false,
  });
}

// ─── useWithdrawFees ──────────────────────────────────────────────────────────

export function useWithdrawFees(amount: number) {
  return useQuery<FeePreview>({
    queryKey: WITHDRAW_FEES_KEY(amount),
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<FeePreview>>(
        `/withdraw/fees?amount=${amount}`
      );
      return res.data.data;
    },
    enabled:   amount > 0,
    staleTime: 60_000,
    retry:     false,
  });
}

// ─── useRequestWithdrawal ─────────────────────────────────────────────────────

export function useRequestWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["withdraw", "request"],
    mutationFn:  async (payload: RequestWithdrawalPayload) => {
      const res = await apiClient.post<ApiSuccess<{ withdrawal: WithdrawalRecord }>>(
        "/withdraw",
        payload
      );
      return res.data.data.withdrawal;
    },
    onSuccess: () => {
      // Invalidate everything that shows balance or withdrawal state
      qc.invalidateQueries({ queryKey: WITHDRAW_SUMMARY_KEY });
      qc.invalidateQueries({ queryKey: ["withdraw", "history"] });
      qc.invalidateQueries({ queryKey: WALLET_BALANCE_KEY });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
    },
  });
}

// ─── useCancelWithdrawal ──────────────────────────────────────────────────────

export function useCancelWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["withdraw", "cancel"],
    mutationFn:  async (id: string) => {
      const res = await apiClient.post<ApiSuccess<{ withdrawal: WithdrawalRecord }>>(
        `/withdraw/${id}/cancel`,
        {}
      );
      return res.data.data.withdrawal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WITHDRAW_SUMMARY_KEY });
      qc.invalidateQueries({ queryKey: ["withdraw", "history"] });
      qc.invalidateQueries({ queryKey: WALLET_BALANCE_KEY });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
    },
  });
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function fmtWithdrawINR(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-IN", {
    style:                 "currency",
    currency:              "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
}

export function fmtWithdrawDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function fmtWithdrawDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Status config ────────────────────────────────────────────────────────────

export interface StatusConfig {
  label:     string;
  cls:       string;      // Tailwind badge classes
  dotColor:  string;      // dot bg
}

export const WITHDRAWAL_STATUS_CONFIG: Record<WithdrawalStatus, StatusConfig> = {
  PENDING:    { label: "Pending",    cls: "bg-amber-100 text-amber-700",   dotColor: "bg-amber-400"   },
  APPROVED:   { label: "Approved",   cls: "bg-blue-100 text-blue-700",     dotColor: "bg-blue-400"    },
  PROCESSING: { label: "Processing", cls: "bg-violet-100 text-violet-700", dotColor: "bg-violet-400"  },
  COMPLETED:  { label: "Completed",  cls: "bg-emerald-100 text-emerald-700", dotColor: "bg-emerald-500" },
  REJECTED:   { label: "Rejected",   cls: "bg-red-100 text-red-700",       dotColor: "bg-red-400"     },
  FAILED:     { label: "Failed",     cls: "bg-red-100 text-red-600",       dotColor: "bg-red-400"     },
  CANCELLED:  { label: "Cancelled",  cls: "bg-slate-100 text-slate-500",   dotColor: "bg-slate-400"   },
};
