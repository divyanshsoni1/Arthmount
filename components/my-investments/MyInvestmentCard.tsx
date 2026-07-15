"use client";

import Link from "next/link";
import {
  TrendingUp, Lock, CheckCircle, XCircle, ArrowUpCircle,
  Calendar, ChevronRight, Zap,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from "recharts";
import type { InvestmentRecord } from "@/api-client/invest";
import {
  formatINR, formatINRCompact, formatDate,
  daysRemaining, lockInProgress, estimateMaturityValue,
} from "@/api-client/invest";

// ─── Gradient palette (cycles by index) ───────────────────────────────────────

const GRADIENTS = [
  { from: "from-emerald-500", to: "to-teal-600",    stroke: "#10b981" },
  { from: "from-blue-500",    to: "to-indigo-600",  stroke: "#3b82f6" },
  { from: "from-violet-500",  to: "to-purple-600",  stroke: "#8b5cf6" },
  { from: "from-rose-500",    to: "to-pink-600",    stroke: "#f43f5e" },
  { from: "from-amber-500",   to: "to-orange-600",  stroke: "#f59e0b" },
  { from: "from-cyan-500",    to: "to-sky-600",     stroke: "#06b6d4" },
];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  ACTIVE:    { label: "Active",    icon: TrendingUp,    cls: "bg-emerald-100 text-emerald-700" },
  MATURED:   { label: "Matured",   icon: CheckCircle,   cls: "bg-blue-100 text-blue-700"       },
  CANCELLED: { label: "Cancelled", icon: XCircle,       cls: "bg-slate-100 text-slate-500"     },
  WITHDRAWN: { label: "Withdrawn", icon: ArrowUpCircle, cls: "bg-amber-100 text-amber-700"     },
} as const;

// ─── Mini sparkline data ──────────────────────────────────────────────────────

function buildSparkline(inv: InvestmentRecord): { day: number; value: number }[] {
  const points = Math.min(inv.completedDays, 8);
  if (points < 2) return [];
  const dailyProfit = inv.principalAmount * (inv.dailyReturnRate / 100);
  return Array.from({ length: points }, (_, i) => ({
    day:   i + 1,
    value: inv.principalAmount + dailyProfit * (i + 1),
  }));
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  investment: InvestmentRecord;
  index:      number;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MyInvestmentCard({ investment: inv, index }: Props) {
  const g        = GRADIENTS[index % GRADIENTS.length];
  const cfg      = STATUS_CFG[inv.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.CANCELLED;
  const Icon     = cfg.icon;
  const progress = lockInProgress(inv.completedDays, inv.tenureDays);
  const remaining = daysRemaining(inv.maturityDate);
  const roi      = inv.principalAmount > 0
    ? ((inv.totalProfitEarned / inv.principalAmount) * 100).toFixed(1)
    : "0.0";
  const { totalReturn: estReturn } = estimateMaturityValue(
    inv.principalAmount, inv.dailyReturnRate, inv.tenureDays
  );
  const sparkData = buildSparkline(inv);
  const isActive  = inv.status === "ACTIVE";

  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* Top accent strip */}
      <div className={`h-1 w-full bg-gradient-to-r ${g.from} ${g.to}`} />

      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${g.from} ${g.to} shadow-sm`}>
              <TrendingUp size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate leading-snug">{inv.packageName}</p>
              <p className="text-[11px] text-slate-400 font-mono">{inv.packageCode}</p>
            </div>
          </div>
          <span className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.cls}`}>
            <Icon size={9} /> {cfg.label}
          </span>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-[10px] text-slate-400 mb-0.5">Invested</p>
            <p className="text-sm font-extrabold text-slate-800 tabular-nums">{formatINRCompact(inv.principalAmount)}</p>
          </div>
          <div className={`rounded-lg p-2.5 ${inv.totalProfitEarned > 0 ? "bg-emerald-50" : "bg-slate-50"}`}>
            <p className="text-[10px] text-emerald-600 mb-0.5">Profit</p>
            <p className={`text-sm font-extrabold tabular-nums ${inv.totalProfitEarned > 0 ? "text-emerald-700" : "text-slate-400"}`}>
              {inv.totalProfitEarned > 0 ? "+" : ""}{formatINRCompact(inv.totalProfitEarned)}
            </p>
          </div>
        </div>

        {/* ROI strip */}
        <div className={`flex items-center justify-between rounded-xl bg-gradient-to-r ${g.from} ${g.to} px-3 py-2 mb-3 text-white`}>
          <div className="flex items-center gap-1.5">
            <Zap size={11} className="text-white/80" />
            <span className="text-[11px] font-semibold text-white/80">ROI</span>
          </div>
          <span className="text-sm font-extrabold tabular-nums">
            {Number(roi) > 0 ? "+" : ""}{roi}%
          </span>
          <div className="text-right">
            <span className="text-[10px] text-white/70">Est. return</span>
            <p className="text-xs font-bold tabular-nums">+{formatINRCompact(estReturn)}</p>
          </div>
        </div>

        {/* Sparkline */}
        {sparkData.length >= 2 && (
          <div className="h-12 mb-2 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <defs>
                  <linearGradient id={`spark-${inv.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={g.stroke} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={g.stroke} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white">
                        {formatINR(payload[0].value as number)}
                      </div>
                    ) : null
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={g.stroke}
                  strokeWidth={1.5}
                  fill={`url(#spark-${inv.id})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Lock-in progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              {isActive
                ? <><Lock size={9} className="text-amber-500" /> {Math.max(0, remaining)}d remaining</>
                : <><CheckCircle size={9} className="text-blue-500" /> {cfg.label}</>
              }
            </span>
            <span className="text-[10px] font-bold text-slate-600 tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                inv.status === "MATURED" ? "bg-blue-500" : `bg-gradient-to-r ${g.from} ${g.to}`
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Calendar size={9} /> {formatDate(inv.investedAt)}
            </span>
            <span className="text-[10px] text-slate-400">{formatDate(inv.maturityDate)}</span>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mt-auto px-4 pb-4">
        <Link href={`/dashboard/my-investments/${inv.id}`}>
          <span className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 group-hover:border-emerald-200 group-hover:text-emerald-700 transition-all">
            View Details <ChevronRight size={12} />
          </span>
        </Link>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function MyInvestmentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="h-1 w-full bg-slate-100 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-slate-100 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-14 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-14 rounded-lg bg-slate-100 animate-pulse" />
        </div>
        <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
        <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
      </div>
      <div className="px-4 pb-4">
        <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}
