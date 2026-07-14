import { type NextRequest, NextResponse } from "next/server";
import { verifySessionToken }            from "@/lib/jwt";
import { successResponse, errorResponse } from "@/server/auth/auth.controller";
import { AuthError }                      from "@/server/auth/auth.service";
import {
  getAnalyticsKpis,
  getCapitalHealthChart,
  getCapitalByPackage,
  getProfitByPackage,
  getLiveActivity,
  type DateRange,
} from "@/server/admin/analytics.repository";

export const runtime = "nodejs";

const SESSION_COOKIE = "arthmount_session";
const ADMIN_ROLES    = new Set(["ADMIN", "SUPER_ADMIN"]);
const VALID_RANGES   = new Set<string>(["today", "week", "15days", "month", "3months", "6months", "year"]);

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new AuthError("Unauthenticated.", "UNAUTHENTICATED", 401);
  const payload = await verifySessionToken(token);
  if (!ADMIN_ROLES.has(payload.role)) throw new AuthError("Forbidden.", "FORBIDDEN", 403);
  return payload;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(req);

    const url   = new URL(req.url);
    const raw   = url.searchParams.get("range") ?? "month";
    const range = (VALID_RANGES.has(raw) ? raw : "month") as DateRange;

    const [kpis, capitalHealth, capitalByPackage, profitByPackage, liveActivity] =
      await Promise.all([
        getAnalyticsKpis(range),
        getCapitalHealthChart(range),
        getCapitalByPackage(range),
        getProfitByPackage(range),
        getLiveActivity(40),
      ]);

    return successResponse({ kpis, capitalHealth, capitalByPackage, profitByPackage, liveActivity });
  } catch (err) {
    if (err instanceof AuthError)
      return errorResponse(err.message, err.code, err.statusCode);
    console.error("[Analytics] Unexpected error:", err);
    return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
  }
}
