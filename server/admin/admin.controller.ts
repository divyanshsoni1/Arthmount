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
import { getSignedUrl, extractKeyFromUrl } from "@/lib/storage/minio";
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

// ─── Sign all document URLs in a KYC record ───────────────────────────────────

type KycWithUrls = Record<string, unknown> & {
  aadhaarFrontUrl?: string | null;
  aadhaarBackUrl?:  string | null;
  panFrontUrl?:     string | null;
  panBackUrl?:      string | null;
  selfieUrl?:       string | null;
};

async function signKycDocUrls<T extends KycWithUrls>(kyc: T): Promise<T> {
  const fields = ["aadhaarFrontUrl", "aadhaarBackUrl", "panFrontUrl", "panBackUrl", "selfieUrl"] as const;
  const signed: Partial<Record<typeof fields[number], string | null>> = {};

  await Promise.all(
    fields.map(async (field) => {
      const rawUrl = kyc[field];
      if (!rawUrl) { signed[field] = null; return; }
      const key = extractKeyFromUrl(rawUrl);
      if (key) {
        try {
          signed[field] = await getSignedUrl(key, 3600);
        } catch {
          signed[field] = null; // fail safe — don't expose raw URL
        }
      } else {
        signed[field] = null;
      }
    })
  );

  return { ...kyc, ...signed };
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
    const signedKyc = await signKycDocUrls(record as KycWithUrls);
    return successResponse({ kyc: signedKyc });
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

    // Sign KYC document URLs if present
    let signedUser: typeof user = user;
    if (user.kycDocument) {
      const signedKyc = await signKycDocUrls(user.kycDocument as KycWithUrls);
      signedUser = { ...user, kycDocument: signedKyc as typeof user.kycDocument };
    }

    return successResponse({ user: signedUser });
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

// ─── PATCH /api/admin/users/[id]/kyc ─────────────────────────────────────────

import {
  updateUserKycStatus,
  changeUserRole,
  resetUserPassword,
  adjustUserWallet,
} from "./admin.repository";

const updateKycSchema = z.object({
  status:          z.enum(["PENDING", "IN_REVIEW", "APPROVED", "AUTO_APPROVED", "REJECTED"]),
  rejectionReason: z.string().max(500).optional(),
});

export async function handleUpdateUserKyc(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    const { userId: adminId } = await requireAdmin(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = updateKycSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    const { status, rejectionReason } = parsed.data;

    if (status === "REJECTED" && (!rejectionReason || !rejectionReason.trim())) {
      return errorResponse(
        "Rejection reason is required when rejecting KYC.",
        "VALIDATION_ERROR",
        422
      );
    }

    const result = await updateUserKycStatus(
      id,
      adminId,
      status as KycStatus,
      rejectionReason
    );

    return successResponse({ success: true, ...result });
  } catch (err) { return handleError(err); }
}

// ─── PATCH /api/admin/users/[id]/role ─────────────────────────────────────────

const ALLOWED_ROLES = ["USER", "AGENT", "ADMIN", "SUPPORT"] as const;
type AllowedRole = typeof ALLOWED_ROLES[number];

const changeRoleSchema = z.object({
  role: z.enum(ALLOWED_ROLES),
});

export async function handleChangeUserRole(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    const { userId: adminId, role: adminRole } = await requireAdmin(req);

    // Prevent demoting other super-admins or promoting to super-admin
    if (adminRole !== "SUPER_ADMIN") {
      // Regular admins can't assign ADMIN role — only SUPER_ADMIN can
      let body: unknown;
      try { body = await req.json(); } catch {
        return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
      }
      const parsed = changeRoleSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(
          parsed.error.issues.map((e) => e.message).join(", "),
          "VALIDATION_ERROR",
          422
        );
      }
      if (parsed.data.role === "ADMIN") {
        return errorResponse(
          "Only SUPER_ADMIN can assign the ADMIN role.",
          "FORBIDDEN",
          403
        );
      }
      const result = await changeUserRole(id, adminId, parsed.data.role as Role);
      return successResponse({ success: true, ...result });
    }

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = changeRoleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    // Prevent self-demotion
    if (id === adminId) {
      return errorResponse("You cannot change your own role.", "FORBIDDEN", 403);
    }

    const result = await changeUserRole(id, adminId, parsed.data.role as Role);
    return successResponse({ success: true, ...result });
  } catch (err) { return handleError(err); }
}

// ─── POST /api/admin/users/[id]/password ──────────────────────────────────────

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm the password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function handleResetUserPassword(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    const { userId: adminId } = await requireAdmin(req);

    // Prevent resetting own password via this admin endpoint
    if (id === adminId) {
      return errorResponse(
        "Use your profile settings to change your own password.",
        "FORBIDDEN",
        403
      );
    }

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    const result = await resetUserPassword(id, adminId, parsed.data.password);
    return successResponse(result);
  } catch (err) { return handleError(err); }
}

// ─── POST /api/admin/users/[id]/wallet ────────────────────────────────────────

const adjustWalletSchema = z.object({
  type:   z.enum(["CREDIT", "DEBIT"]),
  amount: z
    .number({ error: "Amount must be a number" })
    .positive("Amount must be greater than zero")
    .max(10_000_000, "Amount exceeds maximum allowed"),
  reason: z.string().min(3, "Reason is required").max(300),
  note:   z.string().max(500).optional(),
});

export async function handleAdjustWallet(
  req: NextRequest,
  id:  string
): Promise<NextResponse> {
  try {
    const { userId: adminId } = await requireAdmin(req);

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON.", "BAD_REQUEST", 400);
    }

    const parsed = adjustWalletSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e) => e.message).join(", "),
        "VALIDATION_ERROR",
        422
      );
    }

    const { type, amount, reason, note } = parsed.data;

    const result = await adjustUserWallet(id, adminId, type, amount, reason, note);
    return successResponse({ success: true, ...result });
  } catch (err) {
    // Surface domain errors (e.g. insufficient balance) as 422
    if (err instanceof Error && (
      err.message.includes("Insufficient balance") ||
      err.message.includes("cannot go negative")
    )) {
      return errorResponse(err.message, "INSUFFICIENT_BALANCE", 422);
    }
    return handleError(err);
  }
}
