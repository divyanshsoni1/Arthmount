/**
 * Transactions controller — auth-guarded HTTP handlers.
 * Follows the exact same pattern as server/wallet/wallet.controller.ts.
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionToken }             from "@/lib/jwt";
import { AuthError }                      from "@/server/auth/auth.service";
import { successResponse, errorResponse } from "@/server/auth/auth.controller";
import { listTransactions, fetchTransactionSummary } from "./transactions.service";

// ─── Auth guard (identical to wallet / withdraw controllers) ──────────────────

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
  console.error("[Transactions] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

// ─── GET /api/transactions ────────────────────────────────────────────────────

export async function handleGetTransactions(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireAuth(req);
    const sp     = new URL(req.url).searchParams;

    const result = await listTransactions(userId, {
      search:    sp.get("search")    ?? undefined,
      types:     sp.get("types")     ?? undefined,
      entryType: sp.get("entryType") ?? undefined,
      from:      sp.get("from")      ?? undefined,
      to:        sp.get("to")        ?? undefined,
      amountMin: sp.get("amountMin") ?? undefined,
      amountMax: sp.get("amountMax") ?? undefined,
      sort:      sp.get("sort")      ?? undefined,
      page:      sp.get("page")      ?? undefined,
      limit:     sp.get("limit")     ?? undefined,
    });

    return successResponse(result);
  } catch (err) {
    return handleError(err);
  }
}

// ─── GET /api/transactions/summary ───────────────────────────────────────────

export async function handleGetTransactionSummary(req: NextRequest): Promise<NextResponse> {
  try {
    const userId  = await requireAuth(req);
    const summary = await fetchTransactionSummary(userId);
    return successResponse(summary);
  } catch (err) {
    return handleError(err);
  }
}
