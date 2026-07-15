/**
 * Transactions repository — unified ledger queries scoped strictly to a single user.
 * Reads the Ledger table (the canonical financial log) and joins enrichment data
 * from DepositRequest, Withdrawal, and Investment when available.
 *
 * Security: every query is filtered by userId — no cross-user data leakage is possible.
 */

import { prisma } from "@/lib/prisma";
import type {
  LedgerTransactionType,
  LedgerEntryType,
  ReferenceType,
} from "@/lib/generated/prisma/client";

// ─── Filter input ─────────────────────────────────────────────────────────────

export interface TransactionFilters {
  /** Free-text search across description, externalTransactionId */
  search?: string;
  /** Filter by one or more transaction types */
  types?: LedgerTransactionType[];
  /** Filter by entry type (CREDIT | DEBIT) */
  entryType?: LedgerEntryType;
  /** ISO date string — only include records on/after this date */
  from?: string;
  /** ISO date string — only include records on/before this date */
  to?: string;
  /** Minimum amount (inclusive) */
  amountMin?: number;
  /** Maximum amount (inclusive) */
  amountMax?: number;
  /** Sort direction */
  sort?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// ─── Output shapes ────────────────────────────────────────────────────────────

export interface TransactionRecord {
  id:                    string;
  transactionType:       LedgerTransactionType;
  entryType:             LedgerEntryType;
  amount:                number;
  balanceBefore:         number;
  balanceAfter:          number;
  referenceId:           string | null;
  referenceType:         ReferenceType;
  externalTransactionId: string | null;
  description:           string;
  metadata:              Record<string, unknown> | null;
  createdAt:             string;

  // Enriched from join tables (nullable — only present when referenceId exists)
  deposit:    DepositDetail    | null;
  withdrawal: WithdrawalDetail | null;
  investment: InvestmentDetail | null;
}

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
  /** Masked: last 4 digits only */
  accountNumberMasked:  string | null;
  ifscCode:             string | null;
  /** Masked UPI */
  upiIdMasked:          string | null;
  transactionReference: string | null;
  rejectionReason:      string | null;
  requestedAt:          string;
  approvedAt:           string | null;
  processedAt:          string | null;
}

export interface InvestmentDetail {
  id:               string;
  packageId:        string;
  packageName:      string;
  packageCode:      string;
  principalAmount:  number;
  dailyReturnRate:  number;
  tenureDays:       number;
  completedDays:    number;
  totalProfitEarned: number;
  status:           string;
  investedAt:       string;
  maturityDate:     string;
}

export interface TransactionListResult {
  records: TransactionRecord[];
  total:   number;
  page:    number;
  pages:   number;
}

// ─── Summary output ───────────────────────────────────────────────────────────

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

// ─── Masking helpers ──────────────────────────────────────────────────────────

function maskAccount(n: string | null): string | null {
  if (!n) return null;
  return n.length > 4 ? `XXXX${n.slice(-4)}` : "XXXX";
}

function maskUpi(upi: string | null): string | null {
  if (!upi) return null;
  const atIdx = upi.indexOf("@");
  if (atIdx <= 0) return "****";
  const local  = upi.slice(0, atIdx);
  const domain = upi.slice(atIdx);
  const visible = local.length > 2 ? local.slice(0, 2) : local[0];
  return `${visible}****${domain}`;
}

// ─── Main list query ──────────────────────────────────────────────────────────

