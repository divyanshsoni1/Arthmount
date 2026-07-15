/**
 * Admin withdrawal controller — HTTP handlers for the admin withdrawal management module.
 *
 * All handlers call requireAdmin() first (same pattern as admin.controller.ts).
 *
 * Routes:
 *   GET  /api/admin/withdrawals          → handleListWithdrawals
 *   GET  /api/admin/withdrawals/stats    → handleGetWithdrawalStats
 *   GET  /api/admin/withdrawals/[id]     → handleGetWithdrawalDetail
 *   PATCH /api/admin/withdrawals/[id]    → handleUpdateWithdrawalStatus
 */

import { type NextRequest, NextResponse } from "next/server";
import { z }                              from "zod";

import { verifySessionToken }             from "@/lib/jwt";
import { AuthError }                      from "@/server/auth/auth.service";
import { successResponse, errorResponse } from "@/server/auth/auth.controller";
import {
  listAdminWithdrawals,
  getAdminWithdrawalById,
  getAdminWithdrawalStats,
  atomicUpdateWithdrawalStatus,
  isValidTransition,
} from "./withdrawal.repository";
import type { WithdrawalStatus } from "@/lib/generated/prisma/client";

// ─── Auth + role guard ────────────────────────────────────────────────────────

const SESSION_COOKIE = "arthmount_session";
const ADMIN_ROLES    = new Set(["ADMIN", "SUPER_ADMIN"]);

interface AdminContext { userId: string; role: string }

async function requireAdmin(req: NextRequest): Promise<AdminContext> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new AuthError("Unauthenticated.", "UNAUTHENTICATED", 401);
  let payload: Awaited<ReturnType<typeof verifySessionToken>>;
  try {
    payload = await verifySessionToken(token);
  } catch {
    throw new AuthError("Session expired.", "SESSION_EXPIRED", 401);
  }
  if (!ADMIN_ROLES.has(payload.role)) {
    throw new AuthError("Forbidden. Admin access required.", "FORBIDDEN", 403);
  }
  return { userId: payload.userId, role: payload.role };
}

function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) return errorResponse(err.message, err.code, err.statusCode);
  // Surface known domain errors
  if (err instanceof Error) {
    if (err.message === "WITHDRAWAL_NOT_FOUND") {
      return errorResponse("Withdrawal not found.", "NOT_FOUND", 404);
    }
    if (err.message.startsWith("INVALID_TRANSITION:")) {
      const [, from, to] = err.message.split(":");
      return errorResponse(
        `Cannot transition from ${from} to ${to}. Check the current status.`,
        "INVALID_TRANSITION",
        422
      );
    }
  }
  console.error("[AdminWithdrawal] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

// ─── GET /api/admin/withdrawals ───────────────────────────────────────────────

const VALID_STATUSES = new Set<string>([
  "PENDING", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED", "FAILED", "CANCELLED",
]);

export async function handleListWithdrawals(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);

    const page   = Math.max(1, Number(url.searchParams.get("page")  ?? 1));
    const limit  = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
    const rawStatus = url.searchParams.get("status") ?? "";
    const status = VALID_STATUSES.has(rawStatus) ? (rawStatus as WithdrawalStatus) : undefined;
    const method = url.searchParams.get("method") as "BANK" | "UPI" | null ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const orderBy = (url.searchParams.get("order") === "asc" ? "asc" : "desc") as "asc" | "desc";

    const dateFrom = url.searchParams.get("dateFrom")
      ? new Date(url.searchParams.get("dateFrom")!)
      : undefined;
    const dateTo = url.searchParams.get("dateTo")
      ? new Date(url.searchParams.get("dateTo")!)
      : undefined;
    const minAmount = url.searchParams.get("minAmount")
      ? Number(url.searchParams.get("minAmount"))
      : undefined;
    const maxAmount = url.searchParams.get("maxAmount")
      ? Number(url.searchParams.get("maxAmount"))
      : undefined;

    const result = await listAdminWithdrawals({
      page, limit, status, method, search, dateFrom, dateTo, minAmount, maxAmount, orderBy,
    });

    return successResponse(result);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/withdrawals/stats ─────────────────────────────────────────

export async function handleGetWithdrawalStats(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const stats = await getAdminWithdrawalStats();
    return successResponse(stats);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/withdrawals/[id] ─────────────────────────────────────────

export async function handleGetWithdrawalDetail(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const withdrawal = await getAdminWithdrawalById(id);
    if (!withdrawal) {
      return errorResponse("Withdrawal not found.", "NOT_FOUND", 404);
    }
    return successResponse({ withdrawal });
  } catch (err) { return handleError(err); }
}

// ─── PATCH /api/admin/withdrawals/[id] ───────────────────────────────────────

const ALLOWED_ACTIONS = ["APPROVED", "PROCESSING", "COMPLETED", "REJECTED"] as const;

const actionSchema = z.object({
  action:          z.enum(ALLOWED_ACTIONS),
  rejectionReason: z.string().min(3).max(500).optional(),
});

export async function handleUpdateWithdrawalStatus(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    const { userId: adminId } = await requireAdmin(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    const { action, rejectionReason } = parsed.data;

    if (action === "REJECTED" && (!rejectionReason || !rejectionReason.trim())) {
      return errorResponse(
        "Rejection reason is required when rejecting a withdrawal.",
        "VALIDATION_ERROR",
        422
      );
    }

    // Pre-flight: check withdrawal exists and transition is valid
    const existing = await getAdminWithdrawalById(id);
    if (!existing) {
      return errorResponse("Withdrawal not found.", "NOT_FOUND", 404);
    }

    if (!isValidTransition(existing.status, action)) {
      return errorResponse(
        `Cannot transition from ${existing.status} to ${action}.`,
        "INVALID_TRANSITION",
        422
      );
    }

    const updated = await atomicUpdateWithdrawalStatus({
      id,
      adminId,
      newStatus:       action,
      rejectionReason: action === "REJECTED" ? rejectionReason!.trim() : undefined,
    });

    return successResponse({ withdrawal: updated });
  } catch (err) { return handleError(err); }
}
