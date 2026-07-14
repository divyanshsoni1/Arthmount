/**
 * Trading Calendar repository — all Prisma queries for the trading calendar module.
 * Called only from trading-calendar.controller.ts which enforces role checks.
 */

import { prisma } from "@/lib/prisma";
import type { HolidayType } from "@/lib/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TradingDayRecord {
  id:                string;
  date:              string; // ISO date string "YYYY-MM-DD"
  dayOfWeek:         number; // 1=Mon … 7=Sun
  isBusinessDay:     boolean;
  isHoliday:         boolean;
  holidayName:       string | null;
  holidayType:       HolidayType | null;
  marketOpenTime:    string | null; // "HH:MM"
  marketCloseTime:   string | null; // "HH:MM"
  settlementAllowed: boolean;
  withdrawalAllowed: boolean;
  investmentAllowed: boolean;
  remarks:           string | null;
  createdAt:         string;
  updatedAt:         string;
  createdBy?:        { id: string; name: string } | null;
}

export interface CalendarStats {
  tradingDaysThisMonth:  number;
  closedDaysThisMonth:   number;
  specialHolidays:       number;
  upcomingEventsCount:   number;
  nextMarketClosure:     string | null; // ISO date string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise a JS Date to a midnight UTC Date for DB @db.Date comparisons */
function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Format a prisma @db.Date field back to "YYYY-MM-DD" */
function fmtDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Format a prisma @db.Time field to "HH:MM" */
function fmtTime(d: Date | null): string | null {
  if (!d) return null;
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function mapRecord(r: {
  id: string;
  date: Date;
  dayOfWeek: number;
  isBusinessDay: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  holidayType: HolidayType | null;
  marketOpenTime: Date | null;
  marketCloseTime: Date | null;
  settlementAllowed: boolean;
  withdrawalAllowed: boolean;
  investmentAllowed: boolean;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TradingDayRecord {
  return {
    id:                r.id,
    date:              fmtDate(r.date),
    dayOfWeek:         r.dayOfWeek,
    isBusinessDay:     r.isBusinessDay,
    isHoliday:         r.isHoliday,
    holidayName:       r.holidayName,
    holidayType:       r.holidayType,
    marketOpenTime:    fmtTime(r.marketOpenTime),
    marketCloseTime:   fmtTime(r.marketCloseTime),
    settlementAllowed: r.settlementAllowed,
    withdrawalAllowed: r.withdrawalAllowed,
    investmentAllowed: r.investmentAllowed,
    remarks:           r.remarks,
    createdAt:         r.createdAt.toISOString(),
    updatedAt:         r.updatedAt.toISOString(),
  };
}

// ─── Get calendar for a month ─────────────────────────────────────────────────

export async function getCalendarMonth(year: number, month: number): Promise<TradingDayRecord[]> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end   = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // last day of month

  const records = await prisma.tradingCalendar.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });

  return records.map(mapRecord);
}

// ─── Get single day ───────────────────────────────────────────────────────────

export async function getTradingDay(dateStr: string): Promise<TradingDayRecord | null> {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  const record = await prisma.tradingCalendar.findUnique({ where: { date } });
  if (!record) return null;
  return mapRecord(record);
}

// ─── Get upcoming events ──────────────────────────────────────────────────────

export async function getUpcomingEvents(limit = 10): Promise<TradingDayRecord[]> {
  const today = toDateOnly(new Date());

  const records = await prisma.tradingCalendar.findMany({
    where: {
      date: { gte: today },
      OR: [
        { isHoliday: true },
        { isBusinessDay: false },
        { investmentAllowed: false },
      ],
    },
    orderBy: { date: "asc" },
    take: limit,
  });

  return records.map(mapRecord);
}

// ─── Calendar stats for current month ────────────────────────────────────────

export async function getCalendarStats(): Promise<CalendarStats> {
  const now   = new Date();
  const year  = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end   = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
  const today = toDateOnly(now);

  const [monthRecords, upcomingCount, nextClosure] = await Promise.all([
    prisma.tradingCalendar.findMany({
      where: { date: { gte: start, lte: end } },
      select: { isBusinessDay: true, isHoliday: true, holidayType: true },
    }),
    prisma.tradingCalendar.count({
      where: {
        date: { gte: today },
        OR: [{ isHoliday: true }, { isBusinessDay: false }],
      },
    }),
    prisma.tradingCalendar.findFirst({
      where: {
        date: { gte: today },
        OR: [{ isHoliday: true }, { isBusinessDay: false }],
      },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);

  // Default Mon–Fri = business days in this month if no DB override
  let tradingDaysThisMonth = 0;
  let closedDaysThisMonth  = 0;
  let specialHolidays      = 0;

  // Walk each calendar day of the month
  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const dbMap = new Map(monthRecords.map((_, i) => {
    // build by re-querying — we'll use the records array directly
    return [i, _];
  }));

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(Date.UTC(year, month, day));
    const dow = d.getUTCDay(); // 0=Sun 6=Sat
    // Find override
    const override = monthRecords.find((r, i) => {
      // We don't have the date here; use default weekday logic
      return false;
    });
    // Default: Mon–Fri open, Sat/Sun closed
    const defaultOpen = dow >= 1 && dow <= 5;
    if (defaultOpen) tradingDaysThisMonth++;
    else             closedDaysThisMonth++;
  }

  // Apply DB overrides
  for (const r of monthRecords) {
    if (r.isHoliday) {
      closedDaysThisMonth++;
      tradingDaysThisMonth = Math.max(0, tradingDaysThisMonth - 1);
      if (r.holidayType !== "WEEKEND") specialHolidays++;
    } else if (!r.isBusinessDay) {
      closedDaysThisMonth++;
      tradingDaysThisMonth = Math.max(0, tradingDaysThisMonth - 1);
    }
  }

  return {
    tradingDaysThisMonth,
    closedDaysThisMonth,
    specialHolidays,
    upcomingEventsCount: upcomingCount,
    nextMarketClosure:   nextClosure ? fmtDate(nextClosure.date) : null,
  };
}

// ─── Better stats using actual date iteration ─────────────────────────────────

export async function getCalendarStatsAccurate(): Promise<CalendarStats> {
  const now   = new Date();
  const year  = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-based
  const start = new Date(Date.UTC(year, month, 1));
  const end   = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
  const today = toDateOnly(now);

  const [monthRecords, upcomingCount, nextClosure] = await Promise.all([
    prisma.tradingCalendar.findMany({
      where: { date: { gte: start, lte: end } },
    }),
    prisma.tradingCalendar.count({
      where: {
        date: { gte: today },
        OR: [{ isHoliday: true }, { isBusinessDay: false }],
      },
    }),
    prisma.tradingCalendar.findFirst({
      where: {
        date: { gte: today },
        OR: [{ isHoliday: true }, { isBusinessDay: false }],
      },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);

  // Build a map: "YYYY-MM-DD" → record
  const overrideMap = new Map<string, typeof monthRecords[number]>();
  for (const r of monthRecords) {
    overrideMap.set(fmtDate(r.date), r);
  }

  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  let tradingDays = 0;
  let closedDays  = 0;
  let specialHols = 0;

  for (let day = 1; day <= totalDays; day++) {
    const d    = new Date(Date.UTC(year, month, day));
    const key  = fmtDate(d);
    const dow  = d.getUTCDay(); // 0=Sun, 6=Sat
    const override = overrideMap.get(key);

    let isOpen    = dow >= 1 && dow <= 5; // Mon–Fri default
    let isHoliday = false;
    let hType: HolidayType | null = null;

    if (override) {
      isOpen    = override.isBusinessDay && !override.isHoliday;
      isHoliday = override.isHoliday;
      hType     = override.holidayType;
    }

    if (isOpen)    tradingDays++;
    else           closedDays++;

    if (isHoliday && hType !== "WEEKEND") specialHols++;
  }

  return {
    tradingDaysThisMonth:  tradingDays,
    closedDaysThisMonth:   closedDays,
    specialHolidays:       specialHols,
    upcomingEventsCount:   upcomingCount,
    nextMarketClosure:     nextClosure ? fmtDate(nextClosure.date) : null,
  };
}

// ─── Create trading day override ──────────────────────────────────────────────

export interface CreateTradingDayInput {
  date:              string; // "YYYY-MM-DD"
  isBusinessDay:     boolean;
  isHoliday:         boolean;
  holidayName?:      string;
  holidayType?:      HolidayType;
  marketOpenTime?:   string; // "HH:MM"
  marketCloseTime?:  string; // "HH:MM"
  settlementAllowed: boolean;
  withdrawalAllowed: boolean;
  investmentAllowed: boolean;
  remarks?:          string;
}

function parseTimeToDate(t: string): Date {
  const [hh, mm] = t.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hh, mm, 0));
}

export async function createTradingDay(
  input: CreateTradingDayInput
): Promise<TradingDayRecord> {
  const [y, m, d] = input.date.split("-").map(Number);
  const dateObj   = new Date(Date.UTC(y, m - 1, d));
  const dow       = dateObj.getUTCDay() === 0 ? 7 : dateObj.getUTCDay(); // 1=Mon 7=Sun

  const record = await prisma.tradingCalendar.create({
    data: {
      date:              dateObj,
      dayOfWeek:         dow,
      isBusinessDay:     input.isBusinessDay,
      isHoliday:         input.isHoliday,
      holidayName:       input.holidayName ?? null,
      holidayType:       input.holidayType ?? null,
      marketOpenTime:    input.marketOpenTime  ? parseTimeToDate(input.marketOpenTime)  : null,
      marketCloseTime:   input.marketCloseTime ? parseTimeToDate(input.marketCloseTime) : null,
      settlementAllowed: input.settlementAllowed,
      withdrawalAllowed: input.withdrawalAllowed,
      investmentAllowed: input.investmentAllowed,
      remarks:           input.remarks ?? null,
    },
  });

  return mapRecord(record);
}

// ─── Update trading day override ─────────────────────────────────────────────

export type UpdateTradingDayInput = Partial<Omit<CreateTradingDayInput, "date">>;

export async function updateTradingDay(
  id: string,
  input: UpdateTradingDayInput
): Promise<TradingDayRecord> {
  const data: Record<string, unknown> = {};

  if (input.isBusinessDay     !== undefined) data.isBusinessDay     = input.isBusinessDay;
  if (input.isHoliday         !== undefined) data.isHoliday         = input.isHoliday;
  if (input.holidayName       !== undefined) data.holidayName       = input.holidayName;
  if (input.holidayType       !== undefined) data.holidayType       = input.holidayType;
  if (input.settlementAllowed !== undefined) data.settlementAllowed = input.settlementAllowed;
  if (input.withdrawalAllowed !== undefined) data.withdrawalAllowed = input.withdrawalAllowed;
  if (input.investmentAllowed !== undefined) data.investmentAllowed = input.investmentAllowed;
  if (input.remarks           !== undefined) data.remarks           = input.remarks;
  if (input.marketOpenTime    !== undefined) data.marketOpenTime    = input.marketOpenTime ? parseTimeToDate(input.marketOpenTime)  : null;
  if (input.marketCloseTime   !== undefined) data.marketCloseTime   = input.marketCloseTime ? parseTimeToDate(input.marketCloseTime) : null;

  const record = await prisma.tradingCalendar.update({
    where: { id },
    data,
  });

  return mapRecord(record);
}

// ─── Delete trading day override ─────────────────────────────────────────────

export async function deleteTradingDay(id: string): Promise<void> {
  await prisma.tradingCalendar.delete({ where: { id } });
}

// ─── Toggle market status ─────────────────────────────────────────────────────

export async function toggleMarketStatus(
  id: string,
  isBusinessDay: boolean
): Promise<TradingDayRecord> {
  const record = await prisma.tradingCalendar.update({
    where: { id },
    data: {
      isBusinessDay,
      investmentAllowed: isBusinessDay,
      // Keep withdrawalAllowed and settlementAllowed as-is — those are independent
    },
  });
  return mapRecord(record);
}

// ─── Check if date is in past ─────────────────────────────────────────────────

export function isPastDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date  = new Date(Date.UTC(y, m - 1, d));
  const today = toDateOnly(new Date());
  return date < today;
}

// ─── Get single day by ID ─────────────────────────────────────────────────────

export async function getTradingDayById(id: string): Promise<TradingDayRecord | null> {
  const record = await prisma.tradingCalendar.findUnique({ where: { id } });
  if (!record) return null;
  return mapRecord(record);
}
