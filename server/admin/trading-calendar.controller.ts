/**
 * Trading Calendar controller — HTTP handlers with role-based access control.
 *
 * Read operations:  ADMIN + SUPER_ADMIN
 * Write operations: ADMIN + SUPER_ADMIN (future dates only; backend enforces past-immutability)
 *
 * Routes served:
 *  GET    /api/admin/trading-calendar          — month view (query: year, month)
 *  GET    /api/admin/trading-calendar/stats    — KPI stats
 *  GET    /api/admin/trading-calendar/upcoming — upcoming events
 *  GET    /api/admin/trading-calendar/[id]     — single day
 *  POST   /api/admin/trading-calendar          — create override
 *  PATCH  /api/admin/trading-calendar/[id]     — update override
 *  DELETE /api/admin/trading-calendar/[id]     — delete override
 *  PATCH  /api/admin/trading-calendar/[id]/toggle — toggle market status
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySessionToken }             from "@/lib/jwt";
import { AuthError }                      from "@/server/auth/auth.service";
import { successResponse, errorResponse } from "@/server/auth/auth.controller";
import {
  getCalendarMonth,
  getTradingDay,
  getUpcomingEvents,
  getCalendarStatsAccurate,
  createTradingDay,
  updateTradingDay,
  deleteTradingDay,
  toggleMarketStatus,
  isPastDate,
  type CreateTradingDayInput,
  type UpdateTradingDayInput,
} from "./trading-calendar.repository";

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

function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) return errorResponse(err.message, err.code, err.statusCode);
  console.error("[TradingCalendar] Unexpected error:", err);
  return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500);
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const HOLIDAY_TYPES = ["NATIONAL", "BANK", "MARKET", "WEEKEND", "SPECIAL"] as const;

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createSchema = z.object({
  date:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  isBusinessDay:     z.boolean(),
  isHoliday:         z.boolean().default(false),
  holidayName:       z.string().max(150).optional(),
  holidayType:       z.enum(HOLIDAY_TYPES).optional(),
  marketOpenTime:    z.string().regex(timeRegex, "Time must be HH:MM").optional(),
  marketCloseTime:   z.string().regex(timeRegex, "Time must be HH:MM").optional(),
  settlementAllowed: z.boolean().default(true),
  withdrawalAllowed: z.boolean().default(true),
  investmentAllowed: z.boolean(),
  remarks:           z.string().max(500).optional(),
});

const updateSchema = z.object({
  isBusinessDay:     z.boolean().optional(),
  isHoliday:         z.boolean().optional(),
  holidayName:       z.string().max(150).optional(),
  holidayType:       z.enum(HOLIDAY_TYPES).optional(),
  marketOpenTime:    z.string().regex(timeRegex).optional(),
  marketCloseTime:   z.string().regex(timeRegex).optional(),
  settlementAllowed: z.boolean().optional(),
  withdrawalAllowed: z.boolean().optional(),
  investmentAllowed: z.boolean().optional(),
  remarks:           z.string().max(500).optional(),
});

const toggleSchema = z.object({ isBusinessDay: z.boolean() });

// ─── GET /api/admin/trading-calendar?year=&month= ────────────────────────────

export async function handleGetCalendar(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const url   = new URL(req.url);
    const now   = new Date();
    const year  = Number(url.searchParams.get("year")  ?? now.getFullYear());
    const month = Number(url.searchParams.get("month") ?? (now.getMonth() + 1));

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return errorResponse("Invalid year or month.", "VALIDATION_ERROR", 422);
    }

    const days = await getCalendarMonth(year, month);
    return successResponse({ days, year, month });
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/trading-calendar/stats ───────────────────────────────────

export async function handleGetStats(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const stats = await getCalendarStatsAccurate();
    return successResponse({ stats });
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/trading-calendar/upcoming ────────────────────────────────

export async function handleGetUpcoming(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    const url   = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 10)));
    const events = await getUpcomingEvents(limit);
    return successResponse({ events });
  } catch (err) { return handleError(err); }
}

// ─── GET /api/admin/trading-calendar/[id] ────────────────────────────────────

export async function handleGetDay(req: NextRequest, idOrDate: string): Promise<NextResponse> {
  try {
    await requireAdmin(req);
    // idOrDate can be a UUID (from DB) or a date string "YYYY-MM-DD"
    const isDateFmt = /^\d{4}-\d{2}-\d{2}$/.test(idOrDate);
    let day;
    if (isDateFmt) {
      day = await getTradingDay(idOrDate);
    } else {
      // find by id via getTradingDay — fallback to searching all (not ideal, but rare)
      // For simplicity, accept date-format only at [id] route; UUIDs not needed from client
      return errorResponse("Use date format YYYY-MM-DD.", "BAD_REQUEST", 400);
    }
    if (!day) return errorResponse("No custom setting for this date.", "NOT_FOUND", 404);
    return successResponse({ day });
  } catch (err) { return handleError(err); }
}

// ─── POST /api/admin/trading-calendar ────────────────────────────────────────

export async function handleCreateDay(req: NextRequest): Promise<NextResponse> {
  try {
    const ctx = await requireAdmin(req);
    void ctx; // role already checked

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse("Invalid JSON.", "BAD_REQUEST", 400); }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success)
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "), "VALIDATION_ERROR", 422);

    // Backend enforcement: past dates are immutable
    if (isPastDate(parsed.data.date))
      return errorResponse("Past trading records cannot be modified.", "PAST_DATE_IMMUTABLE", 422);

    // Check for duplicate
    const existing = await getTradingDay(parsed.data.date);
    if (existing)
      return errorResponse("A setting for this date already exists. Use PATCH to update it.", "DUPLICATE_DATE", 409);

    const day = await createTradingDay(parsed.data as CreateTradingDayInput);
    return successResponse({ day }, 201);
  } catch (err) { return handleError(err); }
}

// ─── PATCH /api/admin/trading-calendar/[id] ──────────────────────────────────

export async function handleUpdateDay(req: NextRequest, id: string): Promise<NextResponse> {
  try {
    await requireAdmin(req);

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse("Invalid JSON.", "BAD_REQUEST", 400); }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success)
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "), "VALIDATION_ERROR", 422);

    // Fetch record to validate past-date rule
    const { getTradingDayById } = await import("./trading-calendar.repository");
    const existing = await getTradingDayById(id);
    if (!existing) return errorResponse("Trading day record not found.", "NOT_FOUND", 404);

    if (isPastDate(existing.date))
      return errorResponse("Past trading records cannot be modified.", "PAST_DATE_IMMUTABLE", 422);

    const day = await updateTradingDay(id, parsed.data as UpdateTradingDayInput);
    return successResponse({ day });
  } catch (err) { return handleError(err); }
}

// ─── DELETE /api/admin/trading-calendar/[id] ─────────────────────────────────

export async function handleDeleteDay(req: NextRequest, id: string): Promise<NextResponse> {
  try {
    await requireAdmin(req);

    const { getTradingDayById } = await import("./trading-calendar.repository");
    const existing = await getTradingDayById(id);
    if (!existing) return errorResponse("Trading day record not found.", "NOT_FOUND", 404);

    if (isPastDate(existing.date))
      return errorResponse("Past trading records cannot be modified.", "PAST_DATE_IMMUTABLE", 422);

    await deleteTradingDay(id);
    return successResponse({ message: "Trading day setting deleted." });
  } catch (err) { return handleError(err); }
}

// ─── PATCH /api/admin/trading-calendar/[id]/toggle ───────────────────────────

export async function handleToggleMarket(req: NextRequest, id: string): Promise<NextResponse> {
  try {
    await requireAdmin(req);

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse("Invalid JSON.", "BAD_REQUEST", 400); }

    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success)
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "), "VALIDATION_ERROR", 422);

    const { getTradingDayById } = await import("./trading-calendar.repository");
    const existing = await getTradingDayById(id);
    if (!existing) return errorResponse("Trading day record not found.", "NOT_FOUND", 404);

    if (isPastDate(existing.date))
      return errorResponse("Past trading records cannot be modified.", "PAST_DATE_IMMUTABLE", 422);

    const day = await toggleMarketStatus(id, parsed.data.isBusinessDay);
    return successResponse({ day });
  } catch (err) { return handleError(err); }
}
