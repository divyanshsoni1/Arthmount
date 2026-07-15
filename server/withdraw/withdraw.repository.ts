/**
 * Withdraw repository — all Prisma queries for the withdrawal module.
 *
 * Key design decisions:
 *  - Withdrawal balance lives on User.mainBalance (wallet) or is derived from
 *    matured Investment rows (status === "MATURED" or past maturityDate).
 *  - Every withdrawal atomically: reads balance, debits mainBalance, creates
 *    Withdrawal row, writes Ledger entry — all inside one $transaction.
 *  - transactionReference is a unique idempotency key per request to prevent
 *    double-submission.
 *  - Bank/UPI details are stored inline on the Withdrawal row (no separate table).
 */

import { prisma }  from "@/lib/prisma";
import type {
  Withdrawal,
  WithdrawalStatus,
  WithdrawalMethod,
} from "@/lib/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WithdrawalRecord = Pick<
  Withdrawal,
  | "id"
  | "userId"
  | "amount"
  | "fee"
  | "tax"
  | "netAmount"
  | "method"
  | "accountHolderName"
  | "bankName"
  | "accountNumber"
  | "ifscCode"
  | "upiId"
  | "transactionReference"
  | "status"
  | "rejectionReason"
  | "approvedById"
  | "requestedAt"
  | "approvedAt"
  | "processedAt"
  | "remarks"
  | "createdAt"
  | "updatedAt"
>;

const WITHDRAWAL_SELECT = {
  id:                   true,
  userId:               true,
  amount:               true,
  fee:                  true,
  tax:                  true,
  netAmount:            true,
  method:               true,
  accountHolderName:    true,
  bankName:             true,
  accountNumber:        true,
  ifscCode:             true,
  upiId:                true,
  transactionReference: true,
  status:               true,
  rejectionReason:      true,
  approvedById:         true,
  requestedAt:          true,
  approvedAt:           true,
  processedAt:          true,
  remarks:              true,
  createdAt:            true,
  updatedAt:            true,
} as const;

// ─── User balance summary ─────────────────────────────────────────────────────

export interface UserBalanceSummary {
  mainBalance:       number;
  investedBalance:   number;
  commissionBalance: number;
  isFrozen:          boolean;
}

export async function getUserBalanceSummary(
  userId: string
): Promise<UserBalanceSummary | null> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      mainBalance:       true,
      investedBalance:   true,
      commissionBalance: true,
      isFrozen:          true,
    },
  });
  if (!user) return null;
  return {
    mainBalance:       Number(user.mainBalance),
    investedBalance:   Number(user.investedBalance),
    commissionBalance: Number(user.commissionBalance),
    isFrozen:          user.isFrozen,
  };
}

// ─── Matured investments for a user ──────────────────────────────────────────

export interface MaturedInvestment {
  id:               string;
  packageId:        string;
  packageName:      string;
  packageCode:      string;
  principalAmount:  number;
  totalProfitEarned: number;
  pendingProfit:    number;
  dailyReturnRate:  number;
  tenureDays:       number;
  completedDays:    number;
  investedAt:       string;
  maturityDate:     string;
  status:           string;
}

export async function getMaturedInvestments(
  userId: string
): Promise<MaturedInvestment[]> {
  const now = new Date();
  const rows = await prisma.investment.findMany({
    where: {
      userId,
      deletedAt: null,
      // MATURED status OR maturityDate has passed (treat as matured even if cron hasn't run)
      OR: [
        { status: "MATURED" },
        { status: "ACTIVE", maturityDate: { lte: now } },
      ],
    },
    include: {
      package: { select: { name: true, code: true } },
    },
    orderBy: { maturityDate: "asc" },
  });

  return rows.map((inv) => ({
    id:                inv.id,
    packageId:         inv.packageId,
    packageName:       inv.package.name,
    packageCode:       inv.package.code,
    principalAmount:   Number(inv.principalAmount),
    totalProfitEarned: Number(inv.totalProfitEarned),
    pendingProfit:     Number(inv.pendingProfit),
    dailyReturnRate:   Number(inv.dailyReturnRate),
    tenureDays:        inv.tenureDays,
    completedDays:     inv.completedDays,
    investedAt:        inv.investedAt.toISOString(),
    maturityDate:      inv.maturityDate.toISOString(),
    status:            inv.status,
  }));
}

