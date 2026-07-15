/**
 * Withdraw controller — HTTP handlers for the withdrawal module.
 *
 * Routes handled:
 *   GET  /api/withdraw          → handleGetSummary
 *   POST /api/withdraw          → handleRequestWithdrawal
 *   GET  /api/withdraw/history  → handleGetHistory
 *   GET  /api/withdraw/fees     → handleGetFees
 *   GET  /api/withdraw/[id]     → handleGetDetail
 *   POST /api/withdraw/[id]/cancel → handleCancelWithdrawal
 */

import { type NextRequest, NextResponse } from "next/server";
import { z }                              from "zod";

import { verifySessionToken }             from "@/lib/jwt";
import { AuthError }                      from "@/server/auth/auth.service";
import { successResponse, errorResponse } from "@/server/auth/auth.controller";
import {
  getWithdrawSummary,
  requestWithdrawal,
  cancelWithdrawal,
  getWithdrawalHistory,
  getWithdrawalDetail,
  previewFees,
} from "./withdraw.service";

// ─── Auth guard ───────────────────────────────────────────────────────────────

const SESSION_COOKIE = "arthmount_session";

async function requireAuth(req: NextRequest): Promise<string> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new AuthError("Unauthenticated.", "UNAUTHENTICATED", 401);
  try {
    const payload = await verifySessionToken(token);
    return payload.userId;
  } catch {
    throw new AuthError("Session expired. Please log in again.", "SESSION_EXPIRED", 401);
  }
}

function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) return errorResponse(err.message, err.code, err.statusCode);
  console.error("[Withdraw] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const bankPayoutSchema = z.object({
  method:            z.literal("BANK"),
  accountHolderName: z.string().min(2, "Account holder name must be at least 2 characters.").max(150),
  bankName:          z.string().min(2, "Bank name is required.").max(100),
  accountNumber:     z.string().regex(/^\d{9,18}$/, "Account number must be 9–18 digits."),
  ifscCode:          z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Invalid IFSC code format (e.g. SBIN0001234)."),
});

const upiPayoutSchema = z.object({
  method: z.literal("UPI"),
  upiId:  z.string().regex(
    /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/,
    "Invalid UPI ID format (e.g. name@upi)."
  ),
});

const withdrawRequestSchema = z.object({
  source:       z.enum(["WALLET", "INVESTMENT"]),
  investmentId: z.string().uuid("Invalid investment ID.").optional(),
  amount:       z
    .number()
    .positive("Amount must be greater than zero.")
    .min(10,     "Minimum withdrawal is ₹10.")
    .max(500_000, "Maximum withdrawal per request is ₹5,00,000."),
  payout: z.discriminatedUnion("method", [bankPayoutSchema, upiPayoutSchema]),
});

// ─── GET /api/withdraw — summary ─────────────────────────────────────────────

export async function handleGetSummary(req: NextRequest): Promise<NextResponse> {
  try {
    const userId  = await requireAuth(req);
    const summary = await getWithdrawSummary(userId);
    return successResponse(summary);
  } catch (err) { return handleError(err); }
}

// ─── POST /api/withdraw — request withdrawal ──────────────────────────────────

export async function handleRequestWithdrawal(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = withdrawRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    const { source, investmentId, amount, payout } = parsed.data;

    const withdrawal = await requestWithdrawal({
      userId,
      source,
      investmentId,
      amount,
      payout,
    });

    return successResponse({ withdrawal }, 201);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/withdraw/history — paginated history ───────────────────────────

export async function handleGetHistory(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);
    const url    = new URL(req.url);
    const page   = Math.max(1, Number(url.searchParams.get("page")  ?? 1));
    const limit  = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
    const status = url.searchParams.get("status") ?? undefined;

    const result = await getWithdrawalHistory(userId, page, limit, status);
    return successResponse(result);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/withdraw/fees?amount=X — fee preview ───────────────────────────

export async function handleGetFees(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(req);
    const url    = new URL(req.url);
    const amount = Number(url.searchParams.get("amount") ?? 0);
    const fees   = previewFees(amount);
    return successResponse(fees);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/withdraw/[id] — single detail ───────────────────────────────────

export async function handleGetDetail(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    const userId     = await requireAuth(req);
    const withdrawal = await getWithdrawalDetail(id, userId);
    return successResponse({ withdrawal });
  } catch (err) { return handleError(err); }
}

// ─── POST /api/withdraw/[id]/cancel ───────────────────────────────────────────

export async function handleCancelWithdrawal(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    const userId     = await requireAuth(req);
    const withdrawal = await cancelWithdrawal(id, userId);
    return successResponse({ withdrawal });
  } catch (err) { return handleError(err); }
}
