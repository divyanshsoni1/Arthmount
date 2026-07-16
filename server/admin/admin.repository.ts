/**
 * Admin repository — all Prisma queries for the admin dashboard.
 * Only called from admin.controller.ts which enforces ADMIN role.
 */

import { prisma } from "@/lib/prisma";
import type { KycStatus, Role } from "@/lib/generated/prisma/client";

// ─── Platform KPI stats ───────────────────────────────────────────────────────

export async function getPlatformStats() {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo  = new Date(today); weekAgo.setDate(today.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);

  const [
    totalUsers,
    activeUsers,
    frozenUsers,
    newToday,
    newThisWeek,
    newThisMonth,
    kycPending,
    kycInReview,
    kycApproved,
    kycRejected,
    totalDepositsAgg,
    successDepositsAgg,
    totalWithdrawalsAgg,
    activeInvestmentsAgg,
    walletAgg,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isFrozen: false } }),
    prisma.user.count({ where: { deletedAt: null, isFrozen: true } }),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.user.count({ where: { kycStatus: "PENDING" } }),
    prisma.user.count({ where: { kycStatus: "IN_REVIEW" } }),
    prisma.user.count({ where: { kycStatus: "APPROVED" } }),
    prisma.user.count({ where: { kycStatus: "REJECTED" } }),
    prisma.depositRequest.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.depositRequest.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.withdrawal.aggregate({
      where: { status: "COMPLETED" },
      _sum: { netAmount: true },
      _count: true,
    }),
    prisma.investment.aggregate({
      where: { status: "ACTIVE" },
      _sum:   { principalAmount: true },
      _count: true,
    }),
    prisma.user.aggregate({ _sum: { mainBalance: true, investedBalance: true } }),
  ]);

  return {
    totalUsers,
    activeUsers,
    frozenUsers,
    newToday,
    newThisWeek,
    newThisMonth,
    kyc: { pending: kycPending, inReview: kycInReview, approved: kycApproved, rejected: kycRejected },
    deposits: {
      total:       Number(totalDepositsAgg._sum.amount   ?? 0),
      totalCount:  totalDepositsAgg._count,
      successful:  Number(successDepositsAgg._sum.amount ?? 0),
      successCount: successDepositsAgg._count,
    },
    withdrawals: {
      total:       Number(totalWithdrawalsAgg._sum.netAmount ?? 0),
      totalCount:  totalWithdrawalsAgg._count,
    },
    investments: {
      activeAmount: Number(activeInvestmentsAgg._sum.principalAmount ?? 0),
      activeCount:  activeInvestmentsAgg._count,
    },
    wallet: {
      totalMainBalance:     Number(walletAgg._sum.mainBalance     ?? 0),
      totalInvestedBalance: Number(walletAgg._sum.investedBalance ?? 0),
    },
  };
}

// ─── New user chart data (last 30 days) ───────────────────────────────────────

