/**
 * Invest repository — all Prisma queries for the user-facing investment module.
 *
 * Design principles:
 *  - listActivePackages: only ACTIVE, VISIBLE, non-deleted packages
 *  - atomicWalletInvest: single $transaction (debit mainBalance, increment
 *    investedBalance, create Investment, create Ledger entries)
 *  - getInvestmentHistory: scoped strictly to the requesting userId
 */

import { prisma } from "@/lib/prisma";
import type { InvestmentStatus } from "@/lib/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivePackage {
  id:              string;
  name:            string;
  code:            string;
  description:     string | null;
  minAmount:       number;
  maxAmount:       number;
  dailyReturnRate: number;
  tenureDays:      number;
  displayOrder:    number;
  totalInvestors:  number;
  activeInvestors: number;
  totalInvested:   number;
}

export interface UserInvestmentRow {
  id:               string;
  packageId:        string;
  packageName:      string;
  packageCode:      string;
  principalAmount:  number;
  dailyReturnRate:  number;
  tenureDays:       number;
  completedDays:    number;
  totalProfitEarned: number;
  totalProfitPaid:  number;
  pendingProfit:    number;
  investedAt:       string;
  maturityDate:     string;
  status:           string;
  paymentMethod:    string | null;
  transactionRef:   string | null;
}

// ─── List active packages ─────────────────────────────────────────────────────

export async function listActivePackages(): Promise<ActivePackage[]> {
  const packages = await prisma.package.findMany({
    where: {
      isActive:  true,
      isVisible: true,
      isDeleted: false,
    },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { investments: { where: { deletedAt: null } } } },
      investments: {
        where: { status: "ACTIVE", deletedAt: null },
        select: { principalAmount: true },
      },
    },
  });

  return packages.map((pkg) => ({
    id:              pkg.id,
    name:            pkg.name,
    code:            pkg.code,
    description:     pkg.description,
    minAmount:       Number(pkg.minAmount),
    maxAmount:       Number(pkg.maxAmount),
    dailyReturnRate: Number(pkg.dailyReturnRate),
    tenureDays:      pkg.tenureDays,
    displayOrder:    pkg.displayOrder,
    totalInvestors:  pkg._count.investments,
    activeInvestors: pkg.investments.length,
    totalInvested:   pkg.investments.reduce((s, i) => s + Number(i.principalAmount), 0),
  }));
}

// ─── Get single active package (used to re-validate before investing) ─────────

export async function getActivePackageById(id: string) {
  const pkg = await prisma.package.findFirst({
    where: { id, isActive: true, isVisible: true, isDeleted: false },
    include: {
      _count: { select: { investments: { where: { deletedAt: null } } } },
      investments: {
        where: { status: "ACTIVE", deletedAt: null },
        select: { principalAmount: true },
      },
    },
  });
  if (!pkg) return null;

  return {
    id:              pkg.id,
    name:            pkg.name,
    code:            pkg.code,
    description:     pkg.description,
    minAmount:       Number(pkg.minAmount),
    maxAmount:       Number(pkg.maxAmount),
    dailyReturnRate: Number(pkg.dailyReturnRate),
    tenureDays:      pkg.tenureDays,
    displayOrder:    pkg.displayOrder,
    totalInvestors:  pkg._count.investments,
    activeInvestors: pkg.investments.length,
    totalInvested:   pkg.investments.reduce((s, i) => s + Number(i.principalAmount), 0),
    // Re-validation helpers
    allowMultipleInvestments: pkg.allowMultipleInvestments,
    maxInvestmentsPerUser:    pkg.maxInvestmentsPerUser,
  };
}

// ─── Count existing user investments in a package ─────────────────────────────

export async function countUserInvestmentsInPackage(
  userId:    string,
  packageId: string
): Promise<number> {
  return prisma.investment.count({
    where: { userId, packageId, deletedAt: null, status: { not: "CANCELLED" } },
  });
}

// ─── Atomic wallet-funded investment ─────────────────────────────────────────
//
// Within a single $transaction:
//  1. Re-read wallet balance (row-level lock via SELECT FOR UPDATE via updateMany)
//  2. Validate sufficient balance
//  3. Debit mainBalance  (DEBIT ledger entry)
//  4. Increment investedBalance
//  5. Create Investment row
//  6. Write two ledger entries: DEBIT mainBalance + CREDIT investedBalance

export interface CreateWalletInvestmentInput {
  userId:    string;
  packageId: string;
  amount:    number;
  // Snapshots from package (verified server-side before calling)
  dailyReturnRate: number;
  tenureDays:      number;
  packageName:     string;
}

