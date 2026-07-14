/**
 * Packages controller — HTTP handlers with role-based access control.
 *
 * Read operations:  ADMIN + SUPER_ADMIN
 * Write operations: SUPER_ADMIN only
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySessionToken }              from "@/lib/jwt";
import { AuthError }                       from "@/server/auth/auth.service";
import { successResponse, errorResponse }  from "@/server/auth/auth.controller";
import {
  listPackages, getPackageById,
  createPackage, updatePackage, deletePackage, setPackageActive,
  getPackageAnalytics, getTopInvestors,
  getPackageInvestments, getPackageActivity,
  type PackageSortBy, type PackageStatus,
} from "./packages.repository";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

const SESSION_COOKIE = "arthmount_session";
const ADMIN_ROLES    = new Set(["ADMIN", "SUPER_ADMIN"]);

interface AdminCtx { userId: string; role: string }

async function requireAdmin(req: NextRequest): Promise<AdminCtx> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new AuthError("Unauthenticated.", "UNAUTHENTICATED", 401);
  let payload: Awaited<ReturnType<typeof verifySessionToken>>;
  try { payload = await verifySessionToken(token); }
  catch { throw new AuthError("Session expired.", "SESSION_EXPIRED", 401); }
  if (!ADMIN_ROLES.has(payload.role))
    throw new AuthError("Forbidden.", "FORBIDDEN", 403);
  return { userId: payload.userId, role: payload.role };
}

async function requireSuperAdmin(req: NextRequest): Promise<AdminCtx> {
  const ctx = await requireAdmin(req);
  if (ctx.role !== "SUPER_ADMIN")
    throw new AuthError("Super Admin access required.", "FORBIDDEN", 403);
  return ctx;
}

function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) return errorResponse(err.message, err.code, err.statusCode);
  console.error("[Packages] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

function pageParams(url: URL) {
  return {
    page:  Math.max(1, Number(url.searchParams.get("page")  ?? 1)),
    limit: Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20))),
  };
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const createSchema = z.object({
  name:            z.string().min(1, "Package name is required.").max(100),
  description:     z.string().max(500).optional(),
  minAmount:       z.number().positive("Minimum amount must be positive."),
  maxAmount:       z.number().positive("Maximum amount must be positive."),
  dailyReturnRate: z.number().positive("Daily ROI must be positive."),
  tenureDays:      z.number().int().min(1, "Tenure must be at least 1 day."),
  isActive:        z.boolean().default(true),
}).refine((d) => d.maxAmount > d.minAmount, {
  message: "Maximum amount must be greater than minimum amount.",
  path: ["maxAmount"],
});

const updateSchema = z.object({
  name:            z.string().min(1).max(100).optional(),
  description:     z.string().max(500).optional(),
  minAmount:       z.number().positive().optional(),
  maxAmount:       z.number().positive().optional(),
  dailyReturnRate: z.number().positive().optional(),
  tenureDays:      z.number().int().min(1).optional(),
  isActive:        z.boolean().optional(),
  isVisible:       z.boolean().optional(),
}).refine((d) => {
  if (d.minAmount !== undefined && d.maxAmount !== undefined)
    return d.maxAmount > d.minAmount;
  return true;
}, { message: "Maximum amount must be greater than minimum amount.", path: ["maxAmount"] });

const toggleSchema = z.object({ isActive: z.boolean() });

// ─── GET /api/admin/packages ──────────────────────────────────────────────────

export async function handleListPackages(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const url    = new URL(req.url);
    const search = url.searchParams.get("search")  ?? "";
    const status = (url.searchParams.get("status")  ?? "ALL") as PackageStatus;
    const sortBy = (url.searchParams.get("sortBy")  ?? "latest") as PackageSortBy;
    const { page, limit } = pageParams(url);
    const result = await listPackages({ search, status, sortBy, page, limit });
    return successResponse(result);
  } catch (err) { return handleError(err); }
}

// ─── POST /api/admin/packages ─────────────────────────────────────────────────

export async function handleCreatePackage(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await requireSuperAdmin(req);
    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse("Invalid JSON.", "BAD_REQUEST", 400); }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success)
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "), "VALIDATION_ERROR", 422);

    const pkg = await createPackage(parsed.data, userId);
    return successResponse({ package: pkg }, 201);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/packages/[id] ────────────────────────────────────────────

export async function handleGetPackage(req: NextRequest, id: string): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const pkg = await getPackageById(id);
    if (!pkg) return errorResponse("Package not found.", "NOT_FOUND", 404);
    return successResponse({ package: pkg });
  } catch (err) { return handleError(err); }
}

// ─── PATCH /api/admin/packages/[id] ──────────────────────────────────────────

export async function handleUpdatePackage(req: NextRequest, id: string): Promise<NextResponse> {
  try {
    const { userId } = await requireSuperAdmin(req);
    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse("Invalid JSON.", "BAD_REQUEST", 400); }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success)
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "), "VALIDATION_ERROR", 422);

    const pkg = await updatePackage(id, parsed.data, userId);
    return successResponse({ package: pkg });
  } catch (err) { return handleError(err); }
}

// ─── DELETE /api/admin/packages/[id] ─────────────────────────────────────────

export async function handleDeletePackage(req: NextRequest, id: string): Promise<NextResponse> {
  try {
    const { userId } = await requireSuperAdmin(req);
    await deletePackage(id, userId);
    return successResponse({ success: true });
  } catch (err) { return handleError(err); }
}

// ─── PATCH /api/admin/packages/[id]/toggle ───────────────────────────────────

export async function handleTogglePackage(req: NextRequest, id: string): Promise<NextResponse> {
  try {
    const { userId } = await requireSuperAdmin(req);
    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse("Invalid JSON.", "BAD_REQUEST", 400); }

    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success)
      return errorResponse("Invalid body.", "VALIDATION_ERROR", 422);

    const pkg = await setPackageActive(id, parsed.data.isActive, userId);
    return successResponse({ package: pkg });
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/packages/[id]/analytics ──────────────────────────────────

export async function handleGetPackageAnalytics(req: NextRequest, id: string): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const url  = new URL(req.url);
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
    const data = await getPackageAnalytics(id, days);
    return successResponse(data);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/packages/[id]/investors ───────────────────────────────────

export async function handleGetTopInvestors(req: NextRequest, id: string): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const url   = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 10)));
    const data  = await getTopInvestors(id, limit);
    return successResponse({ investors: data });
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/packages/[id]/investments ────────────────────────────────

export async function handleGetPackageInvestments(req: NextRequest, id: string): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const url    = new URL(req.url);
    const search = url.searchParams.get("search") ?? "";
    const status = url.searchParams.get("status") ?? "ALL";
    const sortBy = url.searchParams.get("sortBy") ?? "latest";
    const { page, limit } = pageParams(url);
    const data = await getPackageInvestments(id, { page, limit, search, status, sortBy });
    return successResponse(data);
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/packages/[id]/activity ───────────────────────────────────

export async function handleGetPackageActivity(req: NextRequest, id: string): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const url   = new URL(req.url);
    const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));
    const data  = await getPackageActivity(id, limit);
    return successResponse({ activity: data });
  } catch (err) { return handleError(err); }
}
