/**
 * Packages repository — all Prisma queries for the admin packages module.
 * Called only from packages.controller.ts which enforces role checks.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PackageSortBy =
  | "latest" | "oldest"
  | "highestInvestment" | "lowestInvestment"
  | "mostInvestors" | "leastInvestors";

export type PackageStatus = "ACTIVE" | "INACTIVE" | "ALL";

// ─── List packages ────────────────────────────────────────────────────────────

export async function listPackages(opts: {
  search:   string;
  status:   PackageStatus;
  sortBy:   PackageSortBy;
  page:     number;
  limit:    number;
}) {
  const { search, status, sortBy, page, limit } = opts;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isDeleted: false };
  if (status === "ACTIVE")   where.isActive = true;
  if (status === "INACTIVE") where.isActive = false;
  if (search) where.name = { contains: search, mode: "insensitive" };

  // Build orderBy
  type OrderDir = "asc" | "desc";
  let orderBy: Record<string, OrderDir> = { createdAt: "desc" };
  if (sortBy === "oldest")            orderBy = { createdAt: "asc" };
  if (sortBy === "highestInvestment") orderBy = { maxAmount: "desc" };
  if (sortBy === "lowestInvestment")  orderBy = { minAmount: "asc" };
  // mostInvestors / leastInvestors — handled post-query (Prisma can't sort by _count in findMany easily)

  const [packages, total] = await Promise.all([
    prisma.package.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        _count: { select: { investments: true } },
        investments: {
          where: { status: "ACTIVE", deletedAt: null },
          select: { principalAmount: true },
        },
      },
    }),
    prisma.package.count({ where }),
  ]);

  let result = packages.map((pkg) => ({
    id:               pkg.id,
    name:             pkg.name,
    code:             pkg.code,
    description:      pkg.description,
    minAmount:        Number(pkg.minAmount),
    maxAmount:        Number(pkg.maxAmount),
    dailyReturnRate:  Number(pkg.dailyReturnRate),
    tenureDays:       pkg.tenureDays,
    isActive:         pkg.isActive,
    isVisible:        pkg.isVisible,
    displayOrder:     pkg.displayOrder,
    createdAt:        pkg.createdAt.toISOString(),
    updatedAt:        pkg.updatedAt.toISOString(),
    totalInvestors:   pkg._count.investments,
    activeInvestors:  pkg.investments.length,
    totalInvested:    pkg.investments.reduce((s, i) => s + Number(i.principalAmount), 0),
  }));

  // Sort by investor counts post-query
  if (sortBy === "mostInvestors")  result.sort((a, b) => b.totalInvestors - a.totalInvestors);
  if (sortBy === "leastInvestors") result.sort((a, b) => a.totalInvestors - b.totalInvestors);

  return { packages: result, total, pages: Math.ceil(total / limit) };
}

// ─── Single package summary ───────────────────────────────────────────────────

export async function getPackageById(id: string) {
  const pkg = await prisma.package.findFirst({
    where: { id, isDeleted: false },
    include: {
      _count: { select: { investments: true } },
      investments: {
        where: { deletedAt: null },
        select: {
          status: true,
          principalAmount: true,
          totalProfitPaid: true,
          pendingProfit: true,
          investedAt: true,
        },
      },
    },
  });
  if (!pkg) return null;

  const activeInvestments   = pkg.investments.filter((i) => i.status === "ACTIVE");
  const totalInvested       = pkg.investments.reduce((s, i) => s + Number(i.principalAmount), 0);
  const totalProfitPaid     = pkg.investments.reduce((s, i) => s + Number(i.totalProfitPaid), 0);
  const pendingProfit       = pkg.investments.reduce((s, i) => s + Number(i.pendingProfit), 0);
  const avgInvestment       = pkg.investments.length > 0 ? totalInvested / pkg.investments.length : 0;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayInvestors = pkg.investments.filter((i) => {
    const d = new Date(i.investedAt); d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const todayInvestment = todayInvestors.reduce((s, i) => s + Number(i.principalAmount), 0);

  return {
    id:               pkg.id,
    name:             pkg.name,
    code:             pkg.code,
    description:      pkg.description,
    minAmount:        Number(pkg.minAmount),
    maxAmount:        Number(pkg.maxAmount),
    dailyReturnRate:  Number(pkg.dailyReturnRate),
    tenureDays:       pkg.tenureDays,
    isActive:         pkg.isActive,
    isVisible:        pkg.isVisible,
    displayOrder:     pkg.displayOrder,
    createdAt:        pkg.createdAt.toISOString(),
    updatedAt:        pkg.updatedAt.toISOString(),
    totalInvestors:   pkg._count.investments,
    activeInvestments: activeInvestments.length,
    totalInvested,
    totalProfitPaid,
    pendingProfit,
    avgInvestment,
    todayInvestment,
    todayInvestors:   todayInvestors.length,
  };
}

// ─── Create package ───────────────────────────────────────────────────────────

export async function createPackage(data: {
  name: string; description?: string;
  minAmount: number; maxAmount: number;
  dailyReturnRate: number; tenureDays: number;
  isActive: boolean;
}, adminId: string) {
  // Generate a URL-safe code from name
  const code = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30)
    + "-" + Date.now().toString(36);

  const pkg = await prisma.package.create({
    data: {
      name:           data.name,
      code,
      description:    data.description ?? null,
      minAmount:      data.minAmount,
      maxAmount:      data.maxAmount,
      dailyReturnRate: data.dailyReturnRate,
      tenureDays:     data.tenureDays,
      isActive:       data.isActive,
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action:       "CREATE",
      resourceType: "PACKAGE",
      resourceId:   pkg.id,
      title:        `Package created: ${pkg.name}`,
      status:       "SUCCESS",
    },
  });

  return pkg;
}

// ─── Update package ───────────────────────────────────────────────────────────

export async function updatePackage(id: string, data: {
  name?: string; description?: string;
  minAmount?: number; maxAmount?: number;
  dailyReturnRate?: number; tenureDays?: number;
  isActive?: boolean; isVisible?: boolean;
}, adminId: string) {
  const pkg = await prisma.package.update({
    where: { id },
    data: {
      ...(data.name            !== undefined && { name: data.name }),
      ...(data.description     !== undefined && { description: data.description }),
      ...(data.minAmount       !== undefined && { minAmount: data.minAmount }),
      ...(data.maxAmount       !== undefined && { maxAmount: data.maxAmount }),
      ...(data.dailyReturnRate !== undefined && { dailyReturnRate: data.dailyReturnRate }),
      ...(data.tenureDays      !== undefined && { tenureDays: data.tenureDays }),
      ...(data.isActive        !== undefined && { isActive: data.isActive }),
      ...(data.isVisible       !== undefined && { isVisible: data.isVisible }),
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action:       "UPDATE",
      resourceType: "PACKAGE",
      resourceId:   id,
      title:        `Package updated: ${pkg.name}`,
      status:       "SUCCESS",
    },
  });

  return pkg;
}

// ─── Soft-delete package ──────────────────────────────────────────────────────

export async function deletePackage(id: string, adminId: string) {
  const pkg = await prisma.package.update({
    where: { id },
    data: { isDeleted: true, isActive: false, isVisible: false, deletedAt: new Date() },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action:       "DELETE",
      resourceType: "PACKAGE",
      resourceId:   id,
      title:        `Package deleted: ${pkg.name}`,
      status:       "SUCCESS",
    },
  });

  return pkg;
}

// ─── Toggle active status ─────────────────────────────────────────────────────

export async function setPackageActive(id: string, isActive: boolean, adminId: string) {
  const pkg = await prisma.package.update({
    where: { id },
    data: { isActive },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action:       isActive ? "ENABLE" : "DISABLE",
      resourceType: "PACKAGE",
      resourceId:   id,
      title:        isActive ? `Package activated: ${pkg.name}` : `Package stopped: ${pkg.name}`,
      status:       "SUCCESS",
    },
  });

  return pkg;
}

// ─── Package analytics ────────────────────────────────────────────────────────

export async function getPackageAnalytics(packageId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);

  // Capital growth over time
  const capitalGrowthRows = await prisma.$queryRaw<{ day: Date; total: string; count: bigint }[]>`
    SELECT DATE_TRUNC('day', "investedAt") AS day,
           SUM("principalAmount")::text    AS total,
           COUNT(*)::bigint                AS count
    FROM investments
    WHERE "packageId" = ${packageId}
      AND "investedAt" >= ${since}
      AND "deletedAt" IS NULL
    GROUP BY 1 ORDER BY 1
  `;

  // Profit distribution totals
  const profitAgg = await prisma.investment.aggregate({
    where: { packageId, deletedAt: null },
    _sum: { totalProfitPaid: true, pendingProfit: true, totalProfitEarned: true },
  });

  const paid      = Number(profitAgg._sum.totalProfitPaid   ?? 0);
  const pending   = Number(profitAgg._sum.pendingProfit     ?? 0);
  const earned    = Number(profitAgg._sum.totalProfitEarned ?? 0);
  const projected = earned - paid; // rough projection

  // Investor growth over time
  const investorGrowthRows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT DATE_TRUNC('day', "investedAt") AS day, COUNT(DISTINCT "userId")::bigint AS count
    FROM investments
    WHERE "packageId" = ${packageId}
      AND "investedAt" >= ${since}
      AND "deletedAt" IS NULL
    GROUP BY 1 ORDER BY 1
  `;

  // Investment distribution buckets
  const allInvestments = await prisma.investment.findMany({
    where: { packageId, deletedAt: null },
    select: { principalAmount: true },
  });

  const buckets = { "10K–50K": 0, "50K–1L": 0, "1L–5L": 0, "5L+": 0 };
  for (const inv of allInvestments) {
    const amt = Number(inv.principalAmount);
    if (amt < 50_000)        buckets["10K–50K"]++;
    else if (amt < 100_000)  buckets["50K–1L"]++;
    else if (amt < 500_000)  buckets["1L–5L"]++;
    else                     buckets["5L+"]++;
  }

  return {
    capitalGrowth: capitalGrowthRows.map((r) => ({
      date:   r.day.toISOString().split("T")[0],
      amount: Number(r.total),
      count:  Number(r.count),
    })),
    profitDistribution: [
      { name: "Paid Profit",      value: paid,      color: "#10b981" },
      { name: "Pending Profit",   value: pending,   color: "#f59e0b" },
      { name: "Projected Profit", value: projected, color: "#3b82f6" },
    ].filter((d) => d.value > 0),
    investorGrowth: investorGrowthRows.map((r) => ({
      date:  r.day.toISOString().split("T")[0],
      count: Number(r.count),
    })),
    investmentDistribution: Object.entries(buckets).map(([range, count]) => ({
      range, count,
    })),
  };
}

// ─── Top investors ────────────────────────────────────────────────────────────

export async function getTopInvestors(packageId: string, limit = 10) {
  const rows = await prisma.investment.groupBy({
    by: ["userId"],
    where: { packageId, deletedAt: null },
    _sum:   { principalAmount: true, totalProfitPaid: true },
    _count: { id: true },
    orderBy: { _sum: { principalAmount: "desc" } },
    take: limit,
  });

  const userIds = rows.map((r) => r.userId);
  const users   = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => {
    const u = userMap.get(r.userId);
    const principal = Number(r._sum.principalAmount ?? 0);
    const profit    = Number(r._sum.totalProfitPaid  ?? 0);
    return {
      userId:       r.userId,
      name:         u?.name ?? "Unknown",
      email:        u?.email ?? null,
      joinDate:     u?.createdAt.toISOString() ?? null,
      totalInvested: principal,
      totalProfit:   profit,
      investmentCount: r._count.id,
      growthPct:    principal > 0 ? Math.round((profit / principal) * 100 * 10) / 10 : 0,
    };
  });
}

// ─── Package investments (paginated table) ────────────────────────────────────

export async function getPackageInvestments(packageId: string, opts: {
  page:   number;
  limit:  number;
  search: string;
  status: string;
  sortBy: string;
}) {
  const { page, limit, search, status, sortBy } = opts;
  const skip = (page - 1) * limit;

  type OrderByClause = Record<string, "asc" | "desc">;
  let orderBy: OrderByClause = { investedAt: "desc" };
  if (sortBy === "amount_desc")   orderBy = { principalAmount: "desc" };
  if (sortBy === "amount_asc")    orderBy = { principalAmount: "asc" };
  if (sortBy === "profit_desc")   orderBy = { totalProfitPaid: "desc" };
  if (sortBy === "oldest")        orderBy = { investedAt: "asc" };

  const where: Prisma.InvestmentWhereInput = { packageId, deletedAt: null };
  if (status && status !== "ALL") where.status = status as Prisma.EnumInvestmentStatusFilter;
  if (search) where.user = { name: { contains: search, mode: "insensitive" } };

  const [investments, total] = await Promise.all([
    prisma.investment.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.investment.count({ where }),
  ]);

  return {
    investments: investments.map((inv) => ({
      id:               inv.id,
      userId:           inv.user.id,
      userName:         inv.user.name,
      userEmail:        inv.user.email,
      amount:           Number(inv.principalAmount),
      dailyReturnRate:  Number(inv.dailyReturnRate),
      tenureDays:       inv.tenureDays,
      completedDays:    inv.completedDays,
      remainingDays:    Math.max(0, inv.tenureDays - inv.completedDays),
      totalProfit:      Number(inv.totalProfitEarned),
      paidProfit:       Number(inv.totalProfitPaid),
      pendingProfit:    Number(inv.pendingProfit),
      investedAt:       inv.investedAt.toISOString(),
      maturityDate:     inv.maturityDate.toISOString(),
      status:           inv.status,
    })),
    total,
    pages: Math.ceil(total / limit),
  };
}

// ─── Package activity feed ────────────────────────────────────────────────────

export async function getPackageActivity(packageId: string, limit = 20) {
  const [investments, profits, auditLogs] = await Promise.all([
    prisma.investment.findMany({
      where: { packageId, deletedAt: null },
      orderBy: { investedAt: "desc" },
      take: limit,
      select: {
        id: true, principalAmount: true, status: true, investedAt: true,
        maturityDate: true,
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.weeklyProfitAccumulation.findMany({
      where: { investment: { packageId }, status: "CREDITED" },
      orderBy: { creditedAt: "desc" },
      take: 10,
      select: {
        id: true, netProfit: true, creditedAt: true,
        investment: { select: { user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.adminAuditLog.findMany({
      where: { resourceType: "PACKAGE", resourceId: packageId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, title: true, action: true, status: true, createdAt: true,
        admin: { select: { id: true, name: true } },
      },
    }),
  ]);

  type ActivityEntry = {
    id: string; type: string; title: string;
    amount: number | null; userName: string;
    timestamp: string; status: string;
  };

  const items: ActivityEntry[] = [];

  for (const inv of investments) {
    const isMatured = inv.status === "MATURED";
    items.push({
      id: `inv-${inv.id}`, type: "investment",
      title: isMatured ? `${inv.user.name} completed tenure` : `${inv.user.name} invested`,
      amount: Number(inv.principalAmount),
      userName: inv.user.name,
      timestamp: inv.investedAt.toISOString(),
      status: "success",
    });
  }

  for (const p of profits) {
    const name = p.investment.user.name;
    items.push({
      id: `profit-${p.id}`, type: "profit",
      title: `Profit distributed to ${name}`,
      amount: Number(p.netProfit),
      userName: name,
      timestamp: (p.creditedAt ?? new Date()).toISOString(),
      status: "success",
    });
  }

  for (const log of auditLogs) {
    items.push({
      id: `audit-${log.id}`, type: "audit",
      title: log.title,
      amount: null,
      userName: log.admin?.name ?? "System",
      timestamp: log.createdAt.toISOString(),
      status: log.status === "SUCCESS" ? "success" : "info",
    });
  }

  const seen = new Set<string>();
  return items
    .filter((i) => { if (seen.has(i.id)) return false; seen.add(i.id); return true; })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 40);
}
