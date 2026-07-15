/**
 * Client-side transaction hooks — TanStack Query wrappers for /api/transactions.
 * Follows the exact same patterns as api-client/wallet.ts and api-client/withdraw.ts.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";

// ─── Shared ───────────────────────────────────────────────────────────────────

interface ApiSuccess<T> { success: true; data: T }

export function extractTxnError(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message ?? "Something went wrong. Please try again.";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type TxnType =
  | "DEPOSIT" | "WITHDRAWAL" | "INVESTMENT" | "PROFIT"
  | "COMMISSION" | "BONUS" | "REFUND" | "PENALTY" | "ADJUSTMENT" | "TRANSFER";

export type TxnEntryType = "CREDIT" | "DEBIT";

export interface DepositDetail {
  id:                   string;
  amount:               number;
  method:               string;
  status:               string;
  transactionReference: string;
  gatewayOrderId:       string | null;
  gatewayPaymentId:     string | null;
  gatewayTransactionId: string | null;
  rejectionReason:      string | null;
  depositedAt:          string;
}

export interface WithdrawalDetail {
  id:                   string;
  amount:               number;
  fee:                  number;
  tax:                  number;
  netAmount:            number;
  method:               string;
  status:               string;
  accountHolderName:    string | null;
  bankName:             string | null;
  accountNumberMasked:  string | null;
  ifscCode:             string | null;
  upiIdMasked:          string | null;
  transactionReference: string | null;
  rejectionReason:      string | null;
  requestedAt:          string;
  approvedAt:           string | null;
  processedAt:          string | null;
}

export interface InvestmentDetail {
  id:                string;
  packageId:         string;
  packageName:       string;
  packageCode:       string;
  principalAmount:   number;
  dailyReturnRate:   number;
  tenureDays:        number;
  completedDays:     number;
  totalProfitEarned: number;
  status:            string;
  investedAt:        string;
  maturityDate:      string;
}

export interface TransactionRecord {
  id:                    string;
  transactionType:       TxnType;
  entryType:             TxnEntryType;
  amount:                number;
  balanceBefore:         number;
  balanceAfter:          number;
  referenceId:           string | null;
  referenceType:         string;
  externalTransactionId: string | null;
  description:           string;
  metadata:              Record<string, unknown> | null;
  createdAt:             string;
  deposit:               DepositDetail    | null;
  withdrawal:            WithdrawalDetail | null;
  investment:            InvestmentDetail | null;
}

export interface TransactionListResult {
  records: TransactionRecord[];
  total:   number;
  page:    number;
  pages:   number;
}

export interface TransactionSummary {
  totalTransactions:   number;
  totalDeposited:      number;
  totalWithdrawn:      number;
  totalInvested:       number;
  totalProfitCredited: number;
  totalBonus:          number;
  totalRefunds:        number;
  walletBalance:       number;
  investedBalance:     number;
  commissionBalance:   number;
}

// ─── Filter params (mirrors server ListInput) ─────────────────────────────────

export interface TxnFilters {
  search?:    string;
  types?:     TxnType[];
  entryType?: TxnEntryType;
  from?:      string;
  to?:        string;
  amountMin?: number;
  amountMax?: number;
  sort?:      "asc" | "desc";
  page?:      number;
  limit?:     number;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const TXN_SUMMARY_KEY = ["transactions", "summary"] as const;

export function txnListKey(filters: TxnFilters) {
  return ["transactions", "list", filters] as const;
}

// ─── useTransactionSummary ────────────────────────────────────────────────────

export function useTransactionSummary() {
  return useQuery<TransactionSummary>({
    queryKey: TXN_SUMMARY_KEY,
    queryFn:  async () => {
      const res = await apiClient.get<ApiSuccess<TransactionSummary>>(
        "/transactions/summary"
      );
      return res.data.data;
    },
    staleTime: 60_000,
    retry:     false,
  });
}

// ─── useTransactionList ───────────────────────────────────────────────────────

export function useTransactionList(filters: TxnFilters) {
  return useQuery<TransactionListResult>({
    queryKey: txnListKey(filters),
    queryFn:  async () => {
      const params = buildParams(filters);
      const res    = await apiClient.get<ApiSuccess<TransactionListResult>>(
        `/transactions?${params.toString()}`
      );
      return res.data.data;
    },
    staleTime:     30_000,
    retry:         false,
    placeholderData: (prev) => prev,   // keeps previous page visible during refetch
  });
}

// ─── invalidateTransactions (call after any mutation that affects ledger) ─────

export function useInvalidateTransactions() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["transactions"] });
  };
}

// ─── Param builder ────────────────────────────────────────────────────────────

function buildParams(f: TxnFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search)              p.set("search",    f.search);
  if (f.types?.length)       p.set("types",     f.types.join(","));
  if (f.entryType)           p.set("entryType", f.entryType);
  if (f.from)                p.set("from",      f.from);
  if (f.to)                  p.set("to",        f.to);
  if (f.amountMin != null)   p.set("amountMin", String(f.amountMin));
  if (f.amountMax != null)   p.set("amountMax", String(f.amountMax));
  if (f.sort)                p.set("sort",      f.sort);
  if (f.page  != null)       p.set("page",      String(f.page));
  if (f.limit != null)       p.set("limit",     String(f.limit));
  return p;
}

// ─── CSV export (client-side, no server round-trip needed) ────────────────────

export async function fetchAllForExport(filters: Omit<TxnFilters, "page" | "limit">): Promise<TransactionRecord[]> {
  const params = buildParams({ ...filters, page: 1, limit: 100 });
  const res    = await apiClient.get<ApiSuccess<TransactionListResult>>(
    `/transactions?${params.toString()}`
  );
  const first  = res.data.data;
  if (first.pages <= 1) return first.records;

  // Fetch remaining pages in parallel
  const rest = await Promise.all(
    Array.from({ length: first.pages - 1 }, (_, i) => i + 2).map(async (pg) => {
      const p2 = buildParams({ ...filters, page: pg, limit: 100 });
      const r  = await apiClient.get<ApiSuccess<TransactionListResult>>(
        `/transactions?${p2.toString()}`
      );
      return r.data.data.records;
    })
  );

  return [first.records, ...rest].flat();
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function fmtTxnINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style:                 "currency",
    currency:              "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(isNaN(value) ? 0 : value);
}

export function fmtTxnDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function fmtTxnDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function fmtTxnDateTimeSecond(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// ─── Transaction type label map ───────────────────────────────────────────────

export const TXN_TYPE_LABELS: Record<TxnType, string> = {
  DEPOSIT:    "Wallet Top-up",
  WITHDRAWAL: "Withdrawal",
  INVESTMENT: "Investment",
  PROFIT:     "Profit Credit",
  COMMISSION: "Commission",
  BONUS:      "Bonus",
  REFUND:     "Refund",
  PENALTY:    "Penalty",
  ADJUSTMENT: "Adjustment",
  TRANSFER:   "Transfer",
};

// ─── Status configs (deposit + withdrawal unified) ────────────────────────────

export type UnifiedStatus =
  | "PENDING" | "PROCESSING" | "APPROVED"
  | "SUCCESS" | "COMPLETED"
  | "FAILED"  | "REJECTED" | "CANCELLED" | "REFUNDED"
  | "ACTIVE"  | "MATURED"  | "WITHDRAWN";

export interface StatusConfig {
  label:    string;
  textCls:  string;
  bgCls:    string;
  dotColor: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  PENDING:    { label: "Pending",    textCls: "text-amber-700",   bgCls: "bg-amber-50   border-amber-200",   dotColor: "bg-amber-400"   },
  PROCESSING: { label: "Processing", textCls: "text-violet-700",  bgCls: "bg-violet-50  border-violet-200",  dotColor: "bg-violet-400"  },
  APPROVED:   { label: "Approved",   textCls: "text-blue-700",    bgCls: "bg-blue-50    border-blue-200",    dotColor: "bg-blue-400"    },
  SUCCESS:    { label: "Success",    textCls: "text-emerald-700", bgCls: "bg-emerald-50 border-emerald-200", dotColor: "bg-emerald-500" },
  COMPLETED:  { label: "Completed",  textCls: "text-emerald-700", bgCls: "bg-emerald-50 border-emerald-200", dotColor: "bg-emerald-500" },
  FAILED:     { label: "Failed",     textCls: "text-red-700",     bgCls: "bg-red-50     border-red-200",     dotColor: "bg-red-400"     },
  REJECTED:   { label: "Rejected",   textCls: "text-red-700",     bgCls: "bg-red-50     border-red-200",     dotColor: "bg-red-400"     },
  CANCELLED:  { label: "Cancelled",  textCls: "text-slate-500",   bgCls: "bg-slate-50   border-slate-200",   dotColor: "bg-slate-400"   },
  REFUNDED:   { label: "Refunded",   textCls: "text-indigo-700",  bgCls: "bg-indigo-50  border-indigo-200",  dotColor: "bg-indigo-400"  },
  ACTIVE:     { label: "Active",     textCls: "text-emerald-700", bgCls: "bg-emerald-50 border-emerald-200", dotColor: "bg-emerald-500" },
  MATURED:    { label: "Matured",    textCls: "text-blue-700",    bgCls: "bg-blue-50    border-blue-200",    dotColor: "bg-blue-400"    },
  WITHDRAWN:  { label: "Withdrawn",  textCls: "text-amber-700",   bgCls: "bg-amber-50   border-amber-200",   dotColor: "bg-amber-400"   },
};

/** Derive a displayable status from a TransactionRecord */
export function deriveStatus(txn: TransactionRecord): string {
  if (txn.deposit)    return txn.deposit.status;
  if (txn.withdrawal) return txn.withdrawal.status;
  if (txn.investment) return txn.investment.status;
  // For PROFIT / COMMISSION / BONUS etc — infer from entry type
  return "COMPLETED";
}
