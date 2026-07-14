"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Info, Pencil, Plus, RefreshCw, Search, Trash2, TrendingUp,
  X, XCircle, CalendarX, Sparkles, Building2, Globe, Landmark, Star,
} from "lucide-react";
import {
  useCalendarMonth, useCalendarStats, useUpcomingEvents,
  useCreateTradingDay, useUpdateTradingDay, useDeleteTradingDay,
  useToggleMarket, buildCalendarMap, extractCalendarError,
  HOLIDAY_TYPE_LABELS, HOLIDAY_TYPE_COLORS,
  type TradingDay, type HolidayType, type CreateTradingDayPayload,
} from "@/api-client/trading-calendar";
import { useUser } from "@/api-client/user";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const WEEK_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const HOLIDAY_ICONS: Record<HolidayType, typeof Globe> = {
  NATIONAL: Globe,
  BANK:     Landmark,
  MARKET:   Building2,
  WEEKEND:  CalendarDays,
  SPECIAL:  Star,
};

const REASON_PRESETS = [
  "National Holiday",
  "Bank Holiday",
  "Market Holiday",
  "Maintenance Window",
  "Emergency Closure",
  "Special Trading Session",
  "Festival Holiday",
  "Financial Year Opening",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function isPast(dateStr: string): boolean {
  return dateStr < todayISO();
}

function fmtDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric", timeZone:"UTC" });
}

function fmtShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric", timeZone:"UTC" });
}

function fmtRelative(dateStr: string): string {
  const today = new Date(todayISO() + "T00:00:00Z");
  const d     = new Date(dateStr + "T00:00:00Z");
  const diff  = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0)  return `${Math.abs(diff)}d ago`;
  if (diff < 7)  return `In ${diff} days`;
  if (diff < 30) return `In ${Math.floor(diff/7)} week${Math.floor(diff/7)>1?"s":""}`;
  return fmtShortDate(dateStr);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  label:    string;
  value:    string | number;
  sub?:     string;
  icon:     React.ReactNode;
  color:    string; // Tailwind classes for icon bg + text
  loading?: boolean;
}

function KpiCard({ label, value, sub, icon, color, loading }: KpiProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Sk className="h-8 w-8 mb-3" />
        <Sk className="h-4 w-20 mb-2" />
        <Sk className="h-7 w-12" />
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px 0 rgba(0,0,0,0.08)" }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm cursor-default"
    >
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-800">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </motion.div>
  );
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

interface CalendarGridProps {
  year:       number;
  month:      number;
  records:    TradingDay[];
  selected:   string | null;
  onSelect:   (dateStr: string) => void;
  loading:    boolean;
}

