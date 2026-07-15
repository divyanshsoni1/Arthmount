/**
 * Admin withdrawal repository — Prisma queries for the admin withdrawal management module.
 *
 * All functions are called only from withdrawal.controller.ts which enforces ADMIN role.
 *
 * Status transition rules (enforced here, not just in controller):
 *   PENDING    → APPROVED  (approve)
 *   APPROVED   → PROCESSING (begin processing)
 *   PROCESSING → COMPLETED (mark paid)
 *   PENDING | APPROVED | PROCESSING → REJECTED (reject with reason)
 *
 * Every status change is atomic:
 *   BEGIN → lock row → validate current status → update status → write audit log → COMMIT
 */

import { prisma } from "@/lib/prisma";
import type { WithdrawalStatus } from "@/lib/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminWithdrawalRow {
  id:                   string;
  userId:               string;
  amount:               string;
  fee:                  string;
  tax:                  string;
  netAmount:            string;
  method:               string;
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
  // Joined user fields
  user: {
    id:         string;
    name:       string;
    email:      string | null;
    phone:      string | null;
    kycStatus:  string;
    isFrozen:   boolean;
    mainBalance: string;
    createdAt:  string;
  };
  // Joined approvedBy
  approvedBy: { id: string; name: string } | null;
}

interface ListWithdrawalsOptions {
  page:       number;
  limit:      number;
  status?:    WithdrawalStatus;
  method?:    "BANK" | "UPI";
  search?:    string;
  dateFrom?:  Date;
  dateTo?:    Date;
  minAmount?: number;
  maxAmount?: number;
  orderBy?:   "asc" | "desc";
}

// ─── Helper: raw row → typed AdminWithdrawalRow ───────────────────────────────

function mapRow(w: {
  id: string; userId: string; amount: { toString(): string };
  fee: { toString(): string }; tax: { toString(): string };
  netAmount: { toString(): string }; method: string;
  accountHolderName: string | null; bankName: string | null;
  accountNumber: string | null; ifscCode: string | null;
  upiId: string | null; transactionReference: string | null;
  status: WithdrawalStatus; rejectionReason: string | null;
  approvedById: string | null; requestedAt: Date;
  approvedAt: Date | null; processedAt: Date | null;
  remarks: string | null; createdAt: Date; updatedAt: Date;
  user: {
    id: string; name: string; email: string | null; phone: string | null;
    kycStatus: string; isFrozen: boolean; mainBalance: { toString(): string };
    createdAt: Date;
  };
  approvedBy: { id: string; name: string } | null;
}): AdminWithdrawalRow {
  return {
    ...w,
    amount:    w.amount.toString(),
    fee:       w.fee.toString(),
    tax:       w.tax.toString(),
    netAmount: w.netAmount.toString(),
    requestedAt: w.requestedAt.toISOString(),
    approvedAt:  w.approvedAt?.toISOString()  ?? null,
    processedAt: w.processedAt?.toISOString() ?? null,
    createdAt:   w.createdAt.toISOString(),
    updatedAt:   w.updatedAt.toISOString(),
    user: {
      ...w.user,
      mainBalance: w.user.mainBalance.toString(),
      createdAt:   w.user.createdAt.toISOString(),
    },
  };
}

const WITHDRAWAL_WITH_USER_SELECT = {
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
  user: {
    select: {
      id: true, name: true, email: true, phone: true,
      kycStatus: true, isFrozen: true, mainBalance: true, createdAt: true,
    },
  },
  approvedBy: { select: { id: true, name: true } },
} as const;

// ─── 1. List withdrawals (admin — no ownership filter) ────────────────────────

