/**
 * Transactions service — thin orchestration layer between controller and repository.
 * Handles input coercion and validation before passing to the repository.
 */

import {
  getTransactionList,
  getTransactionSummary,
  type TransactionFilters,
  type TransactionListResult,
  type TransactionSummary,
} from "./transactions.repository";
import type { LedgerTransactionType, LedgerEntryType } from "@/lib/generated/prisma/client";

const VALID_TYPES: LedgerTransactionType[] = [
  "DEPOSIT", "WITHDRAWAL", "INVESTMENT", "PROFIT",
  "COMMISSION", "BONUS", "REFUND", "PENALTY", "ADJUSTMENT", "TRANSFER",
];

const VALID_ENTRY_TYPES: LedgerEntryType[] = ["CREDIT", "DEBIT"];

export interface ListInput {
  search?:    string;
  types?:     string;       // comma-separated string from query param
  entryType?: string;
  from?:      string;
  to?:        string;
  amountMin?: string;
  amountMax?: string;
  sort?:      string;
  page?:      string;
  limit?:     string;
}

function parseTypes(raw: string | undefined): LedgerTransactionType[] | undefined {
  if (!raw) return undefined;
  const parts = raw.split(",").map((s) => s.trim().toUpperCase()) as LedgerTransactionType[];
  const valid  = parts.filter((p) => VALID_TYPES.includes(p));
  return valid.length > 0 ? valid : undefined;
}

function parseEntryType(raw: string | undefined): LedgerEntryType | undefined {
  if (!raw) return undefined;
  const upper = raw.toUpperCase() as LedgerEntryType;
  return VALID_ENTRY_TYPES.includes(upper) ? upper : undefined;
}

function parsePositiveFloat(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseFloat(raw);
  return isFinite(n) && n >= 0 ? n : undefined;
}

function parseSort(raw: string | undefined): "asc" | "desc" {
  return raw === "asc" ? "asc" : "desc";
}

export async function listTransactions(
  userId: string,
  input:  ListInput
): Promise<TransactionListResult> {
  const filters: TransactionFilters = {
    search:    input.search?.trim() || undefined,
    types:     parseTypes(input.types),
    entryType: parseEntryType(input.entryType),
    from:      input.from  || undefined,
    to:        input.to    || undefined,
    amountMin: parsePositiveFloat(input.amountMin),
    amountMax: parsePositiveFloat(input.amountMax),
    sort:      parseSort(input.sort),
    page:      Math.max(1, parseInt(input.page  ?? "1",  10) || 1),
    limit:     Math.min(100, Math.max(1, parseInt(input.limit ?? "20", 10) || 20)),
  };

  return getTransactionList(userId, filters);
}

export async function fetchTransactionSummary(userId: string): Promise<TransactionSummary> {
  return getTransactionSummary(userId);
}
