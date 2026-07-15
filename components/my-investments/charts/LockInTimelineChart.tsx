"use client";

import { Lock, CheckCircle, Clock, TrendingUp } from "lucide-react";
import type { InvestmentRecord } from "@/api-client/invest";
import {
  formatINRCompact, formatDate, daysRemaining, lockInProgress,
} from "@/api-client/invest";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  ACTIVE:    { label: "Active",    color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", icon: Lock         },
  MATURED:   { label: "Matured",   color: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",    icon: CheckCircle  },
  CANCELLED: { label: "Cancelled", color: "bg-slate-400",   text: "text-slate-500",   bg: "bg-slate-50",    border: "border-slate-200",   icon: Clock        },
  WITHDRAWN: { label: "Withdrawn", color: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   icon: TrendingUp   },
} as const;

// ─── Single row ───────────────────────────────────────────────────────────────

function TimelineRow({ inv }: { inv: InvestmentRecord }) {
  const cfg      = STATUS[inv.status as keyof typeof STATUS] ?? STATUS.CANCELLED;
  const Icon     = cfg.icon;
  const progress = lockInProgress(inv.completedDays, inv.tenureDays);
  const remaining = daysRemaining(inv.maturityDate);
  const isActive  = inv.status === "ACTIVE";

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border ${cfg.border} ${cfg.bg} p-3`}>
      {/* Icon + name */}
      <div className="flex items-center gap-2.5 sm:w-44 shrink-0">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.color} bg-opacity-15`}>
          <Icon size={14} className={cfg.text} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800 truncate">{inv.packageName}</p>
          <p className="text-[10px] text-slate-400">{formatINRCompact(inv.principalAmount)}</p>
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-3 text-[10px] text-slate-500 shrink-0">
        <span>
          <span className="font-semibold text-slate-700">Start:</span>{" "}
          {formatDate(inv.investedAt)}
        </span>
        <span className="text-slate-300">→</span>
        <span>
          <span className="font-semibold text-slate-700">End:</span>{" "}
          {formatDate(inv.maturityDate)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-400">
            {inv.completedDays}/{inv.tenureDays} days
          </span>
          <span className="text-[10px] font-bold text-slate-600 tabular-nums">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/70 border border-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${cfg.color}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Status + countdown */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${cfg.border} ${cfg.text}`}>
          {cfg.label}
        </span>
        {isActive && (
          <span className="text-[10px] text-slate-500 whitespace-nowrap">
            {Math.max(0, remaining)}d left
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  investments: InvestmentRecord[];
  loading?:    boolean;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LockInTimelineChart({ investments, loading }: Props) {
  // Show ACTIVE first (soonest to mature), then rest by maturity
  const sorted = [...investments].sort((a, b) => {
    if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
    if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
    return new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime();
  });

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Lock size={15} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Lock-in Timeline</h3>
          </div>
          <p className="text-xs text-slate-400">Progress of all active and past lock-in periods</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
          {investments.length} investments
        </span>
      </div>

      <div className="px-5 pb-5 space-y-2.5 max-h-96 overflow-y-auto">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-50" />
          ))
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Lock size={24} className="text-slate-300" />
            <p className="text-sm text-slate-400">No lock-in data.</p>
          </div>
        ) : (
          sorted.map((inv) => <TimelineRow key={inv.id} inv={inv} />)
        )}
      </div>
    </div>
  );
}
