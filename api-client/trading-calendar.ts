/**
 * Client-side trading calendar hooks — TanStack Query wrappers for the admin
 * trading calendar API.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/client";

// ─── Shared ───────────────────────────────────────────────────────────────────

interface ApiSuccess<T> { success: true; data: T }

export function extractCalendarError(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } };
  return e?.response?.data?.error?.message ?? "Something went wrong.";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type HolidayType = "NATIONAL" | "BANK" | "MARKET" | "WEEKEND" | "SPECIAL";

export interface TradingDay {
  id:                string;
  date:              string; // "YYYY-MM-DD"
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
}

export interface CalendarStats {
  tradingDaysThisMonth:  number;
  closedDaysThisMonth:   number;
  specialHolidays:       number;
  upcomingEventsCount:   number;
  nextMarketClosure:     string | null;
}

export interface CreateTradingDayPayload {
  date:              string;
  isBusinessDay:     boolean;
  isHoliday:         boolean;
  holidayName?:      string;
  holidayType?:      HolidayType;
  marketOpenTime?:   string;
  marketCloseTime?:  string;
  settlementAllowed: boolean;
  withdrawalAllowed: boolean;
  investmentAllowed: boolean;
  remarks?:          string;
}

export type UpdateTradingDayPayload = Partial<Omit<CreateTradingDayPayload, "date">>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the default market status for any date using weekday rules.
 *  Mon–Fri = open, Sat/Sun = closed. DB overrides take precedence. */
export function getDefaultMarketStatus(dateStr: string): boolean {
  const d   = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0=Sun, 6=Sat
  return dow >= 1 && dow <= 5;
}

/** Merge DB overrides with weekday defaults for a full month view.
 *  Returns a map of "YYYY-MM-DD" → effective isBusinessDay */
export function buildCalendarMap(
  year:    number,
  month:   number, // 1-based
  records: TradingDay[]
): Map<string, { isOpen: boolean; record: TradingDay | null }> {
  const map = new Map<string, { isOpen: boolean; record: TradingDay | null }>();
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

  for (let day = 1; day <= totalDays; day++) {
    const d   = new Date(Date.UTC(year, month - 1, day));
    const key = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    map.set(key, { isOpen: dow >= 1 && dow <= 5, record: null });
  }

  for (const r of records) {
    const existing = map.get(r.date);
    if (existing) {
      map.set(r.date, {
        isOpen: r.isBusinessDay && !r.isHoliday,
        record: r,
      });
    }
  }

  return map;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const calendarKeys = {
  all:      ["admin", "trading-calendar"] as const,
  month:    (y: number, m: number) => ["admin", "trading-calendar", "month", y, m] as const,
  stats:    () => ["admin", "trading-calendar", "stats"] as const,
  upcoming: (limit?: number) => ["admin", "trading-calendar", "upcoming", limit ?? 10] as const,
  day:      (date: string) => ["admin", "trading-calendar", "day", date] as const,
};

// ─── Hooks: calendar month ────────────────────────────────────────────────────

export function useCalendarMonth(year: number, month: number) {
  return useQuery({
    queryKey: calendarKeys.month(year, month),
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ days: TradingDay[]; year: number; month: number }>>(
        `/admin/trading-calendar?year=${year}&month=${month}`
      );
      return r.data.data;
    },
    staleTime: 60_000,
    retry: false,
  });
}

// ─── Hooks: stats ─────────────────────────────────────────────────────────────

export function useCalendarStats() {
  return useQuery({
    queryKey: calendarKeys.stats(),
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ stats: CalendarStats }>>(
        `/admin/trading-calendar/stats`
      );
      return r.data.data.stats;
    },
    staleTime: 120_000,
    retry: false,
  });
}

// ─── Hooks: upcoming events ───────────────────────────────────────────────────

