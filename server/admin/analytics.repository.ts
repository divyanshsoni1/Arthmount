/**
 * Admin analytics repository — date-range aware queries for the premium dashboard.
 */

import { prisma } from "@/lib/prisma";

export type DateRange = "today" | "week" | "15days" | "month" | "3months" | "6months" | "year";

/** Returns a Date offset from "now" for the given range. */
function getRangeStart(range: DateRange): Date {
  const now = new Date();
  switch (range) {
    case "today":    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week":     return new Date(now.getTime() - 7   * 86_400_000);
    case "15days":   return new Date(now.getTime() - 15  * 86_400_000);
    case "month":    return new Date(now.getTime() - 30  * 86_400_000);
    case "3months":  return new Date(now.getTime() - 90  * 86_400_000);
    case "6months":  return new Date(now.getTime() - 180 * 86_400_000);
    case "year":     return new Date(now.getTime() - 365 * 86_400_000);
  }
}

/** Previous period start (same width, just before rangeStart). */
function getPrevRangeStart(range: DateRange, rangeStart: Date): Date {
  const now = new Date();
  const diffMs = now.getTime() - rangeStart.getTime();
  return new Date(rangeStart.getTime() - diffMs);
}

// ─── KPI Metrics ──────────────────────────────────────────────────────────────

export async function getAnalyticsKpis(range: DateRange) {
  const rangeStart = getRangeStart(range);
  const prevStart  = getPrevRangeStart(range, rangeStart);

  const [
    // Active investments (all-time AUM)
    activeInvAgg,
    // Deposits (capital) in range
    depositsCurrent,
    depositsPrev,
    // Wallet balance (all users, all-time)
    walletAgg,
    // Profit paid in range
    profitCurrent,
    profitPrev,
    // Today's profit specifically
    todayProfit,
    yesterdayProfit,
  ] = await Promise.all([
    prisma.investment.aggregate({
      where: { status: "ACTIVE" },
      _sum: { principalAmount: true },
    }),
    prisma.depositRequest.aggregate({
      where: { status: "SUCCESS", depositedAt: { gte: rangeStart } },
      _sum: { amount: true },
    }),
    prisma.depositRequest.aggregate({
      where: { status: "SUCCESS", depositedAt: { gte: prevStart, lt: rangeStart } },
      _sum: { amount: true },
    }),
    prisma.user.aggregate({
      _sum: { mainBalance: true, investedBalance: true },
    }),
    prisma.weeklyProfitAccumulation.aggregate({
      where: { status: "CREDITED", creditedAt: { gte: rangeStart } },
      _sum: { netProfit: true },
    }),
    prisma.weeklyProfitAccumulation.aggregate({
      where: { status: "CREDITED", creditedAt: { gte: prevStart, lt: rangeStart } },
      _sum: { netProfit: true },
    }),
    prisma.weeklyProfitAccumulation.aggregate({
      where: {
        status: "CREDITED",
        creditedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
        },
      },
      _sum: { netProfit: true },
    }),
    prisma.weeklyProfitAccumulation.aggregate({
      where: {
        status: "CREDITED",
        creditedAt: {
          gte: new Date(new Date().getTime() - 86_400_000 * 2),
          lt:  new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
        },
      },
      _sum: { netProfit: true },
    }),
  ]);

  const activeCapital    = Number(activeInvAgg._sum.principalAmount   ?? 0);
  const walletLiquidity  = Number(walletAgg._sum.mainBalance          ?? 0);
  const investedBalance  = Number(walletAgg._sum.investedBalance      ?? 0);
  const totalPortfolio   = activeCapital + walletLiquidity;

  const depositsCurr     = Number(depositsCurrent._sum.amount  ?? 0);
  const depositsPrevVal  = Number(depositsPrev._sum.amount     ?? 0);
  const profitCurr       = Number(profitCurrent._sum.netProfit ?? 0);
  const profitPrevVal    = Number(profitPrev._sum.netProfit    ?? 0);

  const todayProfitVal   = Number(todayProfit._sum.netProfit     ?? 0);
  const yesterdayProfitVal = Number(yesterdayProfit._sum.netProfit ?? 0);

  function pctChange(curr: number, prev: number): number {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100 * 10) / 10;
  }

  return {
    totalPortfolio,
    activeCapital,
    walletLiquidity,
    investedBalance,
    todayProfit:       todayProfitVal,
    depositsCurrent:   depositsCurr,
    portfolioChange:   pctChange(totalPortfolio, totalPortfolio - (depositsCurr - depositsPrevVal)),
    capitalChange:     pctChange(depositsCurr, depositsPrevVal),
    profitChange:      pctChange(profitCurr, profitPrevVal),
    todayProfitChange: pctChange(todayProfitVal, yesterdayProfitVal),
  };
}

// ─── Capital Health (invested vs withdrawn over time) ─────────────────────────

