/**
 * Dashboard repository — all Prisma queries for the user portfolio dashboard.
 * Every query is scoped to a single userId — users can only ever see their own data.
 */

import { prisma } from "@/lib/prisma";

// ─── Portfolio summary ────────────────────────────────────────────────────────

export async function getPortfolioSummary(userId: string) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart  = new Date(now.getFullYear(), 0, 1);

  const [
    user,
    activeInv,
    completedInv,
    totalInvAgg,
    totalProfitAgg,
    todayProfitAgg,
    monthProfitAgg,
    yearProfitAgg,
    recentDeposits,
    pendingWithdrawals,
  ] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id: true, name: true, email: true, phone: true,
        mainBalance: true, investedBalance: true, commissionBalance: true,
        kycStatus: true, createdAt: true, lastLoginAt: true,
      },
    }),

    prisma.investment.count({ where: { userId, status: "ACTIVE",  deletedAt: null } }),
    prisma.investment.count({ where: { userId, status: "MATURED", deletedAt: null } }),

    prisma.investment.aggregate({
      where:  { userId, deletedAt: null },
      _sum:   { principalAmount: true, totalProfitEarned: true },
      _count: true,
    }),

    // All-time profit
    prisma.investment.aggregate({
      where: { userId, deletedAt: null },
      _sum:  { totalProfitEarned: true },
    }),

    // Today's profit from weekly accumulations
    prisma.weeklyProfitAccumulation.aggregate({
      where: { userId, creditedAt: { gte: today } },
      _sum:  { netProfit: true },
    }),

    // This month's profit
    prisma.weeklyProfitAccumulation.aggregate({
      where: { userId, creditedAt: { gte: monthStart } },
      _sum:  { netProfit: true },
    }),

    // This year's profit
    prisma.weeklyProfitAccumulation.aggregate({
      where: { userId, creditedAt: { gte: yearStart } },
      _sum:  { netProfit: true },
    }),

    // Recent deposits
    prisma.depositRequest.findMany({
      where:   { userId, status: "SUCCESS" },
      orderBy: { depositedAt: "desc" },
      take: 5,
      select: { id: true, amount: true, depositedAt: true, status: true, method: true },
    }),

    // Pending withdrawals
    prisma.withdrawal.count({ where: { userId, status: "PENDING" } }),
  ]);

  const totalInvested    = Number(totalInvAgg._sum.principalAmount   ?? 0);
  const totalProfit      = Number(totalProfitAgg._sum.totalProfitEarned ?? 0);
  const todayProfit      = Number(todayProfitAgg._sum.netProfit  ?? 0);
  const monthProfit      = Number(monthProfitAgg._sum.netProfit  ?? 0);
  const yearProfit       = Number(yearProfitAgg._sum.netProfit   ?? 0);
  const walletBalance    = Number(user?.mainBalance ?? 0);
  const investedBalance  = Number(user?.investedBalance ?? 0);
  const portfolioValue   = walletBalance + investedBalance + totalProfit;

  const roi = totalInvested > 0
    ? ((totalProfit / totalInvested) * 100).toFixed(2)
    : "0.00";

  return {
    user,
    portfolioValue,
    walletBalance,
    investedBalance,
    totalInvested,
    totalProfit,
    todayProfit,
    monthProfit,
    yearProfit,
    roi,
    activeInvestments:    activeInv,
    completedInvestments: completedInv,
    totalInvestments:     totalInvAgg._count,
    pendingWithdrawals,
    recentDeposits: recentDeposits.map((d) => ({
      ...d,
      amount: Number(d.amount),
    })),
  };
}

// ─── Investment list ──────────────────────────────────────────────────────────

export async function getInvestmentHistory(
  userId: string,
  page:   number,
  limit:  number
) {
  const skip = (page - 1) * limit;
  const [investments, total] = await Promise.all([
    prisma.investment.findMany({
      where:   { userId, deletedAt: null },
      include: { package: { select: { name: true, code: true, dailyReturnRate: true } } },
      orderBy: { investedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.investment.count({ where: { userId, deletedAt: null } }),
  ]);

  return {
    investments: investments.map((inv) => ({
      id:              inv.id,
      packageName:     inv.package.name,
      packageCode:     inv.package.code,
      dailyReturnRate: Number(inv.package.dailyReturnRate),
      principalAmount: Number(inv.principalAmount),
      totalProfitEarned: Number(inv.totalProfitEarned),
      pendingProfit:   Number(inv.pendingProfit),
      status:          inv.status,
      investedAt:      inv.investedAt.toISOString(),
      maturityDate:    inv.maturityDate.toISOString(),
      completedDays:   inv.completedDays,
      tenureDays:      inv.tenureDays,
    })),
    total,
    pages: Math.ceil(total / limit),
  };
}

// ─── Profit chart data (last 30 days) ─────────────────────────────────────────

export async function getProfitChartData(userId: string) {
  const rows = await prisma.$queryRaw<{ day: Date; profit: string }[]>`
    SELECT DATE_TRUNC('day', "creditedAt") AS day, SUM("netProfit")::text AS profit
    FROM weekly_profit_accumulations
    WHERE "userId" = ${userId}::uuid
      AND "creditedAt" >= NOW() - INTERVAL '30 days'
    GROUP BY 1 ORDER BY 1
  `;
  return rows.map((r) => ({
    date:   r.day.toISOString().split("T")[0],
    profit: Number(r.profit),
  }));
}

// ─── Recent activity (ledger) ─────────────────────────────────────────────────

export async function getRecentActivity(userId: string, limit = 10) {
  const entries = await prisma.ledger.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    limit,
    select: {
      id: true, transactionType: true, entryType: true,
      amount: true, description: true, createdAt: true,
    },
  });
  return entries.map((e) => ({
    ...e,
    amount: Number(e.amount),
    createdAt: e.createdAt.toISOString(),
  }));
}
