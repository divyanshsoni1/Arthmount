"use client";

import {
  TrendingUp, TrendingDown, Wallet, BarChart3, Lock,
  CheckCircle, Activity, CircleDollarSign, Clock,
  Target, Minus,
} from "lucide-react";
import type { PortfolioStats } from "@/api-client/invest";
import { formatINR, formatINRCompact } from "@/api-client/invest";

// ─── Single card ──────────────────────────────────────────────────────────────

interface CardProps {
  label:    string;
  value:    string;
  sub?:     string;
  icon:     React.ElementType;
  gradient: string;
  trend?:   "up" | "down" | "neutral";
  loading?: boolean;
  badge?:   string;
}

function SummaryCard({ label, value, sub, icon: Icon, gradient, trend, loading, badge }: CardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 shadow-sm ${gradient} text-white group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-white/5" />

      <div className="relative">
        {/* Icon row */}
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon size={16} className="text-white" />
          </div>
          {trend === "up" && (
            <span className="flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
              <TrendingUp size={9} /> ↑
            </span>
          )}
          {trend === "down" && (
            <span className="flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
              <TrendingDown size={9} /> ↓
            </span>
          )}
          {trend === "neutral" && (
            <span className="flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
              <Minus size={9} /> —
            </span>
          )}
        </div>

        {/* Value */}
        {loading ? (
          <div className="space-y-1.5">
            <div className="h-6 w-28 animate-pulse rounded-lg bg-white/20" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/15" />
          </div>
        ) : (
          <>
            <p className="text-xl font-extrabold tabular-nums leading-tight">{value}</p>
            <p className="text-[11px] font-medium text-white/70 mt-0.5">{label}</p>
            {sub && <p className="text-[10px] text-white/50 mt-0.5">{sub}</p>}
            {badge && (
              <span className="mt-1.5 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                {badge}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton grid ────────────────────────────────────────────────────────────

export function PortfolioSummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-28" />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  stats?:   PortfolioStats;
  loading?: boolean;
}

export function PortfolioSummaryCards({ stats, loading }: Props) {
  const s = stats;

  const profitIsNeg  = (s?.totalProfit ?? 0) < 0;
  const roiIsPos     = (s?.totalReturnsPercent ?? 0) > 0;

  const cards: CardProps[] = [
    {
      label:    "Portfolio Value",
      value:    formatINRCompact(s?.totalPortfolioValue ?? 0),
      sub:      "Principal + Profit",
      icon:     BarChart3,
      gradient: "bg-gradient-to-br from-emerald-500 to-emerald-700",
      trend:    (s?.totalPortfolioValue ?? 0) > 0 ? "up" : "neutral",
    },
    {
      label:    "Total Invested",
      value:    formatINRCompact(s?.totalInvested ?? 0),
      sub:      `${(s?.activeCount ?? 0) + (s?.maturedCount ?? 0)} investments`,
      icon:     TrendingUp,
      gradient: "bg-gradient-to-br from-blue-500 to-blue-700",
      trend:    (s?.totalInvested ?? 0) > 0 ? "up" : "neutral",
    },
    {
      label:    "Total Profit",
      value:    formatINRCompact(Math.abs(s?.totalProfit ?? 0)),
      sub:      profitIsNeg ? "Loss" : "Earned so far",
      icon:     CircleDollarSign,
      gradient: profitIsNeg
        ? "bg-gradient-to-br from-red-500 to-red-700"
        : "bg-gradient-to-br from-teal-500 to-teal-700",
      trend: profitIsNeg ? "down" : (s?.totalProfit ?? 0) > 0 ? "up" : "neutral",
    },
    {
      label:    "Total Returns",
      value:    `${roiIsPos ? "+" : ""}${s?.totalReturnsPercent ?? 0}%`,
      sub:      "Overall ROI",
      icon:     Target,
      gradient: roiIsPos
        ? "bg-gradient-to-br from-violet-500 to-violet-700"
        : "bg-gradient-to-br from-slate-500 to-slate-700",
      trend: roiIsPos ? "up" : "neutral",
    },
    {
      label:    "Active",
      value:    String(s?.activeCount ?? 0),
      sub:      "Running investments",
      icon:     Activity,
      gradient: "bg-gradient-to-br from-cyan-500 to-cyan-700",
      trend:    (s?.activeCount ?? 0) > 0 ? "up" : "neutral",
    },
    {
      label:    "Matured",
      value:    String(s?.maturedCount ?? 0),
      sub:      "Completed plans",
      icon:     CheckCircle,
      gradient: "bg-gradient-to-br from-indigo-500 to-indigo-700",
      trend:    "neutral",
    },
    {
      label:    "Locked Amount",
      value:    formatINRCompact(s?.lockedAmount ?? 0),
      sub:      "Active lock-ins",
      icon:     Lock,
      gradient: "bg-gradient-to-br from-amber-500 to-amber-700",
      trend:    "neutral",
    },
    {
      label:    "Withdrawable",
      value:    formatINRCompact(s?.availableToWithdraw ?? 0),
      sub:      "Matured funds",
      icon:     Wallet,
      gradient: (s?.availableToWithdraw ?? 0) > 0
        ? "bg-gradient-to-br from-rose-500 to-rose-700"
        : "bg-gradient-to-br from-slate-400 to-slate-600",
      trend:    (s?.availableToWithdraw ?? 0) > 0 ? "up" : "neutral",
      badge:    (s?.availableToWithdraw ?? 0) > 0 ? "Ready to Withdraw" : undefined,
    },
    {
      label:    "Monthly Earnings",
      value:    formatINRCompact(s?.monthlyEarnings ?? 0),
      sub:      "Avg per month",
      icon:     Clock,
      gradient: "bg-gradient-to-br from-pink-500 to-pink-700",
      trend:    (s?.monthlyEarnings ?? 0) > 0 ? "up" : "neutral",
    },
    {
      label:    "Est. Future Value",
      value:    formatINRCompact(s?.estimatedFutureValue ?? 0),
      sub:      "At full maturity",
      icon:     TrendingUp,
      gradient: "bg-gradient-to-br from-orange-500 to-orange-700",
      trend:    (s?.estimatedFutureValue ?? 0) > 0 ? "up" : "neutral",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} loading={loading} />
      ))}
    </div>
  );
}