export async function getCapitalHealthChart(range: DateRange) {
  const rangeStart = getRangeStart(range);

  // Determine bucketing granularity
  const diffDays = Math.round((Date.now() - rangeStart.getTime()) / 86_400_000);
  const trunc = diffDays <= 1 ? "hour" : diffDays <= 90 ? "day" : "week";

  const [deposits, withdrawals] = await Promise.all([
    prisma.$queryRawUnsafe<{ bucket: Date; total: string }[]>(`
      SELECT DATE_TRUNC($1, "depositedAt") AS bucket, SUM(amount)::text AS total
      FROM deposit_requests
      WHERE status = 'SUCCESS' AND "depositedAt" >= $2
      GROUP BY 1 ORDER BY 1
    `, trunc, rangeStart),

    prisma.$queryRawUnsafe<{ bucket: Date; total: string }[]>(`
      SELECT DATE_TRUNC($1, "requestedAt") AS bucket, SUM("netAmount")::text AS total
      FROM withdrawals
      WHERE status = 'COMPLETED' AND "requestedAt" >= $2
      GROUP BY 1 ORDER BY 1
    `, trunc, rangeStart),
  ]);

  // Merge into a single time-keyed map
  const map = new Map<string, { invested: number; withdrawn: number }>();

  for (const row of deposits) {
    const key = row.bucket.toISOString();
    const entry = map.get(key) ?? { invested: 0, withdrawn: 0 };
    entry.invested = Number(row.total);
    map.set(key, entry);
  }
  for (const row of withdrawals) {
    const key = row.bucket.toISOString();
    const entry = map.get(key) ?? { invested: 0, withdrawn: 0 };
    entry.withdrawn = Number(row.total);
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, v]) => ({ date: iso, invested: v.invested, withdrawn: v.withdrawn }));
}

// ─── Capital by Package ───────────────────────────────────────────────────────

export async function getCapitalByPackage(range: DateRange) {
  const rangeStart = getRangeStart(range);

  const rows = await prisma.$queryRaw<{ name: string; total: string; count: bigint }[]>`
    SELECT p.name, SUM(i."principalAmount")::text AS total, COUNT(*)::bigint AS count
    FROM investments i
    JOIN packages p ON i."packageId" = p.id
    WHERE i."investedAt" >= ${rangeStart}
    GROUP BY p.name
    ORDER BY total DESC
  `;

  return rows.map((r) => ({
    package: r.name,
    amount:  Number(r.total),
    count:   Number(r.count),
  }));
}

// ─── Profit by Package ────────────────────────────────────────────────────────

export async function getProfitByPackage(range: DateRange) {
  const rangeStart = getRangeStart(range);

  const rows = await prisma.$queryRaw<{ name: string; profit: string; count: bigint }[]>`
    SELECT p.name, SUM(wp."netProfit")::text AS profit, COUNT(*)::bigint AS count
    FROM weekly_profit_accumulations wp
    JOIN investments i  ON wp."investmentId" = i.id
    JOIN packages    p  ON i."packageId"     = p.id
    WHERE wp.status = 'CREDITED' AND wp."creditedAt" >= ${rangeStart}
    GROUP BY p.name
    ORDER BY profit DESC
  `;

  return rows.map((r) => ({
    package: r.name,
    profit:  Number(r.profit),
    count:   Number(r.count),
  }));
}

// ─── Live Activity ────────────────────────────────────────────────────────────

export async function getLiveActivity(limit = 30) {
  const logs = await prisma.adminAuditLog.findMany({
    include: { admin: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Also grab latest investments + deposits for richer activity
  const [recentInvestments, recentDeposits, recentWithdrawals] = await Promise.all([
    prisma.investment.findMany({
      include: {
        user:    { select: { id: true, name: true } },
        package: { select: { name: true } },
      },
      orderBy: { investedAt: "desc" },
      take: 10,
    }),
    prisma.depositRequest.findMany({
      where: { status: "SUCCESS" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { depositedAt: "desc" },
      take: 10,
    }),
    prisma.withdrawal.findMany({
      where: { status: "COMPLETED" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { requestedAt: "desc" },
      take: 10,
    }),
  ]);

  type ActivityItem = {
    id:        string;
    type:      "investment" | "deposit" | "withdrawal" | "audit";
    userName:  string;
    action:    string;
    amount:    number | null;
    timestamp: string;
    status:    "success" | "pending" | "info";
    meta?:     string;
  };

  const items: ActivityItem[] = [];

  for (const inv of recentInvestments) {
    items.push({
      id:        inv.id,
      type:      "investment",
      userName:  inv.user.name,
      action:    `Invested in ${inv.package.name}`,
      amount:    Number(inv.principalAmount),
      timestamp: inv.investedAt.toISOString(),
      status:    "success",
      meta:      inv.package.name,
    });
  }

  for (const dep of recentDeposits) {
    items.push({
      id:        dep.id,
      type:      "deposit",
      userName:  dep.user.name,
      action:    "Wallet credited",
      amount:    Number(dep.amount),
      timestamp: (dep.depositedAt ?? dep.createdAt).toISOString(),
      status:    "success",
    });
  }

  for (const wd of recentWithdrawals) {
    items.push({
      id:        wd.id,
      type:      "withdrawal",
      userName:  wd.user.name,
      action:    "Withdrawal processed",
      amount:    Number(wd.netAmount),
      timestamp: wd.requestedAt.toISOString(),
      status:    "info",
    });
  }

  // Merge audit logs as generic activity
  for (const log of logs.slice(0, 10)) {
    items.push({
      id:        log.id,
      type:      "audit",
      userName:  log.admin?.name ?? "System",
      action:    log.title,
      amount:    null,
      timestamp: log.createdAt.toISOString(),
      status:    log.status === "SUCCESS" ? "success" : "info",
    });
  }

  // Sort all by timestamp desc, deduplicate by id
  const seen = new Set<string>();
  return items
    .filter((item) => { if (seen.has(item.id)) return false; seen.add(item.id); return true; })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 40);
}
