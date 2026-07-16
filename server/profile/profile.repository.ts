/**
 * Profile repository — all Prisma queries scoped to the authenticated user.
 * Never pulls more fields than the profile layer needs.
 */

import { prisma }                          from "@/lib/prisma";
import { Gender, MaritalStatus }           from "@/lib/generated/prisma/client";
import type { User }                       from "@/lib/generated/prisma/client";

// ─── Projection ───────────────────────────────────────────────────────────────

const PROFILE_SELECT = {
  id:                true,
  name:              true,
  email:             true,
  phone:             true,
  role:              true,
  kycStatus:         true,
  kycVerified:       true,
  isFrozen:          true,
  twoFactorEnabled:  true,
  mainBalance:       true,
  investedBalance:   true,
  commissionBalance: true,
  createdAt:         true,
  lastLoginAt:       true,
  dob:               true,
  gender:            true,
  maritalStatus:     true,
} as const;

export type ProfileUser = {
  id:                string;
  name:              string;
  email:             string | null;
  phone:             string | null;
  role:              string;
  kycStatus:         string;
  kycVerified:       boolean;
  isFrozen:          boolean;
  twoFactorEnabled:  boolean;
  mainBalance:       string;
  investedBalance:   string;
  commissionBalance: string;
  createdAt:         Date;
  lastLoginAt:       Date | null;
  dob:               Date | null;
  gender:            string | null;
  maritalStatus:     string | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findProfileById(userId: string): Promise<ProfileUser | null> {
  const raw = await prisma.user.findUnique({
    where:  { id: userId, deletedAt: null },
    select: PROFILE_SELECT,
  });
  if (!raw) return null;
  return {
    ...raw,
    mainBalance:       raw.mainBalance.toString(),
    investedBalance:   raw.investedBalance.toString(),
    commissionBalance: raw.commissionBalance.toString(),
    gender:            raw.gender ?? null,
    maritalStatus:     raw.maritalStatus ?? null,
  };
}

// ─── Portfolio stats ──────────────────────────────────────────────────────────

export interface ProfileStats {
  totalInvestments:     number;
  activeInvestments:    number;
  completedInvestments: number;
  totalInvested:        number;
  totalProfit:          number;
  pendingReturns:       number;
  roi:                  string;
  totalDeposited:       number;
  totalWithdrawn:       number;
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const [
    activeInv,
    completedInv,
    totalInvAgg,
    pendingProfit,
    totalDeposited,
    totalWithdrawn,
  ] = await Promise.all([
    prisma.investment.count({ where: { userId, status: "ACTIVE",  deletedAt: null } }),
    prisma.investment.count({ where: { userId, status: "MATURED", deletedAt: null } }),
    prisma.investment.aggregate({
      where: { userId, deletedAt: null },
      _sum:  { principalAmount: true, totalProfitEarned: true },
      _count: true,
    }),
    prisma.investment.aggregate({
      where: { userId, deletedAt: null },
      _sum:  { pendingProfit: true },
    }),
    prisma.depositRequest.aggregate({
      where: { userId, status: "SUCCESS" },
      _sum:  { amount: true },
    }),
    prisma.withdrawal.aggregate({
      where: { userId, status: "COMPLETED" },
      _sum:  { amount: true },
    }),
  ]);

  const totalInvested  = Number(totalInvAgg._sum.principalAmount   ?? 0);
  const totalProfit    = Number(totalInvAgg._sum.totalProfitEarned ?? 0);
  const pendingReturns = Number(pendingProfit._sum.pendingProfit    ?? 0);
  const roi = totalInvested > 0
    ? ((totalProfit / totalInvested) * 100).toFixed(2)
    : "0.00";

  return {
    totalInvestments:     totalInvAgg._count,
    activeInvestments:    activeInv,
    completedInvestments: completedInv,
    totalInvested,
    totalProfit,
    pendingReturns,
    roi,
    totalDeposited: Number(totalDeposited._sum.amount ?? 0),
    totalWithdrawn: Number(totalWithdrawn._sum.amount ?? 0),
  };
}

// ─── Update name ──────────────────────────────────────────────────────────────

export async function updateUserName(userId: string, name: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data:  { name, updatedAt: new Date() },
  });
}

// ─── Update personal info (dob, gender, maritalStatus) ───────────────────────

export interface PersonalInfoUpdate {
  dob?:           Date | null;
  gender?:        Gender | null;
  maritalStatus?: MaritalStatus | null;
}

export async function updatePersonalInfo(
  userId: string,
  data:   PersonalInfoUpdate
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data:  { ...data, updatedAt: new Date() },
  });
}

// ─── Update email (only after OTP verified) ───────────────────────────────────

export async function updateUserEmail(userId: string, email: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data:  { email, updatedAt: new Date() },
  });
}

// ─── Update phone (only after OTP verified) ───────────────────────────────────

export async function updateUserPhone(userId: string, phone: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data:  { phone, updatedAt: new Date() },
  });
}

// ─── Duplicate checks ─────────────────────────────────────────────────────────

export async function emailTakenByOther(
  email:  string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.user.findFirst({
    where: {
      email:     { equals: email, mode: "insensitive" },
      id:        { not: userId },
      deletedAt: null,
    },
    select: { id: true },
  });
  return !!existing;
}

export async function phoneTakenByOther(
  phone:  string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.user.findFirst({
    where: {
      phone,
      id:        { not: userId },
      deletedAt: null,
    },
    select: { id: true },
  });
  return !!existing;
}