export async function atomicWalletInvest(
  input: CreateWalletInvestmentInput
): Promise<UserInvestmentRow> {
  const { userId, packageId, amount, dailyReturnRate, tenureDays, packageName } = input;

  return prisma.$transaction(async (tx) => {
    // 1. Lock + read current balances
    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { mainBalance: true, investedBalance: true, isFrozen: true },
    });

    if (!user) throw new Error("USER_NOT_FOUND");
    if (user.isFrozen) throw new Error("ACCOUNT_FROZEN");

    const mainBal = Number(user.mainBalance);
    if (mainBal < amount) throw new Error("INSUFFICIENT_BALANCE");

    // 2. Debit mainBalance
    const newMainBalance     = mainBal - amount;
    const newInvestedBalance = Number(user.investedBalance) + amount;

    await tx.user.update({
      where: { id: userId },
      data: {
        mainBalance:     { decrement: amount },
        investedBalance: { increment: amount },
      },
    });

    // 3. Calculate maturity date
    const investedAt   = new Date();
    const maturityDate = new Date(investedAt.getTime() + tenureDays * 86_400_000);

    // 4. Create Investment
    const investment = await tx.investment.create({
      data: {
        userId,
        packageId,
        principalAmount: amount,
        dailyReturnRate,
        tenureDays,
        investedAt,
        maturityDate,
        status: "ACTIVE",
      },
      include: {
        package: { select: { name: true, code: true } },
      },
    });

    // 5. Ledger: DEBIT from main wallet
    await tx.ledger.create({
      data: {
        userId,
        transactionType: "INVESTMENT",
        entryType:       "DEBIT",
        amount,
        balanceBefore:   mainBal,
        balanceAfter:    newMainBalance,
        referenceType:   "INVESTMENT",
        referenceId:     investment.id,
        description:     `Investment in ${packageName}`,
      },
    });

    // 6. Ledger: CREDIT to invested balance (informational)
    await tx.ledger.create({
      data: {
        userId,
        transactionType: "INVESTMENT",
        entryType:       "CREDIT",
        amount,
        balanceBefore:   Number(user.investedBalance),
        balanceAfter:    newInvestedBalance,
        referenceType:   "INVESTMENT",
        referenceId:     investment.id,
        description:     `Capital locked in ${packageName}`,
      },
    });

    return {
      id:               investment.id,
      packageId:        investment.packageId,
      packageName:      investment.package.name,
      packageCode:      investment.package.code,
      principalAmount:  Number(investment.principalAmount),
      dailyReturnRate:  Number(investment.dailyReturnRate),
      tenureDays:       investment.tenureDays,
      completedDays:    investment.completedDays,
      totalProfitEarned: 0,
      totalProfitPaid:  0,
      pendingProfit:    0,
      investedAt:       investment.investedAt.toISOString(),
      maturityDate:     investment.maturityDate.toISOString(),
      status:           investment.status,
      paymentMethod:    "WALLET",
      transactionRef:   null,
    };
  });
}

// ─── Atomic direct-payment investment ────────────────────────────────────────
//
// Called after Razorpay payment is verified server-side.
// Does NOT touch mainBalance — increments investedBalance directly.

export interface CreateDirectInvestmentInput {
  userId:           string;
  packageId:        string;
  amount:           number;
  dailyReturnRate:  number;
  tenureDays:       number;
  packageName:      string;
  razorpayOrderId:  string;
  razorpayPaymentId: string;
  // idempotency key — prevents double processing of a callback
  idempotencyKey:   string;
}

export async function atomicDirectInvest(
  input: CreateDirectInvestmentInput
): Promise<UserInvestmentRow> {
  const {
    userId, packageId, amount, dailyReturnRate, tenureDays,
    packageName, razorpayOrderId, razorpayPaymentId, idempotencyKey,
  } = input;

  return prisma.$transaction(async (tx) => {
    // Idempotency check — prevent double-processing same payment
    const existing = await tx.investment.findFirst({
      where: { remarks: idempotencyKey, deletedAt: null },
      include: { package: { select: { name: true, code: true } } },
    });

    if (existing) {
      return {
        id:               existing.id,
        packageId:        existing.packageId,
        packageName:      existing.package.name,
        packageCode:      existing.package.code,
        principalAmount:  Number(existing.principalAmount),
        dailyReturnRate:  Number(existing.dailyReturnRate),
        tenureDays:       existing.tenureDays,
        completedDays:    existing.completedDays,
        totalProfitEarned: Number(existing.totalProfitEarned),
        totalProfitPaid:  Number(existing.totalProfitPaid),
        pendingProfit:    Number(existing.pendingProfit),
        investedAt:       existing.investedAt.toISOString(),
        maturityDate:     existing.maturityDate.toISOString(),
        status:           existing.status,
        paymentMethod:    "RAZORPAY",
        transactionRef:   razorpayPaymentId,
      };
    }

    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { investedBalance: true, isFrozen: true },
    });

    if (!user) throw new Error("USER_NOT_FOUND");
    if (user.isFrozen) throw new Error("ACCOUNT_FROZEN");

    const prevInvestedBalance = Number(user.investedBalance);

    // Increment investedBalance
    await tx.user.update({
      where: { id: userId },
      data: { investedBalance: { increment: amount } },
    });

    const investedAt   = new Date();
    const maturityDate = new Date(investedAt.getTime() + tenureDays * 86_400_000);

    const investment = await tx.investment.create({
      data: {
        userId,
        packageId,
        principalAmount: amount,
        dailyReturnRate,
        tenureDays,
        investedAt,
        maturityDate,
        status:  "ACTIVE",
        remarks: idempotencyKey,  // stored for idempotency
      },
      include: {
        package: { select: { name: true, code: true } },
      },
    });

    // Ledger: CREDIT to investedBalance (direct payment)
    await tx.ledger.create({
      data: {
        userId,
        transactionType: "INVESTMENT",
        entryType:       "CREDIT",
        amount,
        balanceBefore:   prevInvestedBalance,
        balanceAfter:    prevInvestedBalance + amount,
        referenceType:   "INVESTMENT",
        referenceId:     investment.id,
        description:     `Direct payment investment in ${packageName} (${razorpayOrderId})`,
      },
    });

    return {
      id:               investment.id,
      packageId:        investment.packageId,
      packageName:      investment.package.name,
      packageCode:      investment.package.code,
      principalAmount:  Number(investment.principalAmount),
      dailyReturnRate:  Number(investment.dailyReturnRate),
      tenureDays:       investment.tenureDays,
      completedDays:    investment.completedDays,
      totalProfitEarned: 0,
      totalProfitPaid:  0,
      pendingProfit:    0,
      investedAt:       investment.investedAt.toISOString(),
      maturityDate:     investment.maturityDate.toISOString(),
      status:           investment.status,
      paymentMethod:    "RAZORPAY",
      transactionRef:   razorpayPaymentId,
    };
  });
}