export async function getTransactionList(
  userId:  string,
  filters: TransactionFilters
): Promise<TransactionListResult> {
  const {
    search,
    types,
    entryType,
    from,
    to,
    amountMin,
    amountMax,
    sort      = "desc",
    page      = 1,
    limit     = 20,
  } = filters;

  const safePage  = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip      = (safePage - 1) * safeLimit;

  // Build Prisma where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    userId,
    ...(types?.length              && { transactionType: { in: types } }),
    ...(entryType                  && { entryType }),
    ...(amountMin != null || amountMax != null) && {
      amount: {
        ...(amountMin != null && { gte: amountMin }),
        ...(amountMax != null && { lte: amountMax }),
      },
    },
    ...(from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to   && { lte: new Date(to)   }),
      },
    },
    ...(search && {
      OR: [
        { description:           { contains: search, mode: "insensitive" } },
        { externalTransactionId: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [rows, total] = await Promise.all([
    prisma.ledger.findMany({
      where,
      orderBy: { createdAt: sort },
      skip,
      take:    safeLimit,
    }),
    prisma.ledger.count({ where }),
  ]);

  // Collect reference IDs by type to batch-fetch enrichment data
  const depositIds:    string[] = [];
  const withdrawalIds: string[] = [];
  const investmentIds: string[] = [];

  for (const row of rows) {
    if (!row.referenceId) continue;
    if (row.referenceType === "DEPOSIT")    depositIds.push(row.referenceId);
    if (row.referenceType === "WITHDRAWAL") withdrawalIds.push(row.referenceId);
    if (row.referenceType === "INVESTMENT" || row.referenceType === "WEEKLY_PROFIT")
      investmentIds.push(row.referenceId);
  }

  // Batch-fetch enrichment in parallel
  const [deposits, withdrawals, investments] = await Promise.all([
    depositIds.length > 0
      ? prisma.depositRequest.findMany({
          where:  { id: { in: depositIds }, userId },
          select: {
            id: true, amount: true, method: true, status: true,
            transactionReference: true,
            gatewayOrderId:       true,
            gatewayPaymentId:     true,
            gatewayTransactionId: true,
            rejectionReason:      true,
            depositedAt:          true,
          },
        })
      : [],

    withdrawalIds.length > 0
      ? prisma.withdrawal.findMany({
          where:  { id: { in: withdrawalIds }, userId },
          select: {
            id: true, amount: true, fee: true, tax: true, netAmount: true,
            method: true, status: true,
            accountHolderName: true, bankName: true, accountNumber: true,
            ifscCode: true, upiId: true, transactionReference: true,
            rejectionReason: true, requestedAt: true, approvedAt: true, processedAt: true,
          },
        })
      : [],

    investmentIds.length > 0
      ? prisma.investment.findMany({
          where:   { id: { in: investmentIds }, userId },
          include: { package: { select: { name: true, code: true } } },
        })
      : [],
  ]);

  // Index by id for O(1) lookup
  const depositMap    = new Map(deposits.map((d) => [d.id, d]));
  const withdrawalMap = new Map(withdrawals.map((w) => [w.id, w]));
  const investmentMap = new Map(investments.map((i) => [i.id, i]));

  const records: TransactionRecord[] = rows.map((row) => {
    const d  = row.referenceId && row.referenceType === "DEPOSIT"    ? depositMap.get(row.referenceId)    ?? null : null;
    const w  = row.referenceId && row.referenceType === "WITHDRAWAL" ? withdrawalMap.get(row.referenceId) ?? null : null;
    const i  = row.referenceId && (row.referenceType === "INVESTMENT" || row.referenceType === "WEEKLY_PROFIT")
      ? investmentMap.get(row.referenceId) ?? null
      : null;

    return {
      id:                    row.id,
      transactionType:       row.transactionType,
      entryType:             row.entryType,
      amount:                Number(row.amount),
      balanceBefore:         Number(row.balanceBefore),
      balanceAfter:          Number(row.balanceAfter),
      referenceId:           row.referenceId,
      referenceType:         row.referenceType,
      externalTransactionId: row.externalTransactionId,
      description:           row.description,
      metadata:              row.metadata as Record<string, unknown> | null,
      createdAt:             row.createdAt.toISOString(),

      deposit: d ? {
        id:                   d.id,
        amount:               Number(d.amount),
        method:               d.method,
        status:               d.status,
        transactionReference: d.transactionReference,
        gatewayOrderId:       d.gatewayOrderId,
        gatewayPaymentId:     d.gatewayPaymentId,
        gatewayTransactionId: d.gatewayTransactionId,
        rejectionReason:      d.rejectionReason,
        depositedAt:          d.depositedAt.toISOString(),
      } : null,

      withdrawal: w ? {
        id:                   w.id,
        amount:               Number(w.amount),
        fee:                  Number(w.fee),
        tax:                  Number(w.tax),
        netAmount:            Number(w.netAmount),
        method:               w.method,
        status:               w.status,
        accountHolderName:    w.accountHolderName,
        bankName:             w.bankName,
        accountNumberMasked:  maskAccount(w.accountNumber),
        ifscCode:             w.ifscCode,
        upiIdMasked:          maskUpi(w.upiId),
        transactionReference: w.transactionReference,
        rejectionReason:      w.rejectionReason,
        requestedAt:          w.requestedAt.toISOString(),
        approvedAt:           w.approvedAt?.toISOString() ?? null,
        processedAt:          w.processedAt?.toISOString() ?? null,
      } : null,

      investment: i ? {
        id:               i.id,
        packageId:        i.packageId,
        packageName:      i.package.name,
        packageCode:      i.package.code,
        principalAmount:  Number(i.principalAmount),
        dailyReturnRate:  Number(i.dailyReturnRate),
        tenureDays:       i.tenureDays,
        completedDays:    i.completedDays,
        totalProfitEarned: Number(i.totalProfitEarned),
        status:           i.status,
        investedAt:       i.investedAt.toISOString(),
        maturityDate:     i.maturityDate.toISOString(),
      } : null,
    };
  });

  return {
    records,
    total,
    page:  safePage,
    pages: Math.ceil(total / safeLimit),
  };
}

// ─── Summary query ────────────────────────────────────────────────────────────

export async function getTransactionSummary(userId: string): Promise<TransactionSummary> {
  const [
    totalCount,
    depositAgg,
    withdrawalAgg,
    investmentAgg,
    profitAgg,
    bonusAgg,
    refundAgg,
    userBalance,
  ] = await Promise.all([
    prisma.ledger.count({ where: { userId } }),

    prisma.ledger.aggregate({
      where: { userId, transactionType: "DEPOSIT", entryType: "CREDIT" },
      _sum: { amount: true },
    }),

    prisma.ledger.aggregate({
      where: { userId, transactionType: "WITHDRAWAL", entryType: "DEBIT" },
      _sum: { amount: true },
    }),

    prisma.ledger.aggregate({
      where: { userId, transactionType: "INVESTMENT", entryType: "DEBIT" },
      _sum: { amount: true },
    }),

    prisma.ledger.aggregate({
      where: { userId, transactionType: "PROFIT", entryType: "CREDIT" },
      _sum: { amount: true },
    }),

    prisma.ledger.aggregate({
      where: { userId, transactionType: { in: ["BONUS", "COMMISSION"] }, entryType: "CREDIT" },
      _sum: { amount: true },
    }),

    prisma.ledger.aggregate({
      where: { userId, transactionType: "REFUND", entryType: "CREDIT" },
      _sum: { amount: true },
    }),

    prisma.user.findUnique({
      where:  { id: userId },
      select: { mainBalance: true, investedBalance: true, commissionBalance: true },
    }),
  ]);

  return {
    totalTransactions:   totalCount,
    totalDeposited:      Number(depositAgg._sum.amount    ?? 0),
    totalWithdrawn:      Number(withdrawalAgg._sum.amount ?? 0),
    totalInvested:       Number(investmentAgg._sum.amount ?? 0),
    totalProfitCredited: Number(profitAgg._sum.amount     ?? 0),
    totalBonus:          Number(bonusAgg._sum.amount      ?? 0),
    totalRefunds:        Number(refundAgg._sum.amount     ?? 0),
    walletBalance:       Number(userBalance?.mainBalance       ?? 0),
    investedBalance:     Number(userBalance?.investedBalance   ?? 0),
    commissionBalance:   Number(userBalance?.commissionBalance ?? 0),
  };
}
