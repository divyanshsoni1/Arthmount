"use client";

import {
  Wallet, TrendingUp, BarChart3, CircleDollarSign,
  TrendingDown, Minus,
} from "lucide-react";
import { useWalletBalance }   from "@/api-client/wallet";
import { useDashboard, fmtINR } from "@/api-client/dashboard";
import { formatINR }           from "@/api-client/invest";

// ─── Single KPI card ──────────────────────────────────────────────────────────

interface SummaryCardProps {
  label:    string;
  value:    string;
  sub?:     string;
  icon:     React.ElementType;
  gradient: string;
  trend?:   "up" | "down" | "neutral";
  loading?: boolean;
}

function SummaryCard({
  label, value, sub, icon: Icon, gradient, trend, loading,
}: SummaryCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-sm ${gradient} text-white`}>
      {/* Decorative circles */}
      <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative">
        {/* Icon + trend */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon size={17} className="text-white" />
          </div>
          {trend && trend !== "neutral" && (
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
              {trend === "up"
                ? <TrendingUp  size={10} />
                : <TrendingDown size={10} />}
              {trend === "up" ? "↑" : "↓"}
            </span>
          )}
          {trend === "neutral" && (
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
              <Minus size={10} /> —
            </span>
          )}
        </div>

        {/* Value */}
        {loading ? (
          <div className="space-y-1.5">
            <div className="h-7 w-32 animate-pulse rounded-lg bg-white/20" />
            <div className="h-3 w-20 animate-pulse rounded   bg-white/15" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-extrabold tabular-nums leading-tight">{value}</p>
            <p className="text-xs font-medium text-white/70 mt-1">{label}</p>
            {sub && <p className="text-[11px] text-white/50 mt-0.5">{sub}</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── InvestSummaryCards ───────────────────────────────────────────────────────

export function InvestSummaryCards() {
  const { data: walletData, isLoading: walletLoading }     = useWalletBalance();
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboard();

  const loading         = walletLoading || dashboardLoading;
  const s               = dashboardData?.summary;
  const walletBalance   = parseFloat(walletData?.mainBalance    ?? "0");
  const activeInvest    = s?.activeInvestments    ?? 0;
  const totalInvested   = s?.totalInvested        ?? 0;
  const totalProfit     = s?.totalProfit          ?? 0;
  const monthProfit     = s?.monthProfit          ?? 0;

  // Estimated monthly return = avg based on total invested × avg daily rate × 30
  // We surface monthProfit directly since it's already computed server-side
  const monthlyReturn = monthProfit;

  const cards: SummaryCardProps[] = [
    {
      label:    "Wallet Balance",
      value:    formatINR(walletBalance),
      sub:      "Available for investment",
      icon:     Wallet,
      gradient: "bg-gradient-to-br from-blue-500 to-blue-700",
      trend:    "neutral",
    },
    {
      label:    "Active Investments",
      value:    String(activeInvest),
      sub:      activeInvest === 1 ? "1 plan running" : `${activeInvest} plans running`,
      icon:     TrendingUp,
      gradient: "bg-gradient-to-br from-emerald-500 to-emerald-700",
      trend:    activeInvest > 0 ? "up" : "neutral",
    },
    {
      label:    "Total Invested",
      value:    fmtINR(totalInvested),
      sub:      `${fmtINR(totalProfit)} total profit`,
      icon:     BarChart3,
      gradient: "bg-gradient-to-br from-violet-500 to-violet-700",
      trend:    totalInvested > 0 ? "up" : "neutral",
    },
    {
      label:    "Monthly Returns",
      value:    fmtINR(monthlyReturn),
      sub:      "This month's profit",
      icon:     CircleDollarSign,
      gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
      trend:    monthlyReturn > 0 ? "up" : "neutral",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} loading={loading} />
      ))}
    </div>
  );
}