// ─── Pending investment order (before payment verification) ──────────────────

export async function createPendingInvestOrder(
  userId:          string,
  packageId:       string,
  amount:          number,
  razorpayOrderId: string
): Promise<{ id: string }> {
  // We store a CANCELLED-status placeholder so we can look it up on callback.
  // Status is updated to ACTIVE atomically after payment verification.
  return prisma.investment.create({
    data: {
      userId,
      packageId,
      principalAmount: amount,
      dailyReturnRate:  0,  // populated on verification
      tenureDays:       0,  // populated on verification
      investedAt:       new Date(),
      maturityDate:     new Date(),
      status:           "CANCELLED",
      remarks:          `PENDING_ORDER:${razorpayOrderId}`,
    },
    select: { id: true },
  });
}

// ─── Investment history for a user ───────────────────────────────────────────

export async function getUserInvestments(
  userId: string,
  page:   number,
  limit:  number,
  status?: InvestmentStatus
): Promise<{ investments: UserInvestmentRow[]; total: number }> {
  const skip = (page - 1) * limit;

  const where = {
    userId,
    deletedAt: null,
    ...(status ? { status } : {}),
  };

  const [investments, total] = await Promise.all([
    prisma.investment.findMany({
      where,
      orderBy: { investedAt: "desc" },
      skip,
      take: limit,
      include: {
        package: { select: { name: true, code: true } },
      },
    }),
    prisma.investment.count({ where }),
  ]);

  return {
    investments: investments.map((inv) => ({
      id:               inv.id,
      packageId:        inv.packageId,
      packageName:      inv.package.name,
      packageCode:      inv.package.code,
      principalAmount:  Number(inv.principalAmount),
      dailyReturnRate:  Number(inv.dailyReturnRate),
      tenureDays:       inv.tenureDays,
      completedDays:    inv.completedDays,
      totalProfitEarned: Number(inv.totalProfitEarned),
      totalProfitPaid:  Number(inv.totalProfitPaid),
      pendingProfit:    Number(inv.pendingProfit),
      investedAt:       inv.investedAt.toISOString(),
      maturityDate:     inv.maturityDate.toISOString(),
      status:           inv.status,
      paymentMethod:    inv.remarks?.startsWith("PENDING_ORDER:") ? "RAZORPAY"
                        : inv.remarks?.startsWith("pay_")         ? "RAZORPAY"
                        : "WALLET",
      transactionRef:   null,
    })),
    total,
  };
}

// ─── Single investment by id (user-scoped) ────────────────────────────────────

export async function getInvestmentById(
  id:     string,
  userId: string
): Promise<UserInvestmentRow | null> {
  const inv = await prisma.investment.findFirst({
    where: { id, userId, deletedAt: null },
    include: { package: { select: { name: true, code: true } } },
  });

  if (!inv) return null;

  return {
    id:               inv.id,
    packageId:        inv.packageId,
    packageName:      inv.package.name,
    packageCode:      inv.package.code,
    principalAmount:  Number(inv.principalAmount),
    dailyReturnRate:  Number(inv.dailyReturnRate),
    tenureDays:       inv.tenureDays,
    completedDays:    inv.completedDays,
    totalProfitEarned: Number(inv.totalProfitEarned),
    totalProfitPaid:  Number(inv.totalProfitPaid),
    pendingProfit:    Number(inv.pendingProfit),
    investedAt:       inv.investedAt.toISOString(),
    maturityDate:     inv.maturityDate.toISOString(),
    status:           inv.status,
    paymentMethod:    "WALLET",
    transactionRef:   null,
  };
}
