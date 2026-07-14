"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Landmark, TrendingUp, WalletCards, IndianRupee,
  ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle,
  Zap, BarChart2, Activity,
} from "lucide-react";
import {
  useAdminAnalytics,
  type AnalyticsRange,
  type ActivityItem,
  type PackageCapital,
  type PackageProfit,
  type CapitalHealthPoint,
} from "@/api-client/admin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  if (diff < 60_000)   return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function fmtAxisINR(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v}`;
}

const TOOLTIP_STYLE = {
  fontSize: 12, borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(0,0,0,.08)",
  background: "#fff",
};

// Package palette — 5 consistent colours
const PKG_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"];

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  const from = useRef(0);

  useEffect(() => {
    from.current = 0;
    start.current = null;
    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(from.current + (target - from.current) * ease));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);

  return val;
}

// ─── Date range options ───────────────────────────────────────────────────────

const RANGE_OPTIONS: { label: string; value: AnalyticsRange }[] = [
  { label: "Today",    value: "today"    },
  { label: "Week",     value: "week"     },
  { label: "15 Days",  value: "15days"   },
  { label: "Month",    value: "month"    },
  { label: "3 Months", value: "3months"  },
  { label: "6 Months", value: "6months"  },
  { label: "Year",     value: "year"     },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-100 ${className ?? ""}`} />
  );
}

// ─── Date Range Filter ────────────────────────────────────────────────────────

function DateRangeFilter({
  value, onChange,
}: { value: AnalyticsRange; onChange: (r: AnalyticsRange) => void }) {
  return (
    <div
      role="group"
      aria-label="Date range filter"
      className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 scrollbar-none"
    >
      {RANGE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={[
              "relative shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
              active
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-200"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/80",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:     string;
  value:     number;
  sub:       string;
  pct:       number;
  icon:      React.ElementType;
  gradient:  string;   // Tailwind gradient classes on icon bg
  glow:      string;   // shadow colour
  loading:   boolean;
  index:     number;
}

function KpiCard({ label, value, sub, pct, icon: Icon, gradient, glow, loading, index }: KpiCardProps) {
  const animated = useCountUp(loading ? 0 : value);
  const isPositive = pct >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100/80 shadow-sm hover:shadow-lg transition-shadow duration-200 p-5"
    >
      {/* Glow blob */}
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full ${glow} opacity-[0.12] blur-xl transition-opacity group-hover:opacity-25`} />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-md`}>
            <Icon size={20} className="text-white" aria-hidden="true" />
          </div>
          {!loading && (
            <span
              className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
              }`}
              aria-label={`${isPositive ? "Up" : "Down"} ${Math.abs(pct)}%`}
            >
              {isPositive
                ? <ArrowUpRight size={11} aria-hidden="true" />
                : <ArrowDownRight size={11} aria-hidden="true" />}
              {Math.abs(pct)}%
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 mt-1">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <>
            <p className="text-[28px] font-extrabold text-slate-900 tabular-nums leading-none tracking-tight">
              {fmtINR(animated)}
            </p>
            <p className="mt-1.5 text-xs font-bold text-slate-600">{label}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Chart Card wrapper ───────────────────────────────────────────────────────

function ChartCard({
  title, sub, icon: Icon, children, loading, minH = "h-64",
}: {
  title: string; sub?: string; icon?: React.ElementType;
  children: React.ReactNode; loading?: boolean; minH?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-2xl bg-white border border-slate-100/80 shadow-sm p-5"
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {Icon && <Icon size={15} className="text-slate-300 mt-0.5 shrink-0" aria-hidden="true" />}
      </div>
      {loading
        ? <Skeleton className={`${minH} w-full`} />
        : children}
    </motion.div>
  );
}

// ─── Capital Health Chart ─────────────────────────────────────────────────────

function CapitalHealthChart({ data, loading }: { data: CapitalHealthPoint[]; loading: boolean }) {
  return (
    <ChartCard
      title="Capital Health"
      sub="Investment vs Withdraw Volume"
      icon={TrendingUp}
      loading={loading}
      minH="h-72"
    >
      <ResponsiveContainer width="100%" height={288}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0}   />
            </linearGradient>
            <linearGradient id="gradWithdrawn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={fmtDate}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={fmtAxisINR}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(v) => fmtDate(String(v))}
            formatter={(v, name) => [
              fmtINR(Number(v ?? 0)),
              name === "invested" ? "Invested" : "Withdrawn",
            ]}
          />
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            formatter={(v) => v === "invested" ? "Invested Capital" : "Withdraw Volume"}
          />
          <Area
            type="monotone" dataKey="invested" stroke="#10b981" strokeWidth={2.5}
            fill="url(#gradInvested)" dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "#10b981" }}
            isAnimationActive
          />
          <Area
            type="monotone" dataKey="withdrawn" stroke="#ef4444" strokeWidth={2}
            fill="url(#gradWithdrawn)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#ef4444" }}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Capital by Package Chart ─────────────────────────────────────────────────

