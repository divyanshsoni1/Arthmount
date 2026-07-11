/**
 * Client-side wallet hooks built on TanStack Query.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletBalance {
  mainBalance:       string;
  investedBalance:   string;
  commissionBalance: string;
}

export type DepositStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "REJECTED" | "CANCELLED";

export interface DepositRecord {
  id:                   string;
  userId:               string;
  amount:               string;
  method:               string;
  status:               DepositStatus;
  gatewayOrderId:       string | null;
  gatewayPaymentId:     string | null;
  gatewayTransactionId: string | null;
  transactionReference: string;
  rejectionReason:      string | null;
  remarks:              string | null;
  depositedAt:          string;
  createdAt:            string;
  updatedAt:            string;
}

export interface HistoryResult {
  records: DepositRecord[];
  total:   number;
  page:    number;
  pages:   number;
}

export interface CreateOrderResult {
  depositId: string;
  orderId:   string;
  amount:    number;
  currency:  string;
  keyId:     string;
}

export interface VerifyPaymentResult {
  depositId:  string;
  amount:     number;
  newBalance: string;
}

interface ApiSuccess<T> { success: true; data: T }

// ─── Query keys ───────────────────────────────────────────────────────────────

export const WALLET_BALANCE_KEY = ["wallet", "balance"] as const;
export const WALLET_HISTORY_KEY = (page: number) => ["wallet", "history", page] as const;

// ─── useWalletBalance ─────────────────────────────────────────────────────────

export function useWalletBalance() {
  return useQuery<WalletBalance>({
    queryKey: WALLET_BALANCE_KEY,
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<WalletBalance>>("/wallet");
      return res.data.data;
    },
    staleTime: 30_000,
    retry:     false,
  });
}

// ─── useWalletHistory ─────────────────────────────────────────────────────────

export function useWalletHistory(page = 1) {
  return useQuery<HistoryResult>({
    queryKey: WALLET_HISTORY_KEY(page),
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<HistoryResult>>(
        `/wallet/history?page=${page}&limit=20`
      );
      return res.data.data;
    },
    staleTime: 30_000,
    retry:     false,
  });
}

// ─── useCreateOrder ───────────────────────────────────────────────────────────

export function useCreateOrder() {
  return useMutation({
    mutationKey: ["wallet", "createOrder"],
    mutationFn:  async (amount: number) => {
      const res = await apiClient.post<ApiSuccess<CreateOrderResult>>(
        "/wallet/create-order",
        { amount }
      );
      return res.data.data;
    },
  });
}

// ─── useVerifyPayment ─────────────────────────────────────────────────────────

export interface VerifyPayload {
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["wallet", "verifyPayment"],
    mutationFn:  async (payload: VerifyPayload) => {
      const res = await apiClient.post<ApiSuccess<VerifyPaymentResult>>(
        "/wallet/verify-payment",
        payload
      );
      return res.data.data;
    },
    onSuccess: () => {
      // Invalidate so balance card and history table both refresh
      qc.invalidateQueries({ queryKey: WALLET_BALANCE_KEY });
      qc.invalidateQueries({ queryKey: ["wallet", "history"] });
    },
  });
}

// ─── Error helper ─────────────────────────────────────────────────────────────

export function extractWalletError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const d = (error.response as { data: { error?: { message?: string } } }).data;
    if (d?.error?.message) return d.error.message;
  }
  return "Something went wrong. Please try again.";
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatINR(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-IN", {
    style:                 "currency",
    currency:              "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
