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
