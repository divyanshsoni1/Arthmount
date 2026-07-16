"use client";

/**
 * ProfitInsights — displays derived portfolio insights as a clean card grid.
 * Data is pure-computed from existing analytics (no financial advice fabricated).
 */

import { Sparkles } from "lucide-react";
import type { ProfitInsight } from "@/api-client/profit-analytics";

// ─── Type map ─────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<ProfitInsight["type"], { border: string; bg: string; text: string; badge: string }> = {
  success: {
    border: "border-emerald-100",
    bg:     "bg-emerald-50/60",
    text:   "text-emerald-700",
    badge:  "bg-emerald-100 text-emerald-700",
  },
  info: {
    border: "border-blue-100",
    bg:     "bg-blue-50/60",
    text:   "text-blue-700",
    badge:  "bg-blue-100 text-blue-700",
  },
  warning: {
    border: "border-amber-100",
    bg:     "bg-amber-50/60",
    text:   "text-amber-700",
    badge:  "bg-amber-100 text-amber-700",
  },
  neutral: {
    border: "border-slate-100",
    bg:     "bg-slate-50/60",
    text:   "text-slate-600",
    badge:  "bg-slate-100 text-slate-600",
  },
};

// ─── Single insight card ──────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: ProfitInsight }) {
  const s = TYPE_STYLES[insight.type];
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border ${s.border} ${s.bg} p-4 transition-shadow hover:shadow-sm`}
    >
      {/* Emoji icon */}
      <span className="text-xl leading-none mt-0.5 shrink-0" aria-hidden>
        {insight.icon}
      </span>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
          {insight.label}
        </p>
        <p className={`text-base font-extrabold tabular-nums leading-tight ${s.text}`}>
          {insight.value}
        </p>
        {insight.sub && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{insight.sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ProfitInsightsSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  insights: ProfitInsight[];
  loading?: boolean;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProfitInsights({ insights, loading }: Props) {
  if (loading) return <ProfitInsightsSkeleton />;
  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b border-slate-50">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-50">
          <Sparkles size={13} className="text-violet-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-none">Portfolio Insights</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Derived from your investment data
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>
    </div>
  );
}
