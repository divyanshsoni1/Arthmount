/**
 * Withdraw service — all business logic for the withdrawal module.
 *
 * Exposes:
 *   getWithdrawSummary    – wallet balance + matured investments + pending stats
 *   requestWithdrawal     – validate + atomic debit + create withdrawal request
 *   cancelWithdrawal      – user-cancels a PENDING withdrawal (refunds wallet)
 *   getWithdrawalHistory  – paginated history with optional status filter
 *   getWithdrawalDetail   – single withdrawal detail (ownership enforced)
 *
 * Security model:
 *   - All amounts are re-read from DB inside the transaction (never trust client)
 *   - Idempotency key (transactionReference) prevents duplicate submissions
 *   - Frozen account check inside the transaction (race-condition safe)
 *   - Maturity date validated server-side for investment withdrawals
 *   - UPI format validated with regex
 *   - IFSC format validated with regex
 *   - Minimum/maximum withdrawal limits enforced
 *   - One active pending withdrawal per user at a time (configurable)
 */

import { randomBytes }  from "crypto";
import { AuthError }    from "@/server/auth/auth.service";
import {
  getUserBalanceSummary,
  getMaturedInvestments,
  getInvestmentSummary,
  getPendingWithdrawalTotal,
  hasPendingWithdrawal,
  findWithdrawalByRef,
  atomicWithdraw,
  cancelWithdrawal      as repoCancelWithdrawal,
  getWithdrawalById     as repoGetWithdrawalById,
  getWithdrawalHistory  as repoGetWithdrawalHistory,
  type WithdrawalRecord,
  type MaturedInvestment,
} from "./withdraw.repository";
import type { WithdrawalStatus } from "@/lib/generated/prisma/client";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_WITHDRAWAL    = 10;        // ₹10 minimum
const MAX_WITHDRAWAL    = 500_000;   // ₹5,00,000 per request
const WITHDRAWAL_FEE    = 0;         // ₹0 — adjust as needed
const WITHDRAWAL_TAX    = 0;         // 0% TDS — adjust if applicable
const UPI_REGEX         = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const IFSC_REGEX        = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NO_REGEX  = /^\d{9,18}$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateRef(): string {
  return `WDR-${Date.now()}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function calculateFees(amount: number): {
  fee: number; tax: number; netAmount: number;
} {
  const fee       = Math.round(WITHDRAWAL_FEE * 100) / 100;
  const taxAmount = Math.round(amount * WITHDRAWAL_TAX * 100) / 100;
  const net       = Math.round((amount - fee - taxAmount) * 100) / 100;
  return { fee, tax: taxAmount, netAmount: net };
}

function mapRepoError(msg: string): never {
  switch (msg) {
    case "USER_NOT_FOUND":
      throw new AuthError("User account not found.", "USER_NOT_FOUND", 404);
    case "ACCOUNT_FROZEN":
      throw new AuthError(
        "Your account is currently frozen. Please contact support.",
        "ACCOUNT_FROZEN",
        403
      );
    case "INSUFFICIENT_BALANCE":
      throw new AuthError(
        "Insufficient wallet balance for this withdrawal.",
        "INSUFFICIENT_BALANCE",
        422
      );
    case "NOT_FOUND":
      throw new AuthError("Withdrawal not found.", "NOT_FOUND", 404);
    case "CANNOT_CANCEL":
      throw new AuthError(
        "Only PENDING withdrawals can be cancelled.",
        "CANNOT_CANCEL",
        422
      );
    default:
      throw new AuthError(
        "Withdrawal could not be processed. Please try again.",
        "WITHDRAWAL_FAILED",
        500
      );
  }
}

// ─── 1. Summary ───────────────────────────────────────────────────────────────

export interface WithdrawSummary {
  walletBalance:        number;
  investedBalance:      number;
  maturedAmount:        number;
  maturedCount:         number;
  lockedAmount:         number;
  lockedCount:          number;
  totalWithdrawable:    number;  // walletBalance + maturedAmount
  pendingCount:         number;
  pendingAmount:        number;
  lifetimeAmount:       number;
  lifetimeCount:        number;
  maturedInvestments:   MaturedInvestment[];
}

export async function getWithdrawSummary(userId: string): Promise<WithdrawSummary> {
  const [balance, invSummary, pendingStats, matured] = await Promise.all([
    getUserBalanceSummary(userId),
    getInvestmentSummary(userId),
    getPendingWithdrawalTotal(userId),
    getMaturedInvestments(userId),
  ]);

  if (!balance) {
    throw new AuthError("User account not found.", "USER_NOT_FOUND", 404);
  }

  const totalWithdrawable = balance.mainBalance + invSummary.maturedAmount;

  return {
    walletBalance:     balance.mainBalance,
    investedBalance:   balance.investedBalance,
    maturedAmount:     invSummary.maturedAmount,
    maturedCount:      invSummary.maturedCount,
    lockedAmount:      invSummary.lockedAmount,
    lockedCount:       invSummary.lockedCount,
    totalWithdrawable,
    pendingCount:      pendingStats.pendingCount,
    pendingAmount:     pendingStats.pendingAmount,
    lifetimeAmount:    pendingStats.lifetimeAmount,
    lifetimeCount:     pendingStats.lifetimeCount,
    maturedInvestments: matured,
  };
}

// ─── 2. Request withdrawal ────────────────────────────────────────────────────

export type WithdrawalSource = "WALLET" | "INVESTMENT";

export interface BankPayoutDetails {
  method:            "BANK";
  accountHolderName: string;
  bankName:          string;
  accountNumber:     string;
  ifscCode:          string;
}

export interface UpiPayoutDetails {
  method: "UPI";
  upiId:  string;
}

export type PayoutDetails = BankPayoutDetails | UpiPayoutDetails;

export interface RequestWithdrawalInput {
  userId:       string;
  source:       WithdrawalSource;
  investmentId?: string;   // required when source = INVESTMENT
  amount:       number;
  payout:       PayoutDetails;
}

export async function requestWithdrawal(
  input: RequestWithdrawalInput
): Promise<WithdrawalRecord> {
  const { userId, source, investmentId, amount, payout } = input;

  // ── Basic amount validation ──────────────────────────────────────────────
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AuthError("Withdrawal amount must be a positive number.", "INVALID_AMOUNT", 422);
  }

  const rounded = Math.round(amount * 100) / 100;

  if (rounded < MIN_WITHDRAWAL) {
    throw new AuthError(
      `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL.toLocaleString("en-IN")}.`,
      "AMOUNT_TOO_LOW",
      422
    );
  }
  if (rounded > MAX_WITHDRAWAL) {
    throw new AuthError(
      `Maximum withdrawal per request is ₹${MAX_WITHDRAWAL.toLocaleString("en-IN")}.`,
      "AMOUNT_TOO_HIGH",
      422
    );
  }

  // ── Payout method validation ─────────────────────────────────────────────
  if (payout.method === "BANK") {
    const { accountHolderName, bankName, accountNumber, ifscCode } = payout;

    if (!accountHolderName?.trim()) {
      throw new AuthError("Account holder name is required.", "MISSING_ACCOUNT_HOLDER", 422);
    }
    if (!bankName?.trim()) {
      throw new AuthError("Bank name is required.", "MISSING_BANK_NAME", 422);
    }
    if (!accountNumber?.trim() || !ACCOUNT_NO_REGEX.test(accountNumber.trim())) {
      throw new AuthError(
        "Please enter a valid bank account number (9–18 digits).",
        "INVALID_ACCOUNT_NUMBER",
        422
      );
    }
    if (!ifscCode?.trim() || !IFSC_REGEX.test(ifscCode.trim().toUpperCase())) {
      throw new AuthError(
        "Please enter a valid IFSC code (e.g. SBIN0001234).",
        "INVALID_IFSC",
        422
      );
    }
  } else if (payout.method === "UPI") {
    if (!payout.upiId?.trim() || !UPI_REGEX.test(payout.upiId.trim())) {
      throw new AuthError(
        "Please enter a valid UPI ID (e.g. name@upi or 9999999999@paytm).",
        "INVALID_UPI",
        422
      );
    }
  } else {
    throw new AuthError("Invalid payout method. Choose BANK or UPI.", "INVALID_METHOD", 422);
  }

  // ── Account frozen check ─────────────────────────────────────────────────
  const balance = await getUserBalanceSummary(userId);
  if (!balance) {
    throw new AuthError("User account not found.", "USER_NOT_FOUND", 404);
  }
  if (balance.isFrozen) {
    throw new AuthError(
      "Your account is currently frozen. Please contact support.",
      "ACCOUNT_FROZEN",
      403
    );
  }

  // ── Source-specific validation ────────────────────────────────────────────
  if (source === "WALLET") {
    if (balance.mainBalance < rounded) {
      throw new AuthError(
        `Insufficient wallet balance. Available: ₹${balance.mainBalance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}.`,
        "INSUFFICIENT_BALANCE",
        422
      );
    }
  } else if (source === "INVESTMENT") {
    if (!investmentId) {
      throw new AuthError("Please select an investment to withdraw from.", "MISSING_INVESTMENT", 422);
    }

    const matured = await getMaturedInvestments(userId);
    const inv     = matured.find((m) => m.id === investmentId);

    if (!inv) {
      throw new AuthError(
        "Investment not found or not yet matured. Withdrawals are only allowed after the lock-in period ends.",
        "INVESTMENT_NOT_MATURED",
        422
      );
    }

    const available = inv.principalAmount + inv.totalProfitEarned;
    if (rounded > available) {
      throw new AuthError(
        `Amount exceeds investment value. Available: ₹${available.toLocaleString("en-IN", { maximumFractionDigits: 2 })}.`,
        "EXCEEDS_INVESTMENT_VALUE",
        422
      );
    }

    // For investment-sourced withdrawals the funds must already be in mainBalance
    // (the investment lifecycle cron credits mainBalance at maturity).
    // If not credited yet we fall back to a pre-flight check against investedBalance.
    if (balance.mainBalance < rounded) {
      throw new AuthError(
        `Insufficient wallet balance. Your matured investment proceeds may still be processing. Available: ₹${balance.mainBalance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}.`,
        "INSUFFICIENT_BALANCE",
        422
      );
    }
  } else {
    throw new AuthError("Invalid withdrawal source.", "INVALID_SOURCE", 422);
  }

  // ── Duplicate pending withdrawal guard ────────────────────────────────────
  const alreadyPending = await hasPendingWithdrawal(userId);
  if (alreadyPending) {
    throw new AuthError(
      "You already have a withdrawal request pending. Please wait for it to be processed before submitting a new one.",
      "DUPLICATE_WITHDRAWAL",
      422
    );
  }

  // ── Idempotency key ───────────────────────────────────────────────────────
  const ref = generateRef();

  // Paranoia: ensure uniqueness (astronomically unlikely but safe)
  const existing = await findWithdrawalByRef(ref);
  if (existing) {
    throw new AuthError(
      "Duplicate reference detected. Please try again.",
      "DUPLICATE_REF",
      409
    );
  }

  // ── Fee calculation ───────────────────────────────────────────────────────
  const { fee, tax, netAmount } = calculateFees(rounded);

  // ── Atomic withdrawal ─────────────────────────────────────────────────────
  try {
    const withdrawal = await atomicWithdraw({
      userId,
      amount:   rounded,
      fee,
      tax,
      netAmount,
      method:   payout.method,
      transactionReference: ref,
      ...(payout.method === "BANK"
        ? {
            accountHolderName: payout.accountHolderName.trim(),
            bankName:          payout.bankName.trim(),
            accountNumber:     payout.accountNumber.trim(),
            ifscCode:          payout.ifscCode.trim().toUpperCase(),
          }
        : { upiId: payout.upiId.trim() }),
    });

    return withdrawal;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (err instanceof Error) mapRepoError(err.message);
    throw new AuthError(
      "Withdrawal could not be processed. Please try again.",
      "WITHDRAWAL_FAILED",
      500
    );
  }
}

// ─── 3. Cancel withdrawal ─────────────────────────────────────────────────────

export async function cancelWithdrawal(
  id:     string,
  userId: string
): Promise<WithdrawalRecord> {
  try {
    return await repoCancelWithdrawal(id, userId);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (err instanceof Error) mapRepoError(err.message);
    throw new AuthError(
      "Cancellation could not be processed. Please try again.",
      "CANCEL_FAILED",
      500
    );
  }
}

// ─── 4. Withdrawal history ────────────────────────────────────────────────────

export interface WithdrawalHistoryResult {
  records: WithdrawalRecord[];
  total:   number;
  page:    number;
  pages:   number;
}

export async function getWithdrawalHistory(
  userId: string,
  page:   number,
  limit:  number,
  status?: string
): Promise<WithdrawalHistoryResult> {
  const validStatuses: WithdrawalStatus[] = [
    "PENDING", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED", "FAILED", "CANCELLED",
  ];
  const statusFilter = status && validStatuses.includes(status as WithdrawalStatus)
    ? (status as WithdrawalStatus)
    : undefined;

  const { records, total } = await repoGetWithdrawalHistory(userId, page, limit, statusFilter);
  return { records, total, page, pages: Math.ceil(total / limit) };
}

// ─── 5. Single withdrawal detail ─────────────────────────────────────────────

export async function getWithdrawalDetail(
  id:     string,
  userId: string
): Promise<WithdrawalRecord> {
  const withdrawal = await repoGetWithdrawalById(id, userId);
  if (!withdrawal) {
    throw new AuthError("Withdrawal not found.", "NOT_FOUND", 404);
  }
  return withdrawal;
}

// ─── 6. Fee preview (called by frontend before submission) ───────────────────

export interface FeePreview {
  amount:    number;
  fee:       number;
  tax:       number;
  netAmount: number;
  processingTime: string;
}

export function previewFees(amount: number): FeePreview {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { amount: 0, fee: 0, tax: 0, netAmount: 0, processingTime: "1–2 business days" };
  }
  const rounded = Math.round(amount * 100) / 100;
  const { fee, tax, netAmount } = calculateFees(rounded);
  return {
    amount:    rounded,
    fee,
    tax,
    netAmount,
    processingTime: "1–2 business days",
  };
}
