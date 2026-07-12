/**
 * Admin controller — HTTP handlers + role guard.
 *
 * requireAdmin: reads session cookie → verifies JWT → checks role is ADMIN or SUPER_ADMIN.
 * Every handler calls requireAdmin first.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifySessionToken }                          from "@/lib/jwt";
import { AuthError }                                   from "@/server/auth/auth.service";
import { successResponse, errorResponse }              from "@/server/auth/auth.controller";
import {
  getPlatformStats, getUserGrowthData, getDepositChartData,
  getKycList, getKycById, approveKyc, rejectKyc,
  getUserList, getUserById, setUserFrozen,
  getAuditLogs,
} from "./admin.repository";
import type { KycStatus, Role } from "@/lib/generated/prisma/client";

// ─── Auth + role guard ────────────────────────────────────────────────────────

const SESSION_COOKIE   = "arthmount_session";
const ADMIN_ROLES      = new Set(["ADMIN", "SUPER_ADMIN"]);

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
  console.error("[Admin] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

function pageParams(url: URL) {
  return {
    page:  Math.max(1, Number(url.searchParams.get("page")  ?? 1)),
    limit: Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20))),
  };
}

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

export async function handleGetStats(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const [stats, growth, deposits] = await Promise.all([
      getPlatformStats(),
      getUserGrowthData(),
      getDepositChartData(),
    ]);
    return successResponse({ stats, growth, deposits });
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/kyc ───────────────────────────────────────────────────────

export async function handleListKyc(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const url    = new URL(req.url);
    const status = (url.searchParams.get("status") ?? "ALL") as KycStatus | "ALL";
    const { page, limit } = pageParams(url);
    const result = await getKycList(status, page, limit);
    return successResponse(result);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/kyc/[id] ──────────────────────────────────────────────────

export async function handleGetKycDetail(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const record = await getKycById(id);
    if (!record) return errorResponse("KYC record not found.", "NOT_FOUND", 404);
    return successResponse({ kyc: record });
  } catch (err) { return handleError(err); }
}

// ─── PATCH /api/admin/kyc/[id] ────────────────────────────────────────────────

const kycActionSchema = z.object({
  action:          z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().optional(),
});

export async function handleUpdateKyc(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    const { userId: adminId } = await requireAdmin(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = kycActionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "), "VALIDATION_ERROR", 422);
    }

    const { action, rejectionReason } = parsed.data;

    if (action === "REJECT" && (!rejectionReason || !rejectionReason.trim())) {
      return errorResponse("Rejection reason is required.", "VALIDATION_ERROR", 422);
    }

    if (action === "APPROVE") {
      await approveKyc(id, adminId);
    } else {
      await rejectKyc(id, adminId, rejectionReason!.trim());
    }

    return successResponse({ success: true });
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

export async function handleListUsers(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const url    = new URL(req.url);
    const search = url.searchParams.get("search") ?? "";
    const role   = (url.searchParams.get("role") ?? "ALL") as Role | "ALL";
    const { page, limit } = pageParams(url);
    const result = await getUserList(search, role, page, limit);
    return successResponse(result);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/users/[id] ────────────────────────────────────────────────

export async function handleGetUser(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const user = await getUserById(id);
    if (!user) return errorResponse("User not found.", "NOT_FOUND", 404);
    return successResponse({ user });
  } catch (err) { return handleError(err); }
}

// ─── POST /api/admin/users/[id]/freeze ───────────────────────────────────────

const freezeSchema = z.object({ freeze: z.boolean() });

export async function handleFreezeUser(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    const { userId: adminId } = await requireAdmin(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }
    const parsed = freezeSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid body.", "VALIDATION_ERROR", 422);

    const result = await setUserFrozen(id, parsed.data.freeze, adminId);
    return successResponse({ user: result });
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/audit-logs ────────────────────────────────────────────────

export async function handleGetAuditLogs(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const { page, limit } = pageParams(url);
    const result = await getAuditLogs(page, limit);
    return successResponse(result);
  } catch (err) { return handleError(err); }
}
