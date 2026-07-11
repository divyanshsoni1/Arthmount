/**
 * Wallet service — all business logic for wallet recharge.
 *
 * createOrder      – validates amount, creates Razorpay order + DepositRequest
 * verifyAndCredit  – verifies signature, atomically credits wallet (idempotent)
 * getBalance       – returns user wallet balance
 * getHistory       – returns paginated deposit history
 */

import { randomBytes }              from "crypto";
import { AuthError }                from "@/server/auth/auth.service";
import { createRazorpayOrder, verifyRazorpaySignature } from "@/lib/razorpay/server";
import {
  getWalletBalance,
  createDepositRequest,
  findDepositByOrderId,
  atomicCreditWallet,
  failDeposit,
  getDepositHistory,
  type DepositRecord,
  type WalletBalance,
} from "./wallet.repository";

// ─── Constants ─────────────────────────────────────────────────────────────

const MIN_AMOUNT = 10;
const MAX_AMOUNT = 100_000;

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateReceiptId(): string {
  return `rcpt_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

// ─── 1. Get balance ─────────────────────────────────────────────────────────

export async function getBalance(userId: string): Promise<WalletBalance> {
  const balance = await getWalletBalance(userId);
  if (!balance) throw new AuthError("User not found.", "USER_NOT_FOUND", 404);
  return balance;
}

// ─── 2. Create Razorpay order ───────────────────────────────────────────────

export interface CreateOrderResult {
  depositId:   string;
  orderId:     string;
  amount:      number;   // paise
  currency:    string;
  keyId:       string;
}

export async function createOrder(
  userId:       string,
  amountRupees: number
): Promise<CreateOrderResult> {
  if (!Number.isFinite(amountRupees) || amountRupees < MIN_AMOUNT) {
    throw new AuthError(`Minimum recharge amount is ₹${MIN_AMOUNT}.`, "AMOUNT_TOO_LOW", 422);
  }
  if (amountRupees > MAX_AMOUNT) {
    throw new AuthError(`Maximum recharge amount is ₹${MAX_AMOUNT.toLocaleString("en-IN")}.`, "AMOUNT_TOO_HIGH", 422);
  }

  // Round to 2 decimal places to avoid floating-point issues
  const amount  = Math.round(amountRupees * 100) / 100;
  const receipt = generateReceiptId();

  // Create Razorpay order (server-side)
  const rzpOrder = await createRazorpayOrder(amount, receipt);

  // Persist deposit request immediately (status=PENDING)
  const deposit = await createDepositRequest(userId, amount, rzpOrder.orderId, receipt);

  return {
    depositId: deposit.id,
    orderId:   rzpOrder.orderId,
    amount:    rzpOrder.amount,
    currency:  rzpOrder.currency,
    keyId:     rzpOrder.keyId,
  };
}

// ─── 3. Verify payment + credit wallet ─────────────────────────────────────

export interface VerifyPaymentInput {
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResult {
  depositId:  string;
  amount:     number;
  newBalance: string;
}

export async function verifyAndCredit(
  userId: string,
  input:  VerifyPaymentInput
): Promise<VerifyPaymentResult> {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

  // Find the pending deposit
  const deposit = await findDepositByOrderId(razorpayOrderId);
  if (!deposit) {
    throw new AuthError("Deposit order not found.", "ORDER_NOT_FOUND", 404);
  }

  // Verify ownership — prevents one user from claiming another's payment
  if (deposit.userId !== userId) {
    throw new AuthError("Unauthorized.", "FORBIDDEN", 403);
  }

  // Idempotency — already credited
  if (deposit.status === "SUCCESS") {
    const balance = await getWalletBalance(userId);
    return {
      depositId:  deposit.id,
      amount:     Number(deposit.amount),
      newBalance: balance?.mainBalance.toString() ?? "0",
    };
  }

  // Verify Razorpay signature — MUST happen before any DB write
  const valid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) {
    await failDeposit(deposit.id, "Invalid Razorpay signature");
    throw new AuthError("Payment verification failed. Please contact support.", "INVALID_SIGNATURE", 400);
  }

  // Atomically credit wallet + mark deposit SUCCESS + write ledger entry
  await atomicCreditWallet(
    deposit.id,
    userId,
    Number(deposit.amount),
    razorpayPaymentId,
    razorpaySignature
  );

  const balance = await getWalletBalance(userId);

  return {
    depositId:  deposit.id,
    amount:     Number(deposit.amount),
    newBalance: balance?.mainBalance.toString() ?? "0",
  };
}

// ─── 4. Payment history ─────────────────────────────────────────────────────

export interface HistoryResult {
  records: DepositRecord[];
  total:   number;
  page:    number;
  pages:   number;
}

export async function getHistory(
  userId: string,
  page:   number,
  limit:  number
): Promise<HistoryResult> {
  const { records, total } = await getDepositHistory(userId, page, limit);
  return {
    records,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}
