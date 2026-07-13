"use client";

/**
 * ProfileStatsCards
 *
 * Two sections of KPI cards rendered on the View Profile page:
 * 1. Wallet & Financial summary (balances + deposit/withdrawal totals)
 * 2. Investment summary (counts, invested amount, profit, ROI)
 */

import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Layers,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { cn }         from "@/lib/utils";
import type { ProfileData, ProfileStats } from "@/api-client/profile";
import { formatINR }  from "@/api-client/profile";

// ─── Generic stat card ────────────────────────────────────────────────────────

interface StatCardProps {
  icon:       React.ElementType;
  label:      string;
  value:      string;
  sub?:       string;
  accent?:    "green" | "blue" | "violet" | "amber" | "rose" | "default";
}

const ACCENT_MAP = {
  green:   { wrap: "border-emerald-100 bg-emerald-50",  icon: "bg-emerald-100 text-emerald-600",  value: "text-emerald-700" },
  blue:    { wrap: "border-blue-100 bg-blue-50",        icon: "bg-blue-100 text-blue-600",        value: "text-blue-700"   },
  violet:  { wrap: "border-violet-100 bg-violet-50",    icon: "bg-violet-100 text-violet-600",    value: "text-violet-700" },
  amber:   { wrap: "border-amber-100 bg-amber-50",      icon: "bg-amber-100 text-amber-600",      value: "text-amber-700"  },
  rose:    { wrap: "border-rose-100 bg-rose-50",        icon: "bg-rose-100 text-rose-600",        value: "text-rose-700"   },
  default: { wrap: "border-slate-100 bg-slate-50",      icon: "bg-white text-slate-500",          value: "text-slate-800"  },
} as const;

function StatCard({ icon: Icon, label, value, sub, accent = "default" }: StatCardProps) {
  const a = ACCENT_MAP[accent];
  return (
    <div className={cn(
      "flex items-start gap-3.5 rounded-2xl border px-4 py-4 transition-shadow hover:shadow-sm",
      a.wrap
    )}>
      <div className={cn(
        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
        a.icon
      )}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className={cn("mt-0.5 text-lg font-bold leading-tight truncate", a.value)}>
          {value}
        </p>
        {sub && (
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
      {children}
    </h2>
  );
}

// ─── Wallet section ───────────────────────────────────────────────────────────

interface WalletSectionProps {
  profile: ProfileData;
  stats:   ProfileStats;
}

function WalletSection({ profile, stats }: WalletSectionProps) {
  const main        = parseFloat(profile.mainBalance);
  const invested    = parseFloat(profile.investedBalance);
  const commission  = parseFloat(profile.commissionBalance);
  const total       = main + invested + commission;

  return (
    <div className="space-y-3">
      <SectionHeading>
        <Wallet size={14} />
        Wallet &amp; Finances
      </SectionHeading>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Available Balance"
          value={formatINR(main)}
          sub="Ready to invest"
          accent="green"
        />
        <StatCard
          icon={Layers}
          label="Invested Balance"
          value={formatINR(invested)}
          sub="Locked in plans"
          accent="blue"
        />
        <StatCard
          icon={CircleDollarSign}
          label="Commission Balance"
          value={formatINR(commission)}
          sub="Referral earnings"
          accent="violet"
        />
        <StatCard
          icon={ArrowDownCircle}
          label="Total Deposited"
          value={formatINR(stats.totalDeposited)}
          accent="default"
        />
        <StatCard
          icon={ArrowUpCircle}
          label="Total Withdrawn"
          value={formatINR(stats.totalWithdrawn)}
          accent="default"
        />
        <StatCard
          icon={BarChart3}
          label="Total Portfolio Value"
          value={formatINR(total)}
          sub="Wallet + invested + commission"
          accent="default"
        />
      </div>
    </div>
  );
}

// ─── Investment section ───────────────────────────────────────────────────────

interface InvestmentSectionProps {
  stats: ProfileStats;
}

function InvestmentSection({ stats }: InvestmentSectionProps) {
  return (
    <div className="space-y-3">
      <SectionHeading>
        <TrendingUp size={14} />
        Investment Summary
      </SectionHeading>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Layers}
          label="Total Investments"
          value={String(stats.totalInvestments)}
          sub="All time"
          accent="default"
        />
        <StatCard
          icon={Zap}
          label="Active Plans"
          value={String(stats.activeInvestments)}
          sub="Currently running"
          accent="blue"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed Plans"
          value={String(stats.completedInvestments)}
          sub="Matured plans"
          accent="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Invested"
          value={formatINR(stats.totalInvested)}
          accent="default"
        />
        <StatCard
          icon={CircleDollarSign}
          label="Total Profit Earned"
          value={formatINR(stats.totalProfit)}
          sub={`ROI: ${stats.roi}%`}
          accent="green"
        />
        <StatCard
          icon={Clock}
          label="Pending Returns"
          value={formatINR(stats.pendingReturns)}
          sub="Awaiting credit"
          accent="amber"
        />
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface ProfileStatsCardsProps {
  profile: ProfileData;
  stats:   ProfileStats;
}

export default function ProfileStatsCards({ profile, stats }: ProfileStatsCardsProps) {
  return (
    <div className="space-y-7">
      <WalletSection profile={profile} stats={stats} />
      <InvestmentSection stats={stats} />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ProfileStatsCardsSkeleton() {
  return (
    <div className="space-y-7">
      {[6, 6].map((count, si) => (
        <div key={si} className="space-y-3">
          <div className="h-4 w-36 rounded bg-slate-200 animate-pulse" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