function CalendarGrid({ year, month, records, selected, onSelect, loading }: CalendarGridProps) {
  const today  = todayISO();
  const calMap = useMemo(() => buildCalendarMap(year, month, records), [year, month, records]);

  // Build grid: padding blanks + day cells
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=Sun
  // Convert to Mon-based index (0=Mon … 6=Sun)
  const padStart = firstDow === 0 ? 6 : firstDow - 1;
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (loading) {
    return (
      <div className="grid grid-cols-7 gap-1 mt-2">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">{d}</div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Sk key={i} className="h-11 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-2">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_DAYS.map((d, i) => (
          <div
            key={d}
            className={`py-2 text-center text-[10px] font-bold uppercase tracking-wider ${
              i >= 5 ? "text-red-400" : "text-slate-400"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading blanks */}
        {Array.from({ length: padStart }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {Array.from({ length: totalDays }).map((_, i) => {
          const day     = i + 1;
          const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const cell    = calMap.get(dateStr);
          const isOpen  = cell?.isOpen ?? false;
          const record  = cell?.record ?? null;
          const past    = isPast(dateStr);
          const isToday = dateStr === today;
          const isSel   = dateStr === selected;
          const dow     = new Date(dateStr + "T00:00:00Z").getUTCDay();
          const isWeekend = dow === 0 || dow === 6;

          // Colour scheme
          let dotColor  = "";
          let bgClass   = "";
          let textClass = "";
          let ringClass = "";

          if (isSel) {
            ringClass = "ring-2 ring-blue-400 ring-offset-1";
          }

          if (past) {
            bgClass   = "bg-slate-50 hover:bg-slate-100";
            textClass = "text-slate-400";
            dotColor  = "bg-slate-300";
          } else if (isOpen) {
            bgClass   = "bg-emerald-50 hover:bg-emerald-100";
            textClass = "text-emerald-800 font-semibold";
            dotColor  = "bg-emerald-400";
          } else {
            bgClass   = "bg-red-50 hover:bg-red-100";
            textClass = "text-red-700 font-semibold";
            dotColor  = "bg-red-400";
          }

          if (isToday) {
            bgClass   = isOpen ? "bg-emerald-500" : "bg-red-500";
            textClass = "text-white font-extrabold";
            dotColor  = "bg-white/70";
          }

          return (
            <motion.button
              key={dateStr}
              type="button"
              title={`${fmtDisplayDate(dateStr)} — ${isOpen ? "Market Open" : "Market Closed"}${record?.holidayName ? ` (${record.holidayName})` : ""}`}
              onClick={() => onSelect(dateStr)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className={[
                "relative flex flex-col items-center justify-center rounded-xl py-2 px-1 text-sm transition-all",
                bgClass, textClass, ringClass,
                isToday ? "shadow-lg" : "",
              ].join(" ")}
            >
              <span className="leading-none">{day}</span>
              <span className={`mt-1 h-1.5 w-1.5 rounded-full ${dotColor}`} />
              {record && !isToday && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-100">
      {[
        { dot: "bg-emerald-400", label: "Market Open"   },
        { dot: "bg-red-400",     label: "Market Closed" },
        { dot: "bg-slate-300",   label: "Past Date"     },
        { dot: "bg-blue-400",    label: "Override Set"  },
      ].map(({ dot, label }) => (
        <span key={label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          {label}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <span className="h-4 w-4 rounded-md ring-2 ring-blue-400 ring-offset-1 bg-white inline-block" />
        Selected
      </span>
    </div>
  );
}

// ─── Day Settings Panel ───────────────────────────────────────────────────────

interface DayPanelProps {
  dateStr:     string;
  record:      TradingDay | null;
  isOpen:      boolean;        // effective market status (default + override)
  calLoading:  boolean;
  onSaved:     () => void;
}

function DaySettingsPanel({ dateStr, record, isOpen, calLoading, onSaved }: DayPanelProps) {
  const past  = isPast(dateStr);
  const today = todayISO();

  // Form state
  const [mode,       setMode]       = useState<"view"|"edit"|"create">("view");
  const [marketOpen, setMarketOpen] = useState(isOpen);
  const [isHoliday,  setIsHoliday]  = useState(record?.isHoliday ?? false);
  const [hName,      setHName]      = useState(record?.holidayName ?? "");
  const [hType,      setHType]      = useState<HolidayType | "">(record?.holidayType ?? "");
  const [remarks,    setRemarks]    = useState(record?.remarks ?? "");
  const [invAllowed, setInvAllowed] = useState(record?.investmentAllowed ?? isOpen);
  const [wdAllowed,  setWdAllowed]  = useState(record?.withdrawalAllowed ?? true);
  const [openTime,   setOpenTime]   = useState(record?.marketOpenTime ?? "09:15");
  const [closeTime,  setCloseTime]  = useState(record?.marketCloseTime ?? "15:30");
  const [confirmDlg, setConfirmDlg] = useState(false);
  const [delDlg,     setDelDlg]     = useState(false);
  const [err,        setErr]        = useState("");
  const [success,    setSuccess]    = useState("");

  const createDay = useCreateTradingDay();
  const updateDay = useUpdateTradingDay(record?.id ?? "");
  const deleteDay = useDeleteTradingDay(record?.id ?? "", dateStr);
  const toggleMkt = useToggleMarket(record?.id ?? "", dateStr);

  // Sync form when date/record changes
  useEffect(() => {
    setMode("view");
    setMarketOpen(isOpen);
    setIsHoliday(record?.isHoliday ?? false);
    setHName(record?.holidayName ?? "");
    setHType(record?.holidayType ?? "");
    setRemarks(record?.remarks ?? "");
    setInvAllowed(record?.investmentAllowed ?? isOpen);
    setWdAllowed(record?.withdrawalAllowed ?? true);
    setOpenTime(record?.marketOpenTime ?? "09:15");
    setCloseTime(record?.marketCloseTime ?? "15:30");
    setErr("");
    setSuccess("");
    setConfirmDlg(false);
    setDelDlg(false);
  }, [dateStr, record, isOpen]);

  const isBusy = createDay.isPending || updateDay.isPending || deleteDay.isPending || toggleMkt.isPending;

  async function handleSave() {
    setErr("");
    setSuccess("");
    try {
      const payload: CreateTradingDayPayload = {
        date:              dateStr,
        isBusinessDay:     marketOpen,
        isHoliday,
        holidayName:       hName.trim() || undefined,
        holidayType:       hType || undefined,
        marketOpenTime:    marketOpen ? openTime : undefined,
        marketCloseTime:   marketOpen ? closeTime : undefined,
        settlementAllowed: true,
        withdrawalAllowed: wdAllowed,
        investmentAllowed: invAllowed,
        remarks:           remarks.trim() || undefined,
      };
      if (record) {
        await updateDay.mutateAsync(payload);
        setSuccess("Settings updated successfully.");
      } else {
        await createDay.mutateAsync(payload);
        setSuccess("Settings created successfully.");
      }
      setMode("view");
      setConfirmDlg(false);
      onSaved();
    } catch (e) {
      setErr(extractCalendarError(e));
      setConfirmDlg(false);
    }
  }

  async function handleDelete() {
    setErr("");
    try {
      await deleteDay.mutateAsync();
      setSuccess("Override removed. Using default schedule.");
      setDelDlg(false);
      setMode("view");
      onSaved();
    } catch (e) {
      setErr(extractCalendarError(e));
      setDelDlg(false);
    }
  }

  async function handleQuickToggle() {
    if (!record) return;
    setErr("");
    try {
      await toggleMkt.mutateAsync(!isOpen);
      setSuccess(`Market ${!isOpen ? "opened" : "closed"} successfully.`);
      onSaved();
    } catch (e) {
      setErr(extractCalendarError(e));
    }
  }

  if (calLoading) {
    return (
      <div className="space-y-3">
        <Sk className="h-6 w-40" />
        <Sk className="h-4 w-28" />
        <Sk className="h-20 w-full mt-2" />
        <Sk className="h-10 w-full mt-2" />
      </div>
    );
  }

  const statusColor = isOpen
    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
    : "bg-red-50 border-red-200 text-red-700";

  return (
    <div className="space-y-4">
      {/* Date heading */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Selected Date</p>
        <p className="text-sm font-extrabold text-slate-800 leading-snug">{fmtDisplayDate(dateStr)}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{fmtRelative(dateStr)}</p>
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${statusColor}`}>
        {isOpen
          ? <CheckCircle2 size={15} className="shrink-0" />
          : <XCircle size={15} className="shrink-0" />}
        <span className="text-sm font-bold">{isOpen ? "Market Open" : "Market Closed"}</span>
        {record && (
          <span className="ml-auto text-[10px] font-semibold opacity-70">Override</span>
        )}
      </div>

      {/* Holiday badge */}
      {record?.isHoliday && record.holidayName && (
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${HOLIDAY_TYPE_COLORS[record.holidayType ?? "SPECIAL"]}`}>
          <span>{record.holidayName}</span>
          {record.holidayType && (
            <span className="ml-auto opacity-70">{HOLIDAY_TYPE_LABELS[record.holidayType]}</span>
          )}
        </div>
      )}

      {/* Success / error banners */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs text-emerald-700"
          >
            <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess("")} className="ml-auto"><X size={12} /></button>
          </motion.div>
        )}
        {err && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700"
          >
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <span>{err}</span>
            <button type="button" onClick={() => setErr("")} className="ml-auto"><X size={12} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Past date notice */}
      {past && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-700">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>Past trading records cannot be modified.</span>
        </div>
      )}

      {/* Record meta */}
      {record && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 space-y-2 text-xs text-slate-500">
          {record.marketOpenTime && (
            <div className="flex items-center gap-2">
              <Clock size={11} className="shrink-0" />
              <span>{record.marketOpenTime} – {record.marketCloseTime ?? "–"}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>Investment</span>
            <span className={`font-semibold ${record.investmentAllowed ? "text-emerald-600" : "text-red-500"}`}>
              {record.investmentAllowed ? "Allowed" : "Blocked"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Withdrawal</span>
            <span className={`font-semibold ${record.withdrawalAllowed ? "text-emerald-600" : "text-red-500"}`}>
              {record.withdrawalAllowed ? "Allowed" : "Blocked"}
            </span>
          </div>
          {record.remarks && (
            <p className="pt-1 border-t border-slate-200 text-slate-400 italic">{record.remarks}</p>
          )}
          <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
            <span>Updated</span>
            <span>{new Date(record.updatedAt).toLocaleDateString("en-IN")}</span>
          </div>
        </div>
      )}

      {!record && !past && (
        <p className="text-xs text-slate-400 italic">
          No custom setting. Using default weekday schedule.
        </p>
      )}

      {/* Actions (future dates only) */}
      {!past && mode === "view" && (
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => setMode(record ? "edit" : "create")}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            {record ? <><Pencil size={13}/> Edit Settings</> : <><Plus size={13}/> Add Override</>}
          </button>
          {record && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleQuickToggle}
                disabled={isBusy}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  isOpen
                    ? "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                    : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {isOpen ? <XCircle size={12}/> : <CheckCircle2 size={12}/>}
                {isBusy ? "…" : isOpen ? "Close Market" : "Open Market"}
              </button>
              <button
                type="button"
                onClick={() => setDelDlg(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={12}/>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit / Create form */}
      <AnimatePresence>
        {(mode === "edit" || mode === "create") && !past && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-700">{record ? "Edit Settings" : "New Override"}</p>
              <button type="button" onClick={() => setMode("view")} className="text-slate-400 hover:text-slate-600">
                <X size={14}/>
              </button>
            </div>

            {/* Market status toggle */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
              <span className="text-xs font-semibold text-slate-700">Market Status</span>
              <button
                type="button"
                onClick={() => { setMarketOpen(v => !v); setInvAllowed(v => !v); }}
                className={`relative h-6 w-11 rounded-full transition-colors ${marketOpen ? "bg-emerald-500" : "bg-slate-300"}`}
                role="switch"
                aria-checked={marketOpen}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${marketOpen ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className={`text-xs font-semibold ml-2 ${marketOpen ? "text-emerald-600" : "text-slate-400"}`}>
                {marketOpen ? "Open" : "Closed"}
              </span>
            </div>

            {/* Holiday toggle */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
              <span className="text-xs font-semibold text-slate-700">Mark as Holiday</span>
              <button
                type="button"
                onClick={() => setIsHoliday(v => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${isHoliday ? "bg-orange-500" : "bg-slate-300"}`}
                role="switch"
                aria-checked={isHoliday}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isHoliday ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {/* Holiday details */}
            {isHoliday && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Holiday Name</label>
                  <input
                    value={hName}
                    onChange={e => setHName(e.target.value)}
                    placeholder="e.g. Independence Day"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {REASON_PRESETS.map(p => (
                      <button key={p} type="button" onClick={() => setHName(p)}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-200 transition-colors">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Holiday Type</label>
                  <select
                    value={hType}
                    onChange={e => setHType(e.target.value as HolidayType | "")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">Select type…</option>
                    {Object.entries(HOLIDAY_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Market hours */}
            {marketOpen && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Open Time</label>
                  <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Close Time</label>
                  <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                </div>
              </div>
            )}

            {/* Permissions */}
            <div className="space-y-2">
              {[
                { label: "Investment Allowed", val: invAllowed, set: setInvAllowed },
                { label: "Withdrawal Allowed", val: wdAllowed,  set: setWdAllowed  },
              ].map(({ label, val, set }) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                  <span className="text-[11px] font-semibold text-slate-600">{label}</span>
                  <button type="button" onClick={() => set(v => !v)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${val ? "bg-emerald-500" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${val ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Remarks (optional)</label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={2}
                placeholder="Add a note…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
              />
            </div>

            {/* Save / cancel */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setMode("view")}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={() => setConfirmDlg(true)} disabled={isBusy}
                className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {isBusy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm save dialog */}
      <AnimatePresence>
        {confirmDlg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3"
          >
            <p className="text-xs font-bold text-amber-800">Confirm Changes</p>
            <p className="text-xs text-amber-700">
              {marketOpen
                ? "This will mark the market as Open for this date."
                : "This will close the market for this date. Users will not be able to make new investments."}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmDlg(false)}
                className="flex-1 rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={isBusy}
                className="flex-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors">
                {isBusy ? "Saving…" : "Confirm"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm delete dialog */}
      <AnimatePresence>
        {delDlg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3"
          >
            <p className="text-xs font-bold text-red-800">Remove Override</p>
            <p className="text-xs text-red-700">
              This will delete the custom setting and revert to the default weekday schedule.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDelDlg(false)}
                className="flex-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={isBusy}
                className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                {isBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Upcoming Events Panel ────────────────────────────────────────────────────

function UpcomingEventsPanel() {
  const { data: events, isLoading, error, refetch } = useUpcomingEvents(15);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
            <Sk className="h-3.5 w-32" />
            <Sk className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
        <AlertCircle size={13}/> Failed to load events.
        <button onClick={() => refetch()} className="ml-auto underline">Retry</button>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-8 px-4 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Sparkles size={18} className="text-slate-300" />
        </div>
        <p className="text-xs font-semibold text-slate-600">No upcoming trading events</p>
        <p className="text-[11px] text-slate-400">All future dates follow the default schedule.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
      {events.map((ev, i) => {
        const isOpen  = ev.isBusinessDay && !ev.isHoliday;
        const HIcon   = ev.holidayType ? HOLIDAY_ICONS[ev.holidayType] : CalendarX;
        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="group rounded-xl border border-slate-100 bg-white p-3 hover:border-slate-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                isOpen ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"
              }`}>
                <HIcon size={14}/>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-700 truncate">
                  {ev.holidayName ?? (isOpen ? "Special Open Day" : "Market Closed")}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{fmtShortDate(ev.date)} · {fmtRelative(ev.date)}</p>
                {ev.remarks && (
                  <p className="text-[11px] text-slate-400 mt-1 italic truncate">{ev.remarks}</p>
                )}
              </div>
              <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold border ${
                isOpen
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-red-50 text-red-600 border-red-200"
              }`}>
                {isOpen ? "Open" : "Closed"}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function TradingCalendarContent() {
  const now            = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [selected, setSelected] = useState<string | null>(null);

  const { data: calData, isLoading: calLoading, error: calError, refetch: refetchCal } =
    useCalendarMonth(year, month);

  const { data: stats, isLoading: statsLoading } = useCalendarStats();
  const { user } = useUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // Default to today when page loads
  useEffect(() => {
    setSelected(todayISO());
  }, []);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else              setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else               setMonth(m => m + 1);
  }
  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSelected(todayISO());
  }

  const calMap = useMemo(
    () => buildCalendarMap(year, month, calData?.days ?? []),
    [year, month, calData?.days]
  );

  const selectedCell = selected ? calMap.get(selected) : null;
  const selectedRecord = selectedCell?.record ?? null;
  const selectedIsOpen = selectedCell?.isOpen ?? (selected ? (() => {
    const dow = new Date(selected + "T00:00:00Z").getUTCDay();
    return dow >= 1 && dow <= 5;
  })() : false);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="min-h-full bg-[#f8fafc] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
              <CalendarDays size={15} className="text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Trading Calendar</h1>
          </div>
          <p className="text-sm text-slate-400">Configure market open and closed days for investment operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            {MONTHS[month - 1]} {year}
          </span>
          {!isCurrentMonth && (
            <button type="button" onClick={goToday}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors">
              <CalendarDays size={12}/> Today
            </button>
          )}
          <button type="button" onClick={() => refetchCal()}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
            title="Refresh">
            <RefreshCw size={14}/>
          </button>
        </div>
      </motion.div>

      {/* KPI Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6"
      >
        <KpiCard
          loading={statsLoading}
          label="Trading Days"
          value={stats?.tradingDaysThisMonth ?? "–"}
          sub="This month"
          icon={<TrendingUp size={18}/>}
          color="bg-emerald-100 text-emerald-600"
        />
        <KpiCard
          loading={statsLoading}
          label="Closed Days"
          value={stats?.closedDaysThisMonth ?? "–"}
          sub="This month"
          icon={<XCircle size={18}/>}
          color="bg-red-100 text-red-500"
        />
        <KpiCard
          loading={statsLoading}
          label="Special Holidays"
          value={stats?.specialHolidays ?? "–"}
          sub="Configured"
          icon={<Sparkles size={18}/>}
          color="bg-violet-100 text-violet-600"
        />
        <KpiCard
          loading={statsLoading}
          label="Upcoming Events"
          value={stats?.upcomingEventsCount ?? "–"}
          sub="Future closures"
          icon={<CalendarDays size={18}/>}
          color="bg-blue-100 text-blue-600"
        />
        <KpiCard
          loading={statsLoading}
          label="Next Closure"
          value={stats?.nextMarketClosure ? fmtRelative(stats.nextMarketClosure) : "None"}
          sub={stats?.nextMarketClosure ? fmtShortDate(stats.nextMarketClosure) : "No closures upcoming"}
          icon={<CalendarX size={18}/>}
          color="bg-orange-100 text-orange-600"
        />
      </motion.div>

      {/* Global error */}
      {calError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={15}/>
          <span>Failed to load calendar data.</span>
          <button onClick={() => refetchCal()} className="ml-auto flex items-center gap-1 text-xs underline">
            <RefreshCw size={12}/> Retry
          </button>
        </div>
      )}

      {/* Main content: calendar (70%) + right panel (30%) */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* ── Calendar Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 lg:w-[70%] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              aria-label="Previous month">
              <ChevronLeft size={16}/>
            </button>

            <AnimatePresence mode="wait">
              <motion.h2
                key={`${year}-${month}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
                className="text-base font-extrabold text-slate-800 tracking-tight"
              >
                {MONTHS[month - 1]} {year}
              </motion.h2>
            </AnimatePresence>

            <button type="button" onClick={nextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              aria-label="Next month">
              <ChevronRight size={16}/>
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${year}-${month}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <CalendarGrid
                year={year}
                month={month}
                records={calData?.days ?? []}
                selected={selected}
                onSelect={setSelected}
                loading={calLoading}
              />
            </motion.div>
          </AnimatePresence>

          <CalendarLegend />
        </motion.div>

        {/* ── Right panel ── */}
        <div className="lg:w-[30%] flex flex-col gap-4">

          {/* Day Settings */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                <CalendarDays size={13} className="text-slate-600"/>
              </div>
              <h3 className="text-sm font-bold text-slate-700">Day Settings</h3>
            </div>

            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div key={selected} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <DaySettingsPanel
                    dateStr={selected}
                    record={selectedRecord}
                    isOpen={selectedIsOpen}
                    calLoading={calLoading}
                    onSaved={() => refetchCal()}
                  />
                </motion.div>
              ) : (
                <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-xs text-slate-400 italic">
                  Click a date on the calendar to view or edit its settings.
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
                <Sparkles size={13} className="text-blue-600"/>
              </div>
              <h3 className="text-sm font-bold text-slate-700">Upcoming Events</h3>
            </div>
            <UpcomingEventsPanel />
          </motion.div>

        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function TradingCalendarPage() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-4">
        <Sk className="h-8 w-64" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-24" />)}
        </div>
        <div className="flex gap-4">
          <Sk className="flex-1 h-96" />
          <Sk className="w-80 h-96" />
        </div>
      </div>
    }>
      <TradingCalendarContent />
    </Suspense>
  );
}
