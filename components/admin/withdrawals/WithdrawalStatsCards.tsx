"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight, CheckCircle2, Clock,
  BarChart3,
} from "lucide-react";
import type { AdminWithdrawalStats } from "@/api-client/admin";

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 800): number {
  const [val, setVal] = useState(0);
  const raf   = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    start.current = null;
    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(target * ease));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);

  return val;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

// ─── Single card ──────────────────────────────────────────────────────────────

interface CardDef {
  label:    string;
  count:    number;
  amount?:  number;
  icon:     React.ElementType;
  gradient: string;
  glow:     string;
  loading?: boolean;
}

function StatCard({ label, count, amount, icon: Icon, gradient, glow, loading }: CardDef) {
  const animCount  = useCountUp(loading ? 0 : count);
  const animAmount = useCountUp(loading ? 0 : (amount ?? 0), 900);

  return (
    <div className={`
      group relative overflow-hidden rounded-2xl p-5 text-white shadow-sm
      transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg
      ${gradient}
    `}>
      <div className={`pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full ${glow} opacity-20 blur-xl transition-opacity group-hover:opacity-40`} />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-white/5" />

      <div className="relative">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon size={16} className="text-white" />
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-7 w-20 animate-pulse rounded-lg bg-white/20" />
            <div className="h-3 w-28 animate-pulse rounded bg-white/15" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-extrabold tabular-nums leading-tight">{animCount.toLocaleString("en-IN")}</p>
            <p className="mt-0.5 text-[11px] font-medium text-white/70">{label}</p>
            {amount !== undefined && (
              <p className="mt-1 text-xs font-bold text-white/90 tabular-nums">{fmtINR(animAmount)}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton strip ───────────────────────────────────────────────────────────

export function WithdrawalStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[118px] animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  stats?:   AdminWithdrawalStats;
  loading?: boolean;
}

export function WithdrawalStatsCards({ stats, loading }: Props) {
  const cards: CardDef[] = [
    {
      label:    "Total Requests",
      count:    stats?.total       ?? 0,
      amount:   stats?.totalAmount ?? 0,
      icon:     BarChart3,
      gradient: "bg-gradient-to-br from-slate-600 to-slate-800",
      glow:     "bg-slate-400",
    },
    {
      label:    "Pending",
      count:    stats?.pending.count  ?? 0,
      amount:   stats?.pending.amount ?? 0,
      icon:     Clock,
      gradient: "bg-gradient-to-br from-amber-500 to-amber-700",
      glow:     "bg-amber-400",
    },
    {
      label:    "Completed",
      count:    stats?.completed.count  ?? 0,
      amount:   stats?.completed.amount ?? 0,
      icon:     CheckCircle2,
      gradient: "bg-gradient-to-br from-emerald-500 to-emerald-700",
      glow:     "bg-emerald-400",
    },
    {
      label:    "Today",
      count:    stats?.todayCount  ?? 0,
      amount:   stats?.todayAmount ?? 0,
      icon:     ArrowUpRight,
      gradient: "bg-gradient-to-br from-blue-500 to-blue-700",
      glow:     "bg-blue-400",
    },
  ];

  if (loading) return <WithdrawalStatsCardsSkeleton />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <StatCard key={c.label} {...c} loading={loading} />
      ))}
    </div>
  );
}
