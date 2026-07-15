"use client";

import { Wallet, TrendingUp, Lock, ArrowUpRight, Clock, CheckCircle, BarChart3 } from "lucide-react";
import type { WithdrawSummary } from "@/api-client/withdraw";
import { fmtWithdrawINR } from "@/api-client/withdraw";

// ─── Individual card ──────────────────────────────────────────────────────────

interface CardProps {
  label:     string;
  value:     string;
  sub?:      string;
  icon:      React.ElementType;
  gradient:  string;
  loading?:  boolean;
}

function SummaryCard({ label, value, sub, icon: Icon, gradient, loading }: CardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-5 shadow-sm text-white
        transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md
        ${gradient}
      `}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-white/5"  />

      <div className="relative">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon size={16} className="text-white" />
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-6 w-28 animate-pulse rounded-lg bg-white/20" />
            <div className="h-3 w-20 animate-pulse rounded bg-white/15"   />
          </div>
        ) : (
          <>
            <p className="text-xl font-extrabold tabular-nums leading-tight">{value}</p>
            <p className="mt-0.5 text-[11px] font-medium text-white/70">{label}</p>
            {sub && <p className="mt-0.5 text-[10px] text-white/50">{sub}</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton strip ───────────────────────────────────────────────────────────

export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-[108px] animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  summary?: WithdrawSummary;
  loading?: boolean;
}

export function WithdrawSummaryCards({ summary, loading }: Props) {
  const cards: CardProps[] = [
    {
      label:    "Wallet Balance",
      value:    fmtWithdrawINR(summary?.walletBalance    ?? 0),
      sub:      "Available in wallet",
      icon:     Wallet,
      gradient: "bg-gradient-to-br from-emerald-500 to-emerald-700",
    },
    {
      label:    "Total Invested",
      value:    fmtWithdrawINR(summary?.investedBalance  ?? 0),
      sub:      "Across all plans",
      icon:     TrendingUp,
      gradient: "bg-gradient-to-br from-blue-500 to-blue-700",
    },
    {
      label:    "Matured Investments",
      value:    fmtWithdrawINR(summary?.maturedAmount    ?? 0),
      sub:      `${summary?.maturedCount ?? 0} plan${(summary?.maturedCount ?? 0) !== 1 ? "s" : ""}`,
      icon:     CheckCircle,
      gradient: "bg-gradient-to-br from-teal-500 to-teal-700",
    },
    {
      label:    "Total Withdrawable",
      value:    fmtWithdrawINR(summary?.totalWithdrawable ?? 0),
      sub:      "Wallet + matured",
      icon:     ArrowUpRight,
      gradient: "bg-gradient-to-br from-violet-500 to-violet-700",
    },
    {
      label:    "Locked Investments",
      value:    fmtWithdrawINR(summary?.lockedAmount      ?? 0),
      sub:      `${summary?.lockedCount ?? 0} active plan${(summary?.lockedCount ?? 0) !== 1 ? "s" : ""}`,
      icon:     Lock,
      gradient: "bg-gradient-to-br from-slate-500 to-slate-700",
    },
    {
      label:    "Pending Withdrawals",
      value:    fmtWithdrawINR(summary?.pendingAmount     ?? 0),
      sub:      `${summary?.pendingCount ?? 0} request${(summary?.pendingCount ?? 0) !== 1 ? "s" : ""}`,
      icon:     Clock,
      gradient: "bg-gradient-to-br from-amber-500 to-amber-600",
    },
    {
      label:    "Lifetime Withdrawn",
      value:    fmtWithdrawINR(summary?.lifetimeAmount    ?? 0),
      sub:      `${summary?.lifetimeCount ?? 0} completed`,
      icon:     BarChart3,
      gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
    },
  ];

  if (loading) return <SummaryCardsSkeleton />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
