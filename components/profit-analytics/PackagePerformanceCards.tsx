"use client";

/**
 * PackagePerformanceCards — premium card grid showing per-package performance.
 * Each card shows: name, invested, current value, profit, ROI, status,
 * a mini sparkline, lock-in progress bar, and a link to /dashboard/my-investments.
 */

import Link                         from "next/link";
import { useMemo }                  from "react";
import {
  TrendingUp, TrendingDown, ChevronRight,
  Activity, CheckCircle, XCircle, Clock,
  ArrowUpRight, Minus,
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from "recharts";
import type { PackageAnalyticsRow } from "@/api-client/profit-analytics";
import { formatINRCompact, formatDate } from "@/api-client/profit-analytics";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  ACTIVE:    { label: "Active",    cls: "bg-emerald-100 text-emerald-700", icon: Activity     },
  MATURED:   { label: "Matured",   cls: "bg-blue-100 text-blue-700",       icon: CheckCircle  },
  CANCELLED: { label: "Cancelled", cls: "bg-slate-100 text-slate-500",     icon: XCircle      },
  WITHDRAWN: { label: "Withdrawn", cls: "bg-amber-100 text-amber-700",     icon: ArrowUpRight },
};

// ─── Mini sparkline (synthetic daily growth) ──────────────────────────────────

function MiniSparkline({
  invested,
  roi,
  dailyRate,
  tenureDays,
}: {
  invested:  number;
  roi:       number;
  dailyRate: number;
  tenureDays: number;
}) {
  const points = useMemo(() => {
    const days = Math.min(tenureDays, 30);
    const rate = dailyRate / 100;
    return Array.from({ length: Math.max(days, 2) }, (_, i) => ({
      v: parseFloat((invested + invested * rate * i).toFixed(2)),
    }));
  }, [invested, dailyRate, tenureDays]);

  const isPositive = roi >= 0;

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={isPositive ? "#10b981" : "#ef4444"}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border border-slate-100 bg-white px-2 py-1 shadow text-[10px] font-bold text-slate-700">
                {formatINRCompact(payload[0]?.value as number)}
              </div>
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Single package card ──────────────────────────────────────────────────────

function PackageCard({ pkg }: { pkg: PackageAnalyticsRow }) {
  const cfg        = STATUS_CFG[pkg.status] ?? STATUS_CFG.ACTIVE;
  const StatusIcon = cfg.icon;
  const profitPos  = pkg.profit >= 0;
  const roiColor   = pkg.roi > 0
    ? "text-emerald-600"
    : pkg.roi < 0
    ? "text-red-500"
    : "text-slate-500";

  // Lock-in progress approximation from investedAt → tenureDays
  const elapsedDays = useMemo(() => {
    const ms = Date.now() - new Date(pkg.investedAt).getTime();
    return Math.min(Math.max(0, Math.floor(ms / 86_400_000)), pkg.tenureDays);
  }, [pkg.investedAt, pkg.tenureDays]);

  const progressPct = pkg.tenureDays > 0
    ? Math.round((elapsedDays / pkg.tenureDays) * 100)
    : 100;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-50">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900 truncate leading-tight">
              {pkg.packageName}
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{pkg.packageCode}</p>
          </div>
          <span className={`flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.cls}`}>
            <StatusIcon size={9} />
            {cfg.label}
          </span>
        </div>

        {/* Invested count badge */}
        <p className="text-[10px] text-slate-400 mt-0.5">
          {pkg.count} investment{pkg.count !== 1 ? "s" : ""} · since {formatDate(pkg.investedAt)}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-slate-100 flex-1">
        {/* Invested */}
        <div className="bg-white px-3 py-2.5">
          <p className="text-[10px] text-slate-400 mb-0.5">Invested</p>
          <p className="text-sm font-extrabold text-slate-800 tabular-nums">
            {formatINRCompact(pkg.invested)}
          </p>
        </div>
        {/* Current Value */}
        <div className="bg-white px-3 py-2.5">
          <p className="text-[10px] text-slate-400 mb-0.5">Value</p>
          <p className="text-sm font-extrabold text-slate-800 tabular-nums">
            {formatINRCompact(pkg.currentValue)}
          </p>
        </div>
        {/* Profit */}
        <div className="bg-white px-3 py-2.5">
          <p className="text-[10px] text-slate-400 mb-0.5">Profit</p>
          <p className={`text-sm font-extrabold tabular-nums flex items-center gap-0.5 ${
            profitPos ? "text-emerald-600" : "text-red-500"
          }`}>
            {profitPos
              ? <TrendingUp size={11} />
              : pkg.profit === 0
              ? <Minus size={11} className="text-slate-400" />
              : <TrendingDown size={11} />
            }
            {profitPos ? "+" : ""}{formatINRCompact(pkg.profit)}
          </p>
        </div>
        {/* ROI */}
        <div className="bg-white px-3 py-2.5">
          <p className="text-[10px] text-slate-400 mb-0.5">ROI</p>
          <p className={`text-sm font-extrabold tabular-nums ${roiColor}`}>
            {pkg.roi > 0 ? "+" : ""}{pkg.roi}%
          </p>
        </div>
      </div>

      {/* Mini sparkline */}
      <div className="px-3 pt-2 pb-1 bg-white">
        <MiniSparkline
          invested={pkg.invested}
          roi={pkg.roi}
          dailyRate={pkg.dailyReturnRate}
          tenureDays={pkg.tenureDays}
        />
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-1 pb-3 bg-white">
        <div className="flex items-center justify-between mb-1">
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock size={9} />
            Lock-in Progress
          </span>
          <span className="text-[10px] font-bold text-slate-600">{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              progressPct >= 100 ? "bg-blue-400" : "bg-emerald-400"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {pkg.status === "ACTIVE" && (
          <p className="text-[10px] text-slate-400 mt-0.5">
            {elapsedDays} / {pkg.tenureDays} days · {pkg.dailyReturnRate}%/day
          </p>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-slate-50 px-4 py-2.5 bg-white">
        <Link
          href="/dashboard/my-investments"
          className="flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors group"
        >
          <span>View Details</span>
          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function PackagePerformanceCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-slate-50 space-y-1.5">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-100">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="bg-white px-3 py-2.5 space-y-1">
                <div className="h-2.5 w-12 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="px-3 pt-2 pb-3 bg-white">
            <div className="h-10 animate-pulse rounded-lg bg-slate-50" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  packages: PackageAnalyticsRow[];
  loading?: boolean;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PackagePerformanceCards({ packages, loading }: Props) {
  if (loading) return <PackagePerformanceCardsSkeleton />;
  if (packages.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {packages.map((pkg) => (
        <PackageCard key={pkg.packageId} pkg={pkg} />
      ))}
    </div>
  );
}