export async function getUserGrowthData() {
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
    FROM users
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY 1 ORDER BY 1
  `;
  return rows.map((r) => ({
    date:  r.day.toISOString().split("T")[0],
    users: Number(r.count),
  }));
}

// ─── Deposit chart data (last 30 days) ────────────────────────────────────────

export async function getDepositChartData() {
  const rows = await prisma.$queryRaw<{ day: Date; total: string }[]>`
    SELECT DATE_TRUNC('day', "depositedAt") AS day, SUM(amount)::text AS total
    FROM deposit_requests
    WHERE status = 'SUCCESS' AND "depositedAt" >= NOW() - INTERVAL '30 days'
    GROUP BY 1 ORDER BY 1
  `;
  return rows.map((r) => ({
    date:   r.day.toISOString().split("T")[0],
    amount: Number(r.total),
  }));
}

// ─── KYC list ─────────────────────────────────────────────────────────────────

export async function getKycList(
  status: KycStatus | "ALL",
  page:   number,
  limit:  number
) {
  const where = status === "ALL" ? {} : { status };
  const skip  = (page - 1) * limit;

  const [records, total] = await Promise.all([
    prisma.kycDocument.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.kycDocument.count({ where }),
  ]);

  return { records, total, pages: Math.ceil(total / limit) };
}

// ─── Single KYC document ─────────────────────────────────────────────────────

export async function getKycById(id: string) {
  return prisma.kycDocument.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, phone: true,
          createdAt: true, lastLoginAt: true, kycStatus: true,
          isFrozen: true, role: true,
        },
      },
      reviewer: { select: { id: true, name: true } },
    },
  });
}

// ─── Approve / Reject KYC ────────────────────────────────────────────────────

export async function approveKyc(kycId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.kycDocument.update({
      where: { id: kycId },
      data: {
        status:      "APPROVED",
        verifiedAt:  new Date(),
        reviewedById: adminId,
      },
      select: { userId: true },
    });
    await tx.user.update({
      where: { id: doc.userId },
      data:  { kycStatus: "APPROVED", kycVerified: true },
    });
    await tx.adminAuditLog.create({
      data: {
        adminId,
        action:       "APPROVE",
        resourceType: "KYC",
        resourceId:   kycId,
        title:        "KYC Approved",
        status:       "SUCCESS",
      },
    });
    return doc;
  });
}

export async function rejectKyc(
  kycId:          string,
  adminId:        string,
  rejectionReason: string
) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.kycDocument.update({
      where: { id: kycId },
      data: {
        status:          "REJECTED",
        rejectedAt:      new Date(),
        rejectionReason,
        reviewedById:    adminId,
      },
      select: { userId: true },
    });
    await tx.user.update({
      where: { id: doc.userId },
      data: {
        kycStatus:         "REJECTED",
        kycVerified:       false,
        kycRejectedReason: rejectionReason,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        adminId,
        action:       "REJECT",
        resourceType: "KYC",
        resourceId:   kycId,
        title:        "KYC Rejected",
        description:  rejectionReason,
        status:       "SUCCESS",
      },
    });
    return doc;
  });
}

// ─── User list ────────────────────────────────────────────────────────────────

export async function getUserList(
  search: string,
  role:   Role | "ALL",
  page:   number,
  limit:  number
) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (role !== "ALL") where.role = role;
  if (search) {
    where.OR = [
      { name:  { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, kycStatus: true, isFrozen: true,
        mainBalance: true, investedBalance: true,
        createdAt: true, lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, pages: Math.ceil(total / limit) };
}

// ─── Single user ──────────────────────────────────────────────────────────────

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, kycStatus: true, kycRejectedReason: true,
      isFrozen: true, mainBalance: true, investedBalance: true,
      commissionBalance: true, createdAt: true, lastLoginAt: true,
      deletedAt: true,
      kycDocument: {
        select: {
          id: true, status: true, aadhaarNumber: true, panNumber: true,
          aadhaarFrontUrl: true, aadhaarBackUrl: true,
          panFrontUrl: true, selfieUrl: true,
          rejectionReason: true, createdAt: true, updatedAt: true,
        },
      },
      depositRequests: {
        select: { id: true, amount: true, status: true, depositedAt: true },
        orderBy: { depositedAt: "desc" },
        take: 5,
      },
      investments: {
        select: { id: true, principalAmount: true, status: true, investedAt: true },
        orderBy: { investedAt: "desc" },
        take: 5,
      },
    },
  });
}

// ─── Freeze / unfreeze user ───────────────────────────────────────────────────

export async function setUserFrozen(
  userId:  string,
  frozen:  boolean,
  adminId: string
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data:  { isFrozen: frozen },
    select: { id: true, name: true, isFrozen: true },
  });
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action:       frozen ? "DISABLE" : "ENABLE",
      resourceType: "USER",
      resourceId:   userId,
      title:        frozen ? "User Account Frozen" : "User Account Unfrozen",
      status:       "SUCCESS",
    },
  });
  return user;
}

// ─── Audit logs ───────────────────────────────────────────────────────────────

export async function getAuditLogs(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      include: { admin: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.adminAuditLog.count(),
  ]);
  return { logs, total, pages: Math.ceil(total / limit) };
}

// ─── Update KYC status (admin override) ──────────────────────────────────────

export async function updateUserKycStatus(
  userId:          string,
  adminId:         string,
  newStatus:       KycStatus,
  rejectionReason?: string
) {
  return prisma.$transaction(async (tx) => {
    // Fetch previous status for audit log
    const prev = await tx.user.findUniqueOrThrow({
      where:  { id: userId },
      select: { kycStatus: true, kycDocument: { select: { id: true } } },
    });

    const isApproved = newStatus === "APPROVED" || newStatus === "AUTO_APPROVED";
    const isRejected = newStatus === "REJECTED";

    // Update the user record
    await tx.user.update({
      where: { id: userId },
      data:  {
        kycStatus:         newStatus,
        kycVerified:       isApproved,
        kycRejectedReason: isRejected ? (rejectionReason ?? null) : null,
      },
    });

    // Update the KYC document record if one exists
    if (prev.kycDocument?.id) {
      await tx.kycDocument.update({
        where: { id: prev.kycDocument.id },
        data: {
          status:          newStatus,
          verifiedAt:      isApproved ? new Date() : null,
          rejectedAt:      isRejected ? new Date() : null,
          rejectionReason: isRejected ? (rejectionReason ?? null) : null,
          reviewedById:    adminId,
        },
      });
    }

    // Audit log
    await tx.adminAuditLog.create({
      data: {
        adminId,
        action:       newStatus === "APPROVED" || newStatus === "AUTO_APPROVED" ? "APPROVE" : newStatus === "REJECTED" ? "REJECT" : "UPDATE",
        resourceType: "KYC",
        resourceId:   userId,
        title:        `KYC Status Updated to ${newStatus}`,
        description:  isRejected ? (rejectionReason ?? undefined) : `Previous: ${prev.kycStatus}`,
        status:       "SUCCESS",
      },
    });

    return { previousStatus: prev.kycStatus, newStatus };
  });
}

// ─── Change user role ─────────────────────────────────────────────────────────

export async function changeUserRole(
  userId:   string,
  adminId:  string,
  newRole:  Role
) {
  return prisma.$transaction(async (tx) => {
    const prev = await tx.user.findUniqueOrThrow({
      where:  { id: userId },
      select: { role: true, name: true },
    });

    const updated = await tx.user.update({
      where:  { id: userId },
      data:   { role: newRole },
      select: { id: true, name: true, role: true },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId,
        action:       "UPDATE",
        resourceType: "USER",
        resourceId:   userId,
        title:        `User Role Changed: ${prev.role} → ${newRole}`,
        description:  `Role updated for ${prev.name}`,
        status:       "SUCCESS",
      },
    });

    return { previousRole: prev.role, newRole, user: updated };
  });
}

// ─── Reset / update user password ────────────────────────────────────────────

import bcrypt from "bcrypt";

export async function resetUserPassword(
  userId:      string,
  adminId:     string,
  newPassword: string
) {
  const hash = await bcrypt.hash(newPassword, 12);

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data:  {
        passwordHash:    hash,
        // Invalidate all existing sessions
        sessionRevokedAt: new Date(),
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId,
        action:       "RESET_PASSWORD",
        resourceType: "USER",
        resourceId:   userId,
        title:        "Admin Password Reset",
        description:  "Password was reset by an administrator. All active sessions invalidated.",
        status:       "SUCCESS",
      },
    });

    return { success: true };
  });
}

// ─── Wallet adjustment (credit / debit) ───────────────────────────────────────

export type WalletAdjustmentType = "CREDIT" | "DEBIT";

export async function adjustUserWallet(
  userId:  string,
  adminId: string,
  type:    WalletAdjustmentType,
  amount:  number,
  reason:  string,
  note?:   string
) {
  return prisma.$transaction(async (tx) => {
    // Fetch current balance — lock the row
    const user = await tx.user.findUniqueOrThrow({
      where:  { id: userId },
      select: { mainBalance: true, name: true },
    });

    const current = Number(user.mainBalance);

    if (type === "DEBIT" && amount > current) {
      throw new Error(`Insufficient balance. Available: ₹${current.toFixed(2)}`);
    }

    const newBalance = type === "CREDIT" ? current + amount : current - amount;

    if (newBalance < 0) {
      throw new Error("Wallet balance cannot go negative.");
    }

    // Update balance
    const updated = await tx.user.update({
      where:  { id: userId },
      data:   { mainBalance: newBalance },
      select: { id: true, mainBalance: true },
    });

    // Create ledger entry
    await tx.ledger.create({
      data: {
        userId,
        entryType:        type === "CREDIT" ? "CREDIT" : "DEBIT",
        transactionType:  "ADJUSTMENT",
        referenceType:    "ADMIN_ADJUSTMENT",
        amount,
        balanceBefore:    current,
        balanceAfter:     newBalance,
        description:      reason + (note ? ` — ${note}` : ""),
      },
    });

    // Audit log
    await tx.adminAuditLog.create({
      data: {
        adminId,
        action:       "UPDATE",
        resourceType: "USER",
        resourceId:   userId,
        title:        `Wallet ${type === "CREDIT" ? "Credit" : "Debit"}: ₹${amount.toFixed(2)}`,
        description:  reason + (note ? ` | Note: ${note}` : ""),
        status:       "SUCCESS",
      },
    });

    return {
      previousBalance: current,
      newBalance:      Number(updated.mainBalance),
      type,
      amount,
    };
  });
}
