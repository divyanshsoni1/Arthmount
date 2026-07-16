"use client";

import { Wallet, ArrowUpRight, Clock, CheckCircle, TrendingUp } from "lucide-react";
import type { WithdrawSummary } from "@/api-client/withdraw";
import { fmtWithdrawINR } from "@/api-client/withdraw";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function SummaryCardsSkeleton() {
  return (
    <div className="space-y-3">
      {/* Hero skeleton */}
      <div className="h-[120px] sm:h-[132px] animate-pulse rounded-2xl sm:rounded-3xl bg-slate-200" />
      {/* 3 small skeletons */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[88px] sm:h-[96px] animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

// ─── Hero card — Available to Withdraw ───────────────────────────────────────

function HeroCard({
  value,
  walletBalance,
  maturedAmount,
}: {
  value:          string;
  walletBalance:  string;
  maturedAmount:  string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-5 sm:p-6 text-white shadow-lg shadow-emerald-200">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-10 right-16 h-28 w-28 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute top-4 right-4 h-16 w-16 rounded-full bg-teal-400/20" />

      <div className="relative flex items-start justify-between gap-4">
        {/* Left: main value */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <Wallet size={13} className="text-white" />
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-white/70 uppercase tracking-wider">
              Total Withdrawable
            </p>
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none tracking-tight truncate">
            {value}
          </p>
          <p className="mt-1.5 text-[11px] text-white/60 leading-snug">
            Available for immediate withdrawal
          </p>
        </div>

        {/* Right: mini breakdown pill */}
        <div className="shrink-0 hidden sm:flex flex-col items-end gap-2">
          <div className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2 space-y-1.5 min-w-[130px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-white/60">Wallet</span>
              <span className="text-[11px] font-bold tabular-nums">{walletBalance}</span>
            </div>
            <div className="h-px bg-white/20" />
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-white/60">Matured</span>
              <span className="text-[11px] font-bold tabular-nums">{maturedAmount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile breakdown — below the value */}
      <div className="sm:hidden mt-3.5 flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5">
          <span className="text-[10px] text-white/60">Wallet</span>
          <span className="text-xs font-bold tabular-nums">{walletBalance}</span>
        </div>
        <div className="h-3 w-px bg-white/25" />
        <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5">
          <span className="text-[10px] text-white/60">Matured</span>
          <span className="text-xs font-bold tabular-nums">{maturedAmount}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:     string;
  value:     string;
  sub?:      string;
  icon:      React.ElementType;
  iconBg:    string;
  iconColor: string;
  valueColor?: string;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor = "text-slate-900",
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Subtle corner accent */}
      <div className="pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full bg-slate-50 transition-all group-hover:scale-150 group-hover:opacity-60" />

      <div className="relative">
        <div className={`mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={14} className={iconColor} />
        </div>
        <p className={`text-sm sm:text-base font-extrabold tabular-nums leading-tight truncate ${valueColor}`}>
          {value}
        </p>
        <p className="mt-0.5 text-[10px] sm:text-[11px] font-medium text-slate-500 leading-snug">
          {label}
        </p>
        {sub && (
          <p className="mt-0.5 text-[10px] text-slate-400 leading-none">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  summary?: WithdrawSummary;
  loading?: boolean;
}

export function WithdrawSummaryCards({ summary, loading }: Props) {
  if (loading) return <SummaryCardsSkeleton />;

  const walletFmt   = fmtWithdrawINR(summary?.walletBalance       ?? 0);
  const maturedFmt  = fmtWithdrawINR(summary?.maturedAmount       ?? 0);
  const totalFmt    = fmtWithdrawINR(summary?.totalWithdrawable   ?? 0);
  const pendingFmt  = fmtWithdrawINR(summary?.pendingAmount       ?? 0);
  const lifetimeFmt = fmtWithdrawINR(summary?.lifetimeAmount      ?? 0);

  const pendingCount  = summary?.pendingCount  ?? 0;
  const maturedCount  = summary?.maturedCount  ?? 0;
  const lifetimeCount = summary?.lifetimeCount ?? 0;

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Hero card */}
      <HeroCard
        value={totalFmt}
        walletBalance={walletFmt}
        maturedAmount={maturedFmt}
      />

      {/* 3-column stat grid */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <StatCard
          label="Matured Plans"
          value={maturedFmt}
          sub={`${maturedCount} plan${maturedCount !== 1 ? "s" : ""}`}
          icon={CheckCircle}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          valueColor="text-teal-700"
        />
        <StatCard
          label="Pending"
          value={pendingFmt}
          sub={`${pendingCount} request${pendingCount !== 1 ? "s" : ""}`}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          valueColor={pendingCount > 0 ? "text-amber-700" : "text-slate-900"}
        />
        <StatCard
          label="All Time"
          value={lifetimeFmt}
          sub={`${lifetimeCount} withdrawal${lifetimeCount !== 1 ? "s" : ""}`}
          icon={TrendingUp}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          valueColor="text-slate-900"
        />
      </div>
    </div>
  );
}
