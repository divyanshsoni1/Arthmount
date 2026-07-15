/**
 * Invest service — all business logic for the user-facing investment module.
 *
 * Exposes:
 *   getActivePackages     – list available packages
 *   getPackageDetail      – single package for detail modal
 *   investFromWallet      – validate + atomic debit + create investment
 *   createInvestOrder     – create Razorpay order for direct-payment flow
 *   verifyAndInvest       – verify Razorpay signature + create investment atomically
 *   getInvestments        – paginated investment history for a user
 *   getInvestmentDetail   – single investment detail
 */

import { randomBytes }                                    from "crypto";
import { AuthError }                                      from "@/server/auth/auth.service";
import { createRazorpayOrder, verifyRazorpaySignature }  from "@/lib/razorpay/server";
import { prisma }                                         from "@/lib/prisma";
import {
  listActivePackages,
  getActivePackageById,
  countUserInvestmentsInPackage,
  atomicWalletInvest,
  atomicDirectInvest,
  getUserInvestments,
  getInvestmentById,
  type ActivePackage,
  type UserInvestmentRow,
} from "./invest.repository";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum investable amount in rupees */
const MIN_INVEST_AMOUNT = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateReceiptId(): string {
  return `inv_rcpt_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

/** Map internal repository errors to user-friendly AuthError */
function mapInternalError(msg: string): never {
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
        "Insufficient wallet balance. Please add funds before investing.",
        "INSUFFICIENT_BALANCE",
        422
      );
    default:
      throw new AuthError(
        "Investment could not be processed. Please try again.",
        "INVESTMENT_FAILED",
        500
      );
  }
}

// ─── 1. List active packages ──────────────────────────────────────────────────

export async function getActivePackages(): Promise<ActivePackage[]> {
  return listActivePackages();
}

// ─── 2. Single package detail ─────────────────────────────────────────────────

export async function getPackageDetail(packageId: string) {
  const pkg = await getActivePackageById(packageId);
  if (!pkg) {
    throw new AuthError(
      "Investment plan not found or is no longer available.",
      "PACKAGE_NOT_FOUND",
      404
    );
  }
  return pkg;
}

// ─── 3. Invest from wallet ────────────────────────────────────────────────────

export interface WalletInvestInput {
  userId:    string;
  packageId: string;
  amount:    number;
}

export async function investFromWallet(
  input: WalletInvestInput
): Promise<UserInvestmentRow> {
  const { userId, packageId, amount } = input;

  // ── Validate amount ──
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AuthError("Investment amount must be a positive number.", "INVALID_AMOUNT", 422);
  }

  const rounded = Math.round(amount * 100) / 100;

  if (rounded < MIN_INVEST_AMOUNT) {
    throw new AuthError(
      `Minimum investment amount is ₹${MIN_INVEST_AMOUNT}.`,
      "AMOUNT_TOO_LOW",
      422
    );
  }

  // ── Re-validate package (race condition guard) ──
  const pkg = await getActivePackageById(packageId);
  if (!pkg) {
    throw new AuthError(
      "This investment plan is no longer available. Please choose another.",
      "PACKAGE_UNAVAILABLE",
      422
    );
  }

  if (rounded < pkg.minAmount) {
    throw new AuthError(
      `Minimum investment for this plan is ₹${pkg.minAmount.toLocaleString("en-IN")}.`,
      "AMOUNT_BELOW_MINIMUM",
      422
    );
  }

  if (rounded > pkg.maxAmount) {
    throw new AuthError(
      `Maximum investment for this plan is ₹${pkg.maxAmount.toLocaleString("en-IN")}.`,
      "AMOUNT_ABOVE_MAXIMUM",
      422
    );
  }

  // ── Multiple investment check ──
  if (!pkg.allowMultipleInvestments) {
    const existingCount = await countUserInvestmentsInPackage(userId, packageId);
    if (existingCount > 0) {
      throw new AuthError(
        "You already have an active investment in this plan.",
        "DUPLICATE_INVESTMENT",
        422
      );
    }
  } else if (pkg.maxInvestmentsPerUser !== null && pkg.maxInvestmentsPerUser !== undefined) {
    const existingCount = await countUserInvestmentsInPackage(userId, packageId);
    if (existingCount >= pkg.maxInvestmentsPerUser) {
      throw new AuthError(
        `You have reached the maximum investment limit (${pkg.maxInvestmentsPerUser}) for this plan.`,
        "MAX_INVESTMENTS_REACHED",
        422
      );
    }
  }

  // ── Check user is not frozen ──
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { isFrozen: true, mainBalance: true },
  });

  if (!user) {
    throw new AuthError("User account not found.", "USER_NOT_FOUND", 404);
  }

  if (user.isFrozen) {
    throw new AuthError(
      "Your account is currently frozen. Please contact support.",
      "ACCOUNT_FROZEN",
      403
    );
  }

  if (Number(user.mainBalance) < rounded) {
    throw new AuthError(
      "Insufficient wallet balance. Please add funds before investing.",
      "INSUFFICIENT_BALANCE",
      422
    );
  }

  // ── Atomic investment ──
  try {
    return await atomicWalletInvest({
      userId,
      packageId,
      amount:          rounded,
      dailyReturnRate: pkg.dailyReturnRate,
      tenureDays:      pkg.tenureDays,
      packageName:     pkg.name,
    });
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (err instanceof Error) mapInternalError(err.message);
    throw new AuthError(
      "Investment could not be processed. Please try again.",
      "INVESTMENT_FAILED",
      500
    );
  }
}

// ─── 4. Create Razorpay order for direct-payment invest ──────────────────────

export interface CreateInvestOrderInput {
  userId:    string;
  packageId: string;
  amount:    number;
}

export interface CreateInvestOrderResult {
  orderId:   string;
  amount:    number;   // paise
  currency:  string;
  keyId:     string;
  packageId: string;
  packageName: string;
}

export async function createInvestOrder(
  input: CreateInvestOrderInput
): Promise<CreateInvestOrderResult> {
  const { userId, packageId, amount } = input;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AuthError("Investment amount must be a positive number.", "INVALID_AMOUNT", 422);
  }

  const rounded = Math.round(amount * 100) / 100;

  // Re-validate package
  const pkg = await getActivePackageById(packageId);
  if (!pkg) {
    throw new AuthError(
      "This investment plan is no longer available.",
      "PACKAGE_UNAVAILABLE",
      422
    );
  }

  if (rounded < pkg.minAmount) {
    throw new AuthError(
      `Minimum investment for this plan is ₹${pkg.minAmount.toLocaleString("en-IN")}.`,
      "AMOUNT_BELOW_MINIMUM",
      422
    );
  }

  if (rounded > pkg.maxAmount) {
    throw new AuthError(
      `Maximum investment for this plan is ₹${pkg.maxAmount.toLocaleString("en-IN")}.`,
      "AMOUNT_ABOVE_MAXIMUM",
      422
    );
  }

  // Check user
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { isFrozen: true },
  });

  if (!user) throw new AuthError("User account not found.", "USER_NOT_FOUND", 404);
  if (user.isFrozen) {
    throw new AuthError(
      "Your account is currently frozen. Please contact support.",
      "ACCOUNT_FROZEN",
      403
    );
  }

  const receipt  = generateReceiptId();
  const rzpOrder = await createRazorpayOrder(rounded, receipt);

  return {
    orderId:     rzpOrder.orderId,
    amount:      rzpOrder.amount,
    currency:    rzpOrder.currency,
    keyId:       rzpOrder.keyId,
    packageId,
    packageName: pkg.name,
  };
}

// ─── 5. Verify Razorpay payment + create investment ───────────────────────────

export interface VerifyInvestPaymentInput {
  userId:            string;
  packageId:         string;
  amount:            number;
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export async function verifyAndInvest(
  input: VerifyInvestPaymentInput
): Promise<UserInvestmentRow> {
  const {
    userId, packageId, amount,
    razorpayOrderId, razorpayPaymentId, razorpaySignature,
  } = input;

  // Verify Razorpay signature — MUST happen before any DB write
  const valid = verifyRazorpaySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  if (!valid) {
    throw new AuthError(
      "Payment verification failed. Please contact support.",
      "INVALID_SIGNATURE",
      400
    );
  }

  // Re-validate package at time of verification (might have been deactivated)
  const pkg = await getActivePackageById(packageId);
  if (!pkg) {
    throw new AuthError(
      "This investment plan is no longer available. Please contact support to resolve your payment.",
      "PACKAGE_UNAVAILABLE",
      422
    );
  }

  const rounded         = Math.round(amount * 100) / 100;
  const idempotencyKey  = `${razorpayOrderId}:${razorpayPaymentId}`;

  try {
    return await atomicDirectInvest({
      userId,
      packageId,
      amount:            rounded,
      dailyReturnRate:   pkg.dailyReturnRate,
      tenureDays:        pkg.tenureDays,
      packageName:       pkg.name,
      razorpayOrderId,
      razorpayPaymentId,
      idempotencyKey,
    });
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (err instanceof Error) mapInternalError(err.message);
    throw new AuthError(
      "Investment could not be recorded. Please contact support with your payment ID.",
      "INVESTMENT_FAILED",
      500
    );
  }
}

// ─── 6. Investment history ────────────────────────────────────────────────────

export interface InvestmentHistoryResult {
  investments: UserInvestmentRow[];
  total:       number;
  page:        number;
  pages:       number;
}

export async function getInvestments(
  userId: string,
  page:   number,
  limit:  number
): Promise<InvestmentHistoryResult> {
  const { investments, total } = await getUserInvestments(userId, page, limit);
  return {
    investments,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

// ─── 7. Single investment detail ──────────────────────────────────────────────

export async function getInvestmentDetail(
  id:     string,
  userId: string
): Promise<UserInvestmentRow> {
  const inv = await getInvestmentById(id, userId);
  if (!inv) {
    throw new AuthError("Investment not found.", "NOT_FOUND", 404);
  }
  return inv;
}