export async function listAdminWithdrawals(opts: ListWithdrawalsOptions) {
  const {
    page, limit, status, method, search,
    dateFrom, dateTo, minAmount, maxAmount,
    orderBy = "desc",
  } = opts;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = { deletedAt: null };
  if (status)    where.status = status;
  if (method)    where.method = method;
  if (dateFrom || dateTo) {
    where.requestedAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo   ? { lte: dateTo   } : {}),
    };
  }
  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amount = {
      ...(minAmount !== undefined ? { gte: minAmount } : {}),
      ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
    };
  }
  if (search) {
    const q = search.trim();
    where.OR = [
      { transactionReference: { contains: q, mode: "insensitive" } },
      { bankName:             { contains: q, mode: "insensitive" } },
      { accountNumber:        { contains: q } },
      { upiId:                { contains: q, mode: "insensitive" } },
      { user: { name:  { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { phone: { contains: q } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.withdrawal.findMany({
      where,
      select:  WITHDRAWAL_WITH_USER_SELECT,
      orderBy: { requestedAt: orderBy },
      skip,
      take:    limit,
    }),
    prisma.withdrawal.count({ where }),
  ]);

  return {
    records: rows.map(mapRow),
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

// ─── 2. Single withdrawal detail (admin — no ownership filter) ────────────────

export async function getAdminWithdrawalById(id: string): Promise<AdminWithdrawalRow | null> {
  const w = await prisma.withdrawal.findFirst({
    where:  { id, deletedAt: null },
    select: WITHDRAWAL_WITH_USER_SELECT,
  });
  return w ? mapRow(w) : null;
}

// ─── 3. Admin KPI stats ───────────────────────────────────────────────────────

export async function getAdminWithdrawalStats() {
  const now       = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCount,
    pendingAgg,
    processingAgg,
    completedAgg,
    rejectedAgg,
    cancelledAgg,
    failedAgg,
    totalAmountAgg,
    todayAgg,
    monthAgg,
  ] = await Promise.all([
    prisma.withdrawal.count({ where: { deletedAt: null } }),
    prisma.withdrawal.aggregate({
      where: { status: "PENDING", deletedAt: null },
      _sum: { amount: true }, _count: true,
    }),
    prisma.withdrawal.aggregate({
      where: { status: "PROCESSING", deletedAt: null },
      _sum: { amount: true }, _count: true,
    }),
    prisma.withdrawal.aggregate({
      where: { status: "COMPLETED", deletedAt: null },
      _sum: { netAmount: true }, _count: true,
    }),
    prisma.withdrawal.aggregate({
      where: { status: "REJECTED", deletedAt: null },
      _sum: { amount: true }, _count: true,
    }),
    prisma.withdrawal.aggregate({
      where: { status: "CANCELLED", deletedAt: null },
      _sum: { amount: true }, _count: true,
    }),
    prisma.withdrawal.aggregate({
      where: { status: "FAILED", deletedAt: null },
      _sum: { amount: true }, _count: true,
    }),
    prisma.withdrawal.aggregate({
      where: { deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.withdrawal.aggregate({
      where: { requestedAt: { gte: todayStart }, deletedAt: null },
      _sum: { amount: true }, _count: true,
    }),
    prisma.withdrawal.aggregate({
      where: { requestedAt: { gte: monthStart }, deletedAt: null },
      _sum: { amount: true }, _count: true,
    }),
  ]);

  return {
    total:      totalCount,
    pending:    { count: pendingAgg._count,    amount: Number(pendingAgg._sum.amount    ?? 0) },
    processing: { count: processingAgg._count, amount: Number(processingAgg._sum.amount ?? 0) },
    completed:  { count: completedAgg._count,  amount: Number(completedAgg._sum.netAmount ?? 0) },
    rejected:   { count: rejectedAgg._count,   amount: Number(rejectedAgg._sum.amount   ?? 0) },
    cancelled:  { count: cancelledAgg._count,  amount: Number(cancelledAgg._sum.amount  ?? 0) },
    failed:     { count: failedAgg._count,     amount: Number(failedAgg._sum.amount     ?? 0) },
    totalAmount: Number(totalAmountAgg._sum.amount ?? 0),
    todayCount:  todayAgg._count,
    todayAmount: Number(todayAgg._sum.amount ?? 0),
    monthCount:  monthAgg._count,
    monthAmount: Number(monthAgg._sum.amount ?? 0),
  };
}

// ─── 4. Valid status transitions ──────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, WithdrawalStatus[]> = {
  PENDING:    ["APPROVED", "REJECTED"],
  APPROVED:   ["PROCESSING", "REJECTED"],
  PROCESSING: ["COMPLETED", "REJECTED"],
};

export function isValidTransition(
  from: WithdrawalStatus,
  to:   WithdrawalStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── 5. Atomic status update ──────────────────────────────────────────────────

export interface UpdateWithdrawalStatusInput {
  id:              string;
  adminId:         string;
  newStatus:       "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED";
  rejectionReason?: string;
}

export async function atomicUpdateWithdrawalStatus(
  input: UpdateWithdrawalStatusInput
): Promise<AdminWithdrawalRow> {
  const { id, adminId, newStatus, rejectionReason } = input;

  return prisma.$transaction(async (tx) => {
    // 1. Lock + re-read current state
    const current = await tx.withdrawal.findFirst({
      where:  { id, deletedAt: null },
      select: {
        id: true, status: true, userId: true,
        amount: true, netAmount: true,
        accountNumber: true, upiId: true, method: true,
        transactionReference: true,
      },
    });

    if (!current) {
      throw new Error("WITHDRAWAL_NOT_FOUND");
    }

    if (!isValidTransition(current.status, newStatus)) {
      throw new Error(`INVALID_TRANSITION:${current.status}:${newStatus}`);
    }

    // 2. Build update data
    const now  = new Date();
    const data: Record<string, unknown> = {
      status:     newStatus,
      updatedAt:  now,
    };

    if (newStatus === "APPROVED" || newStatus === "PROCESSING") {
      data.approvedById = adminId;
      data.approvedAt   = now;
    }
    if (newStatus === "COMPLETED") {
      data.processedAt = now;
    }
    if (newStatus === "REJECTED") {
      data.rejectionReason = rejectionReason ?? "Rejected by admin";
      data.processedAt     = now;
    }

    // 3. Update the withdrawal
    const updated = await tx.withdrawal.update({
      where:  { id },
      data,
      select: WITHDRAWAL_WITH_USER_SELECT,
    });

    // 4. If REJECTED, refund the wallet (money was debited at request time)
    if (newStatus === "REJECTED") {
      const refundAmount = Number(current.amount);
      const userBefore = await tx.user.findUnique({
        where:  { id: current.userId },
        select: { mainBalance: true },
      });
      const balBefore = Number(userBefore!.mainBalance);

      await tx.user.update({
        where: { id: current.userId },
        data:  { mainBalance: { increment: refundAmount } },
      });

      await tx.ledger.create({
        data: {
          userId:          current.userId,
          transactionType: "WITHDRAWAL",
          entryType:       "CREDIT",
          amount:          refundAmount,
          balanceBefore:   balBefore,
          balanceAfter:    balBefore + refundAmount,
          referenceType:   "WITHDRAWAL",
          referenceId:     id,
          description:     `Withdrawal rejected — refunded to wallet (Ref: ${current.transactionReference ?? id})`,
        },
      });
    }

    // 5. Write audit log
    const actionMap: Record<string, string> = {
      APPROVED:   "APPROVE",
      PROCESSING: "UPDATE",
      COMPLETED:  "APPROVE",
      REJECTED:   "REJECT",
    };
    await tx.adminAuditLog.create({
      data: {
        adminId,
        action:       actionMap[newStatus] as "APPROVE" | "UPDATE" | "REJECT",
        resourceType: "WITHDRAWAL",
        resourceId:   id,
        title:        `Withdrawal ${newStatus}`,
        description:  newStatus === "REJECTED"
          ? `Rejected: ${rejectionReason ?? "No reason provided"}`
          : `Status changed to ${newStatus}`,
        status: "SUCCESS",
      },
    });

    return mapRow(updated);
  });
}
