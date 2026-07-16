/**
 * GET /api/invest/analytics
 *
 * Returns comprehensive profit analytics for the authenticated user.
 * Strictly scoped — users can only ever see their own data.
 *
 * Query params:
 *   range: "7d" | "30d" | "90d" | "6m" | "1y" | "lifetime"  (default: "lifetime")
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionToken }             from "@/lib/jwt";
import { AuthError }                      from "@/server/auth/auth.service";
import { successResponse, errorResponse } from "@/server/auth/auth.controller";
import {
  getUserProfitKpis,
  getPackageAnalytics,
  getMonthlyProfitTrend,
  getDailyProfitSeries,
  getPortfolioGrowthSeries,
  getProfitDistribution,
  type AnalyticsRange,
} from "@/server/invest/profit-analytics.repository";

export const runtime = "nodejs";

const SESSION_COOKIE  = "arthmount_session";
const USER_ROLES      = new Set(["USER", "AGENT"]);
const VALID_RANGES    = new Set<string>(["7d", "30d", "90d", "6m", "1y", "lifetime"]);

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireUser(req: NextRequest): Promise<string> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new AuthError("Unauthenticated.", "UNAUTHENTICATED", 401);

  let payload: Awaited<ReturnType<typeof verifySessionToken>>;
  try {
    payload = await verifySessionToken(token);
  } catch {
    throw new AuthError("Session expired. Please log in again.", "SESSION_EXPIRED", 401);
  }

  // Only USER / AGENT roles may access personal analytics.
  // Admins use the /api/admin/analytics endpoint instead.
  if (!USER_ROLES.has(payload.role)) {
    throw new AuthError("Forbidden.", "FORBIDDEN", 403);
  }

  return payload.userId;
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireUser(req);

    const url   = new URL(req.url);
    const raw   = url.searchParams.get("range") ?? "lifetime";
    const range = (VALID_RANGES.has(raw) ? raw : "lifetime") as AnalyticsRange;

    // Fetch all analytics in parallel — strictly scoped to userId
    const [kpis, packages, monthlyTrend, dailySeries, growthSeries, distribution] =
      await Promise.all([
        getUserProfitKpis(userId),
        getPackageAnalytics(userId),
        getMonthlyProfitTrend(userId),
        getDailyProfitSeries(userId, range),
        getPortfolioGrowthSeries(userId),
        getProfitDistribution(userId),
      ]);

    return successResponse({
      range,
      kpis,
      packages,
      monthlyTrend,
      dailySeries,
      growthSeries,
      distribution,
    });
  } catch (err) {
    if (err instanceof AuthError)
      return errorResponse(err.message, err.code, err.statusCode);
    console.error("[ProfitAnalytics] Unexpected error:", err);
    return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
  }
}
