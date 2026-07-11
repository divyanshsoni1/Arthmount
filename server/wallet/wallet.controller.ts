import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifySessionToken }  from "@/lib/jwt";
import { AuthError }           from "@/server/auth/auth.service";
import { successResponse, errorResponse } from "@/server/auth/auth.controller";
import { getBalance, createOrder, verifyAndCredit, getHistory } from "./wallet.service";

// ─── Auth guard ─────────────────────────────────────────────────────────────

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
  console.error("[Wallet] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

// ─── GET /api/wallet — balance ───────────────────────────────────────────────

export async function handleGetWallet(req: NextRequest): Promise<NextResponse> {
  try {
    const userId  = await requireAuth(req);
    const balance = await getBalance(userId);
    return successResponse({
      mainBalance:       balance.mainBalance.toString(),
      investedBalance:   balance.investedBalance.toString(),
      commissionBalance: balance.commissionBalance.toString(),
    });
  } catch (err) { return handleError(err); }
}

// ─── POST /api/wallet/create-order ──────────────────────────────────────────

const createOrderSchema = z.object({
  amount: z.number().positive().min(10).max(100_000),
});

export async function handleCreateOrder(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR", 422
      );
    }

    const result = await createOrder(userId, parsed.data.amount);
    return successResponse(result);
  } catch (err) { return handleError(err); }
}

// ─── POST /api/wallet/verify-payment ────────────────────────────────────────

const verifySchema = z.object({
  razorpayOrderId:   z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function handleVerifyPayment(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR", 422
      );
    }

    const result = await verifyAndCredit(userId, parsed.data);
    return successResponse(result);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/wallet/history ─────────────────────────────────────────────────

export async function handleGetHistory(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);
    const url    = new URL(req.url);
    const page   = Math.max(1, Number(url.searchParams.get("page")  ?? 1));
    const limit  = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

    const result = await getHistory(userId, page, limit);
    return successResponse(result);
  } catch (err) { return handleError(err); }
}