// ─── All investments for summary (locked count, locked amount) ────────────────

export interface InvestmentSummary {
  maturedCount:           number;
  maturedAmount:          number;      // principal + profit of matured
  lockedCount:            number;
  lockedAmount:           number;      // principal of locked/active
}

export async function getInvestmentSummary(userId: string): Promise<InvestmentSummary> {
  const now = new Date();

  const [matured, locked] = await Promise.all([
    // Matured: status MATURED or ACTIVE with maturityDate in past
    prisma.investment.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { status: "MATURED" },
          { status: "ACTIVE", maturityDate: { lte: now } },
        ],
      },
      select: { principalAmount: true, totalProfitEarned: true },
    }),
    // Locked: ACTIVE and maturityDate still in future
    prisma.investment.findMany({
      where: {
        userId,
        deletedAt: null,
        status: "ACTIVE",
        maturityDate: { gt: now },
      },
      select: { principalAmount: true },
    }),
  ]);

  const maturedAmount = matured.reduce(
    (s, i) => s + Number(i.principalAmount) + Number(i.totalProfitEarned),
    0
  );
  const lockedAmount = locked.reduce(
    (s, i) => s + Number(i.principalAmount),
    0
  );

  return {
    maturedCount:  matured.length,
    maturedAmount,
    lockedCount:   locked.length,
    lockedAmount,
  };
}

// ─── Pending withdrawals summary ─────────────────────────────────────────────

export async function getPendingWithdrawalTotal(userId: string): Promise<{
  pendingCount:   number;
  pendingAmount:  number;
  lifetimeAmount: number;
  lifetimeCount:  number;
}> {
  const [pending, lifetime] = await Promise.all([
    prisma.withdrawal.aggregate({
      where:  { userId, status: { in: ["PENDING", "APPROVED", "PROCESSING"] }, deletedAt: null },
      _sum:   { amount: true },
      _count: true,
    }),
    prisma.withdrawal.aggregate({
      where:  { userId, status: "COMPLETED", deletedAt: null },
      _sum:   { netAmount: true },
      _count: true,
    }),
  ]);
  return {
    pendingCount:   pending._count,
    pendingAmount:  Number(pending._sum.amount  ?? 0),
    lifetimeAmount: Number(lifetime._sum.netAmount ?? 0),
    lifetimeCount:  lifetime._count,
  };
}

// ─── Check duplicate pending withdrawal ──────────────────────────────────────

export async function hasPendingWithdrawal(userId: string): Promise<boolean> {
  const count = await prisma.withdrawal.count({
    where: {
      userId,
      status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
      deletedAt: null,
    },
  });
  return count > 0;
}

// ─── Check idempotency key ────────────────────────────────────────────────────

export async function findWithdrawalByRef(
  transactionReference: string
): Promise<WithdrawalRecord | null> {
  return prisma.withdrawal.findUnique({
    where:  { transactionReference },
    select: WITHDRAWAL_SELECT,
  });
}

// ─── Create withdrawal (inside transaction — called from atomicWithdraw) ──────

export interface CreateWithdrawalInput {
  userId:               string;
  amount:               number;
  fee:                  number;
  tax:                  number;
  netAmount:            number;
  method:               WithdrawalMethod;
  transactionReference: string;
  // Bank fields (method=BANK)
  accountHolderName?:   string;
  bankName?:            string;
  accountNumber?:       string;
  ifscCode?:            string;
  // UPI field (method=UPI)
  upiId?:               string;
}

// ─── Atomic withdrawal: debit wallet + create Withdrawal + write Ledger ───────

