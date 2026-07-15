/**
 * Invest controller — HTTP handlers for the user-facing investment module.
 *
 * All handlers call requireUser() first (same pattern as wallet.controller.ts).
 * Input validation is done with Zod before hitting the service layer.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z }                              from "zod";

import { verifySessionToken }             from "@/lib/jwt";
import { AuthError }                      from "@/server/auth/auth.service";
import { successResponse, errorResponse } from "@/server/auth/auth.controller";
import {
  getActivePackages,
  getPackageDetail,
  investFromWallet,
  createInvestOrder,
  verifyAndInvest,
  getInvestments,
  getInvestmentDetail,
} from "./invest.service";

// ─── Auth guard ───────────────────────────────────────────────────────────────

const SESSION_COOKIE = "arthmount_session";

async function requireUser(req: NextRequest): Promise<string> {
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
  if (err instanceof AuthError)
    return errorResponse(err.message, err.code, err.statusCode);
  console.error("[Invest] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

// ─── GET /api/invest/packages ────────────────────────────────────────────────
// Returns all active, visible packages — no auth required for browsing,
// but we keep auth to scope future personalisation (e.g. "already invested").

export async function handleListPackages(req: NextRequest): Promise<NextResponse> {
  try {
    await requireUser(req);
    const packages = await getActivePackages();
    return successResponse({ packages });
  } catch (err) { return handleError(err); }
}

// ─── GET /api/invest/packages/[id] ───────────────────────────────────────────

export async function handleGetPackage(
  req:       NextRequest,
  packageId: string
): Promise<NextResponse> {
  try {
    await requireUser(req);
    const pkg = await getPackageDetail(packageId);
    return successResponse({ package: pkg });
  } catch (err) { return handleError(err); }
}

// ─── POST /api/invest — wallet investment ─────────────────────────────────────

const walletInvestSchema = z.object({
  packageId: z.string().uuid("Invalid package ID."),
  amount:    z.number().positive("Amount must be positive.").min(1, "Amount must be at least ₹1."),
});

export async function handleWalletInvest(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireUser(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = walletInvestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    const result = await investFromWallet({
      userId,
      packageId: parsed.data.packageId,
      amount:    parsed.data.amount,
    });

    return successResponse({ investment: result }, 201);
  } catch (err) { return handleError(err); }
}

// ─── POST /api/invest/create-order — create Razorpay order ───────────────────

const createOrderSchema = z.object({
  packageId: z.string().uuid("Invalid package ID."),
  amount:    z.number().positive("Amount must be positive.").min(1),
});

export async function handleCreateInvestOrder(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireUser(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    const result = await createInvestOrder({
      userId,
      packageId: parsed.data.packageId,
      amount:    parsed.data.amount,
    });

    return successResponse(result);
  } catch (err) { return handleError(err); }
}

// ─── POST /api/invest/verify-payment — verify + create investment ─────────────

const verifyPaymentSchema = z.object({
  packageId:         z.string().uuid("Invalid package ID."),
  amount:            z.number().positive("Amount must be positive."),
  razorpayOrderId:   z.string().min(1, "Order ID required."),
  razorpayPaymentId: z.string().min(1, "Payment ID required."),
  razorpaySignature: z.string().min(1, "Signature required."),
});

export async function handleVerifyInvestPayment(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireUser(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = verifyPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    const result = await verifyAndInvest({ userId, ...parsed.data });
    return successResponse({ investment: result }, 201);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/invest — investment history ─────────────────────────────────────

export async function handleGetInvestments(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireUser(req);
    const url    = new URL(req.url);
    const page   = Math.max(1, Number(url.searchParams.get("page")  ?? 1));
    const limit  = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 10)));
    const result = await getInvestments(userId, page, limit);
    return successResponse(result);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/invest/[id] — single investment detail ─────────────────────────

export async function handleGetInvestment(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    const userId = await requireUser(req);
    const result = await getInvestmentDetail(id, userId);
    return successResponse({ investment: result });
  } catch (err) { return handleError(err); }
}