function CapitalByPackageChart({ data, loading }: { data: PackageCapital[]; loading: boolean }) {
  const isEmpty = !loading && data.length === 0;

  return (
    <ChartCard
      title="Capital by Package"
      sub="Investment amount grouped by plan"
      icon={BarChart2}
      loading={loading}
      minH="h-52"
    >
      {isEmpty ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height={208}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="package" tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickFormatter={fmtAxisINR}
              axisLine={false} tickLine={false} width={60}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, _name, entry) => [
                fmtINR(Number(v ?? 0)),
                `${(entry?.payload as PackageCapital | undefined)?.count ?? 0} investments`,
              ]}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive>
              {data.map((_, i) => (
                <Cell key={i} fill={PKG_COLORS[i % PKG_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── Profit by Package Chart ──────────────────────────────────────────────────

interface ProfitTooltipPayload {
  name: string;
  value: number;
  payload: PackageProfit;
}

function ProfitTooltip({
  active, payload,
}: {
  active?: boolean;
  payload?: ProfitTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <p className="text-[11px] font-bold text-slate-700">{entry.payload.package}</p>
      <p className="text-[11px] text-emerald-600 font-semibold">{fmtINR(entry.value)} profit</p>
      <p className="text-[10px] text-slate-400">{entry.payload.count} distributions</p>
    </div>
  );
}

function ProfitByPackageChart({ data, loading }: { data: PackageProfit[]; loading: boolean }) {
  const total = data.reduce((s, d) => s + d.profit, 0);
  const isEmpty = !loading && data.length === 0;

  return (
    <ChartCard
      title="Profit by Package"
      sub="Profit contribution per plan"
      icon={Activity}
      loading={loading}
      minH="h-52"
    >
      {isEmpty ? (
        <EmptyChart />
      ) : (
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="profit"
                nameKey="package"
                cx="50%"
                cy="48%"
                innerRadius={56}
                outerRadius={85}
                paddingAngle={3}
                isAnimationActive
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PKG_COLORS[i % PKG_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<ProfitTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Centre total */}
          <div className="-mt-[112px] mb-[72px] flex flex-col items-center pointer-events-none select-none">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</p>
            <p className="text-sm font-extrabold text-slate-800 tabular-nums">{fmtINR(total)}</p>
          </div>
          {/* Legend */}
          <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {data.map((d, i) => (
              <span key={d.package} className="flex items-center gap-1 text-[10px] text-slate-500">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: PKG_COLORS[i % PKG_COLORS.length] }}
                />
                {d.package}
              </span>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

// ─── Empty chart placeholder ──────────────────────────────────────────────────

function EmptyChart() {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
      <BarChart2 size={28} className="text-slate-200" aria-hidden="true" />
      <p className="text-sm font-semibold text-slate-400">No analytics available</p>
      <p className="text-xs text-slate-300">for the selected period</p>
    </div>
  );
}

// ─── Activity type config ─────────────────────────────────────────────────────

const ACTIVITY_CONFIG: Record<
  ActivityItem["type"],
  { label: string; dot: string; icon: string }
> = {
  investment: { label: "Investment",  dot: "bg-emerald-400", icon: "💰" },
  deposit:    { label: "Deposit",     dot: "bg-blue-400",    icon: "💳" },
  withdrawal: { label: "Withdrawal",  dot: "bg-red-400",     icon: "⬆️" },
  audit:      { label: "Admin",       dot: "bg-slate-400",   icon: "🔧" },
};

const STATUS_BADGE: Record<
  ActivityItem["status"],
  string
> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50  text-amber-700   border-amber-100",
  info:    "bg-blue-50   text-blue-700    border-blue-100",
};

// ─── Live Activity Panel ──────────────────────────────────────────────────────

function LiveActivityPanel({
  items, loading,
}: {
  items: ActivityItem[];
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex flex-col rounded-2xl bg-white border border-slate-100/80 shadow-sm overflow-hidden h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <p className="text-sm font-bold text-slate-800">Live Activity</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Latest platform events</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      {/* Feed */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-0"
        role="log"
        aria-label="Live activity feed"
        aria-live="polite"
      >
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <Zap size={22} className="text-slate-200" aria-hidden="true" />
            <p className="text-xs text-slate-400">No activity yet</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item, idx) => {
              const cfg = ACTIVITY_CONFIG[item.type];
              const initials = item.userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.25 }}
                  className="group relative flex items-start gap-3 py-3 hover:bg-slate-50/80 rounded-xl px-2 -mx-2 transition-colors cursor-default"
                >
                  {/* Timeline line */}
                  {idx < items.length - 1 && (
                    <span className="absolute left-[23px] top-[44px] h-[calc(100%-20px)] w-px bg-slate-100" aria-hidden="true" />
                  )}
                  {/* Avatar */}
                  <div className="relative shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-[10px] font-bold text-slate-600 ring-2 ring-white">
                    {initials}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${cfg.dot}`} aria-hidden="true" />
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-semibold text-slate-700 truncate leading-tight">
                        {item.userName}
                      </p>
                      <time
                        dateTime={item.timestamp}
                        className="shrink-0 text-[10px] text-slate-400"
                      >
                        {fmtDateTime(item.timestamp)}
                      </time>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{item.action}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      {item.amount !== null && (
                        <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                          {fmtINR(item.amount)}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${STATUS_BADGE[item.status]}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-100 bg-red-50/50 p-10 text-center"
      role="alert"
    >
      <AlertCircle size={32} className="text-red-400" aria-hidden="true" />
      <div>
        <p className="text-sm font-bold text-slate-700">Failed to load analytics</p>
        <p className="text-xs text-slate-400 mt-1">Check your connection or try again.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-2 rounded-xl bg-white border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
      >
        <RefreshCw size={13} aria-hidden="true" />
        Retry
      </button>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AdminDashboardContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const rangeParam = searchParams.get("range") as AnalyticsRange | null;
  const validRanges = useMemo(
    () => new Set(RANGE_OPTIONS.map((o) => o.value)),
    [],
  );
  const [range, setRange] = useState<AnalyticsRange>(
    rangeParam && validRanges.has(rangeParam) ? rangeParam : "month",
  );

  // Sync range → URL query param
  const handleRangeChange = useCallback(
    (r: AnalyticsRange) => {
      setRange(r);
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", r);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const { data, isLoading, isError, refetch } = useAdminAnalytics(range);

  const kpis             = data?.kpis;
  const capitalHealth    = data?.capitalHealth    ?? [];
  const capitalByPackage = data?.capitalByPackage ?? [];
  const profitByPackage  = data?.profitByPackage  ?? [];
  const liveActivity     = data?.liveActivity     ?? [];

  // KPI card definitions
  const kpiCards = useMemo(() => [
    {
      label:    "Total Portfolio",
      value:    kpis?.totalPortfolio   ?? 0,
      sub:      "Compared to previous period",
      pct:      kpis?.portfolioChange  ?? 0,
      icon:     Landmark,
      gradient: "from-emerald-400 to-emerald-600",
      glow:     "bg-emerald-400",
    },
    {
      label:    "Active Capital",
      value:    kpis?.activeCapital    ?? 0,
      sub:      "Currently active investments",
      pct:      kpis?.capitalChange    ?? 0,
      icon:     TrendingUp,
      gradient: "from-blue-400 to-blue-600",
      glow:     "bg-blue-400",
    },
    {
      label:    "Wallet Liquidity",
      value:    kpis?.walletLiquidity  ?? 0,
      sub:      "Available for investment",
      pct:      0,
      icon:     WalletCards,
      gradient: "from-violet-400 to-violet-600",
      glow:     "bg-violet-400",
    },
    {
      label:    "Today's Profit",
      value:    kpis?.todayProfit      ?? 0,
      sub:      "Compared to yesterday",
      pct:      kpis?.todayProfitChange ?? 0,
      icon:     IndianRupee,
      gradient: "from-orange-400 to-orange-500",
      glow:     "bg-orange-400",
    },
  ], [kpis]);

  const now = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">{now}</p>
        </div>
        <DateRangeFilter value={range} onChange={handleRangeChange} />
      </div>

      {/* ── Error ── */}
      {isError && !isLoading && (
        <ErrorState onRetry={() => refetch()} />
      )}

      {/* ── KPI Cards ── */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">Key metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card, i) => (
            <KpiCard key={card.label} {...card} loading={isLoading} index={i} />
          ))}
        </div>
      </section>

      {/* ── Charts + Activity ── */}
      <section aria-labelledby="charts-heading" className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <h2 id="charts-heading" className="sr-only">Analytics charts</h2>

        {/* Charts — 3/4 */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          {/* Capital Health */}
          <CapitalHealthChart data={capitalHealth} loading={isLoading} />

          {/* Capital by Package + Profit by Package */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CapitalByPackageChart data={capitalByPackage} loading={isLoading} />
            <ProfitByPackageChart  data={profitByPackage}  loading={isLoading} />
          </div>
        </div>

        {/* Live Activity — 1/4, sticky on xl */}
        <div className="xl:col-span-1 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-7rem)] xl:overflow-hidden flex flex-col">
          <LiveActivityPanel items={liveActivity} loading={isLoading} />
        </div>
      </section>

    </div>
  );
}

// ─── Page export (Suspense required for useSearchParams) ──────────────────────

export default function AdminHomePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-48 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-4 w-32 animate-pulse rounded-lg bg-slate-100" />
            </div>
            <div className="h-10 w-72 animate-pulse rounded-2xl bg-slate-100" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