export async function atomicWithdraw(input: CreateWithdrawalInput): Promise<WithdrawalRecord> {
  const {
    userId, amount, fee, tax, netAmount,
    method, transactionReference,
    accountHolderName, bankName, accountNumber, ifscCode, upiId,
  } = input;

  return prisma.$transaction(async (tx) => {
    // 1. Lock + re-read current balance
    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { mainBalance: true, isFrozen: true },
    });

    if (!user)        throw new Error("USER_NOT_FOUND");
    if (user.isFrozen) throw new Error("ACCOUNT_FROZEN");

    const mainBal = Number(user.mainBalance);
    if (mainBal < amount) throw new Error("INSUFFICIENT_BALANCE");

    const balanceAfter = mainBal - amount;

    // 2. Debit mainBalance
    await tx.user.update({
      where: { id: userId },
      data:  { mainBalance: { decrement: amount } },
    });

    // 3. Create Withdrawal record
    const withdrawal = await tx.withdrawal.create({
      data: {
        userId,
        amount,
        fee,
        tax,
        netAmount,
        method,
        transactionReference,
        accountHolderName: accountHolderName ?? null,
        bankName:          bankName          ?? null,
        accountNumber:     accountNumber     ?? null,
        ifscCode:          ifscCode          ?? null,
        upiId:             upiId             ?? null,
        status:            "PENDING",
      },
      select: WITHDRAWAL_SELECT,
    });

    // 4. Write Ledger DEBIT entry
    await tx.ledger.create({
      data: {
        userId,
        transactionType: "WITHDRAWAL",
        entryType:       "DEBIT",
        amount,
        balanceBefore:   mainBal,
        balanceAfter:    balanceAfter,
        referenceType:   "WITHDRAWAL",
        referenceId:     withdrawal.id,
        description:     `Withdrawal request — ${method === "BANK" ? `Bank (${accountNumber})` : `UPI (${upiId})`}`,
      },
    });

    return withdrawal;
  });
}

// ─── Get single withdrawal (ownership enforced) ───────────────────────────────

export async function getWithdrawalById(
  id:     string,
  userId: string
): Promise<WithdrawalRecord | null> {
  return prisma.withdrawal.findFirst({
    where:  { id, userId, deletedAt: null },
    select: WITHDRAWAL_SELECT,
  });
}

// ─── Cancel withdrawal (user-initiated, only if PENDING) ─────────────────────

export async function cancelWithdrawal(
  id:     string,
  userId: string
): Promise<WithdrawalRecord> {
  return prisma.$transaction(async (tx) => {
    // Re-read with lock
    const withdrawal = await tx.withdrawal.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!withdrawal)               throw new Error("NOT_FOUND");
    if (withdrawal.status !== "PENDING") throw new Error("CANNOT_CANCEL");

    // Refund mainBalance
    await tx.user.update({
      where: { id: userId },
      data:  { mainBalance: { increment: Number(withdrawal.amount) } },
    });

    // Read current balance for ledger
    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { mainBalance: true },
    });
    const newBal = Number(user!.mainBalance);

    // Mark cancelled
    const updated = await tx.withdrawal.update({
      where:  { id },
      data:   { status: "CANCELLED" },
      select: WITHDRAWAL_SELECT,
    });

    // Ledger: CREDIT (refund)
    await tx.ledger.create({
      data: {
        userId,
        transactionType: "WITHDRAWAL",
        entryType:       "CREDIT",
        amount:          Number(withdrawal.amount),
        balanceBefore:   newBal - Number(withdrawal.amount),
        balanceAfter:    newBal,
        referenceType:   "WITHDRAWAL",
        referenceId:     id,
        description:     `Withdrawal cancelled — refunded to wallet`,
      },
    });

    return updated;
  });
}

// ─── Paginated withdrawal history ─────────────────────────────────────────────

export async function getWithdrawalHistory(
  userId: string,
  page:   number,
  limit:  number,
  status?: WithdrawalStatus
): Promise<{ records: WithdrawalRecord[]; total: number }> {
  const skip  = (page - 1) * limit;
  const where = {
    userId,
    deletedAt: null,
    ...(status ? { status } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.withdrawal.findMany({
      where,
      select:  WITHDRAWAL_SELECT,
      orderBy: { requestedAt: "desc" },
      skip,
      take:    limit,
    }),
    prisma.withdrawal.count({ where }),
  ]);

  return { records, total };
}