export function useUpcomingEvents(limit = 10) {
  return useQuery({
    queryKey: calendarKeys.upcoming(limit),
    queryFn: async () => {
      const r = await apiClient.get<ApiSuccess<{ events: TradingDay[] }>>(
        `/admin/trading-calendar/upcoming?limit=${limit}`
      );
      return r.data.data.events;
    },
    staleTime: 60_000,
    retry: false,
  });
}

// ─── Hooks: create day ────────────────────────────────────────────────────────

export function useCreateTradingDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTradingDayPayload) => {
      const r = await apiClient.post<ApiSuccess<{ day: TradingDay }>>(
        `/admin/trading-calendar`,
        payload
      );
      return r.data.data.day;
    },
    onSuccess: (day) => {
      const d = new Date(day.date + "T00:00:00Z");
      qc.invalidateQueries({ queryKey: calendarKeys.month(d.getUTCFullYear(), d.getUTCMonth() + 1) });
      qc.invalidateQueries({ queryKey: calendarKeys.stats() });
      qc.invalidateQueries({ queryKey: calendarKeys.upcoming() });
    },
  });
}

// ─── Hooks: update day ────────────────────────────────────────────────────────

export function useUpdateTradingDay(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateTradingDayPayload) => {
      const r = await apiClient.patch<ApiSuccess<{ day: TradingDay }>>(
        `/admin/trading-calendar/${id}`,
        payload
      );
      return r.data.data.day;
    },
    onSuccess: (day) => {
      const d = new Date(day.date + "T00:00:00Z");
      qc.invalidateQueries({ queryKey: calendarKeys.month(d.getUTCFullYear(), d.getUTCMonth() + 1) });
      qc.invalidateQueries({ queryKey: calendarKeys.stats() });
      qc.invalidateQueries({ queryKey: calendarKeys.upcoming() });
      qc.invalidateQueries({ queryKey: calendarKeys.day(day.date) });
    },
  });
}

// ─── Hooks: delete day ────────────────────────────────────────────────────────

export function useDeleteTradingDay(id: string, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/admin/trading-calendar/${id}`);
    },
    onSuccess: () => {
      const d = new Date(date + "T00:00:00Z");
      qc.invalidateQueries({ queryKey: calendarKeys.month(d.getUTCFullYear(), d.getUTCMonth() + 1) });
      qc.invalidateQueries({ queryKey: calendarKeys.stats() });
      qc.invalidateQueries({ queryKey: calendarKeys.upcoming() });
      qc.invalidateQueries({ queryKey: calendarKeys.day(date) });
    },
  });
}

// ─── Hooks: toggle market ─────────────────────────────────────────────────────

export function useToggleMarket(id: string, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (isBusinessDay: boolean) => {
      const r = await apiClient.patch<ApiSuccess<{ day: TradingDay }>>(
        `/admin/trading-calendar/${id}/toggle`,
        { isBusinessDay }
      );
      return r.data.data.day;
    },
    onSuccess: (day) => {
      const d = new Date(day.date + "T00:00:00Z");
      qc.invalidateQueries({ queryKey: calendarKeys.month(d.getUTCFullYear(), d.getUTCMonth() + 1) });
      qc.invalidateQueries({ queryKey: calendarKeys.stats() });
      qc.invalidateQueries({ queryKey: calendarKeys.upcoming() });
      qc.invalidateQueries({ queryKey: calendarKeys.day(date) });
    },
  });
}

// ─── Holiday type labels ──────────────────────────────────────────────────────

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  NATIONAL: "National Holiday",
  BANK:     "Bank Holiday",
  MARKET:   "Market Holiday",
  WEEKEND:  "Weekend",
  SPECIAL:  "Special Session",
};

export const HOLIDAY_TYPE_COLORS: Record<HolidayType, string> = {
  NATIONAL: "bg-red-100 text-red-700 border-red-200",
  BANK:     "bg-orange-100 text-orange-700 border-orange-200",
  MARKET:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  WEEKEND:  "bg-slate-100 text-slate-500 border-slate-200",
  SPECIAL:  "bg-blue-100 text-blue-700 border-blue-200",
};
