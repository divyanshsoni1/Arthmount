/**
 * Wallet repository — all Prisma queries for wallet and deposit operations.
 *
 * Key design decisions:
 *  - Wallet balance lives on User.mainBalance (no separate Wallet table)
 *  - Every recharge creates a DepositRequest row (existing model)
 *  - Atomic credit uses a Prisma $transaction to prevent double-credit
 *  - gatewayOrderId unique constraint prevents replay attacks
 */

import { prisma }  from "@/lib/prisma";
import type { DepositRequest, DepositStatus } from "@/lib/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DepositRecord = Pick<
  DepositRequest,
  | "id"
  | "userId"
  | "amount"
  | "method"
  | "status"
  | "gatewayOrderId"
  | "gatewayPaymentId"
  | "gatewayTransactionId"
  | "transactionReference"
  | "rejectionReason"
  | "remarks"
  | "depositedAt"
  | "createdAt"
  | "updatedAt"
>;

const DEPOSIT_SELECT = {
  id:                    true,
  userId:                true,
  amount:                true,
  method:                true,
  status:                true,
  gatewayOrderId:        true,
  gatewayPaymentId:      true,
  gatewayTransactionId:  true,
  transactionReference:  true,
  rejectionReason:       true,
  remarks:               true,
  depositedAt:           true,
  createdAt:             true,
  updatedAt:             true,
} as const;

// ─── Wallet balance ────────────────────────────────────────────────────────

export interface WalletBalance {
  mainBalance:        number | string | { toNumber(): number };
  investedBalance:    number | string | { toNumber(): number };
  commissionBalance:  number | string | { toNumber(): number };
}

export async function getWalletBalance(userId: string): Promise<WalletBalance | null> {
  return prisma.user.findUnique({
    where:  { id: userId },
    select: {
      mainBalance:       true,
      investedBalance:   true,
      commissionBalance: true,
    },
  });
}

// ─── Create deposit request ────────────────────────────────────────────────

export async function createDepositRequest(
  userId:               string,
  amountRupees:         number,
  razorpayOrderId:      string,
  transactionReference: string
): Promise<DepositRecord> {
  return prisma.depositRequest.create({
    data: {
      userId,
      amount:               amountRupees,
      method:               "UPI",        // will be updated after payment
      gatewayOrderId:       razorpayOrderId,
      transactionReference,
      status:               "PENDING",
    },
    select: DEPOSIT_SELECT,
  });
}

// ─── Find deposit by Razorpay order ID ────────────────────────────────────

export async function findDepositByOrderId(
  razorpayOrderId: string
): Promise<DepositRecord | null> {
  return prisma.depositRequest.findUnique({
    where:  { gatewayOrderId: razorpayOrderId },
    select: DEPOSIT_SELECT,
  });
}

// ─── Atomic: verify + credit wallet in one transaction ─────────────────────

export async function atomicCreditWallet(
  depositId:         string,
  userId:            string,
  amountRupees:      number,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Mark deposit as SUCCESS and record payment IDs
    await tx.depositRequest.update({
      where: { id: depositId },
      data: {
        status:                "SUCCESS",
        gatewayPaymentId:      razorpayPaymentId,
        gatewayTransactionId:  razorpaySignature,
        reviewedAt:            new Date(),
        remarks:               "Razorpay payment verified",
      },
    });

    // 2. Fetch current balance BEFORE incrementing (for accurate ledger entry)
    const userBefore = await tx.user.findUnique({
      where:  { id: userId },
      select: { mainBalance: true },
    });
    const balanceBefore = Number(userBefore!.mainBalance);

    // 3. Increment user's mainBalance
    await tx.user.update({
      where: { id: userId },
      data: {
        mainBalance: { increment: amountRupees },
      },
    });

    // 4. Write a Ledger entry for the credit
    await tx.ledger.create({
      data: {
        userId,
        transactionType: "DEPOSIT",
        entryType:       "CREDIT",
        amount:          amountRupees,
        balanceBefore,
        balanceAfter:    balanceBefore + amountRupees,
        referenceType:   "DEPOSIT",
        referenceId:     depositId,
        description:     `Wallet recharge via Razorpay`,
      },
    });
  });
}

// ─── Mark deposit as failed / cancelled ────────────────────────────────────

export async function failDeposit(
  depositId: string,
  reason:    string
): Promise<void> {
  await prisma.depositRequest.update({
    where: { id: depositId },
    data: {
      status:          "FAILED",
      rejectionReason: reason,
    },
  });
}

// ─── Payment history ───────────────────────────────────────────────────────

export async function getDepositHistory(
  userId: string,
  page:   number = 1,
  limit:  number = 20
): Promise<{ records: DepositRecord[]; total: number }> {
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    prisma.depositRequest.findMany({
      where:   { userId },
      select:  DEPOSIT_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take:    limit,
    }),
    prisma.depositRequest.count({ where: { userId } }),
  ]);

  return { records, total };
}
