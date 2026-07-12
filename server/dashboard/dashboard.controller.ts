import { type NextRequest, NextResponse } from "next/server";
import { verifySessionToken }             from "@/lib/jwt";
import { AuthError }                      from "@/server/auth/auth.service";
import { successResponse, errorResponse } from "@/server/auth/auth.controller";
import {
  getPortfolioSummary,
  getInvestmentHistory,
  getProfitChartData,
  getRecentActivity,
} from "./dashboard.repository";

const SESSION_COOKIE = "arthmount_session";

async function requireUser(req: NextRequest): Promise<string> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new AuthError("Unauthenticated.", "UNAUTHENTICATED", 401);
  try {
    const p = await verifySessionToken(token);
    return p.userId;
  } catch {
    throw new AuthError("Session expired.", "SESSION_EXPIRED", 401);
  }
}

function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) return errorResponse(err.message, err.code, err.statusCode);
  console.error("[Dashboard] Error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

export async function handleGetSummary(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireUser(req);
    const [summary, chart, activity] = await Promise.all([
      getPortfolioSummary(userId),
      getProfitChartData(userId),
      getRecentActivity(userId, 8),
    ]);
    return successResponse({ summary, chart, activity });
  } catch (err) { return handleError(err); }
}

export async function handleGetInvestments(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireUser(req);
    const url    = new URL(req.url);
    const page   = Math.max(1, Number(url.searchParams.get("page")  ?? 1));
    const limit  = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 10)));
    const result = await getInvestmentHistory(userId, page, limit);
    return successResponse(result);
  } catch (err) { return handleError(err); }
}
