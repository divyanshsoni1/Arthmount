/**
 * SummaryCards — refined KPI cards for the Transaction History page.
 *
 * Design: clean white cards with a thin left accent, restrained color palette,
 * subtle hover elevation, and an animated counter.
 * No heavy gradients or decorative noise — purely functional fintech aesthetic.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTransactionSummary, fmtTxnINR } from "@/api-client/transactions";

// ─── Animated count-up hook (unchanged logic) ─────────────────────────────────

function useCountUp(target: number, duration = 800) {
  const [value, setValue]  = useState(0);
  const frameRef           = useRef<number>(0);
  const startRef           = useRef<number | null>(null);
  const prevTargetRef      = useRef(0);

  useEffect(() => {
    if (target === prevTargetRef.current) return;
    const from          = prevTargetRef.current;
    prevTargetRef.current = target;
    startRef.current    = null;

    cancelAnimationFrame(frameRef.current);

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(from + (target - from) * ease);
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

// ─── Color token per card type ────────────────────────────────────────────────

interface ColorToken {
  /** Left accent bar */
  bar:       string;
  /** Icon wrapper background */
  iconBg:    string;
  /** Icon color */
  iconColor: string;
  /** Primary value color */
  value:     string;
}

// Restrained palette — no heavy saturation
const TOKENS: Record<string, ColorToken> = {
  emerald: {
    bar:       "bg-emerald-500",
    iconBg:    "bg-emerald-50",
    iconColor: "text-emerald-600",
    value:     "text-emerald-700",
  },
  blue: {
    bar:       "bg-blue-500",
    iconBg:    "bg-blue-50",
    iconColor: "text-blue-600",
    value:     "text-blue-700",
  },
  violet: {
    bar:       "bg-violet-400",
    iconBg:    "bg-violet-50",
    iconColor: "text-violet-600",
    value:     "text-violet-700",
  },
  orange: {
    bar:       "bg-orange-400",
    iconBg:    "bg-orange-50",
    iconColor: "text-orange-600",
    value:     "text-orange-700",
  },
  amber: {
    bar:       "bg-amber-400",
    iconBg:    "bg-amber-50",
    iconColor: "text-amber-600",
    value:     "text-amber-700",
  },
  slate: {
    bar:       "bg-slate-400",
    iconBg:    "bg-slate-100",
    iconColor: "text-slate-500",
    value:     "text-slate-700",
  },
};

// ─── Single card ──────────────────────────────────────────────────────────────

interface CardDef {
  label:      string;
  value:      number;
  subLabel:   string;
  icon:       React.ElementType;
  colorKey:   keyof typeof TOKENS;
  isCurrency?: boolean;
}

interface SummaryCardProps extends CardDef {
  loading: boolean;
}

function SummaryCard({
  label, value, subLabel, icon: Icon,
  colorKey, isCurrency = true, loading,
}: SummaryCardProps) {
  const animated = useCountUp(loading ? 0 : value);
  const t        = TOKENS[colorKey];

  const display = isCurrency
    ? fmtTxnINR(animated)
    : Math.round(animated).toLocaleString("en-IN");

  return (
    <div
      className="
        group relative flex items-start gap-4
        rounded-2xl border border-slate-200/80 bg-white
        px-4 py-4 overflow-hidden
        shadow-[0_1px_3px_rgba(0,0,0,0.04)]
        transition-all duration-200
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-px
      "
    >
      {/* Left accent bar */}
      <div className={`absolute inset-y-0 left-0 w-[3px] rounded-l-2xl ${t.bar}`} />

      {/* Icon */}
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.iconBg}`}>
        <Icon size={16} className={t.iconColor} />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        {loading ? (
          <div className="space-y-2 pt-0.5">
            <div className="h-5 w-24 animate-pulse rounded-md bg-slate-100" />
            <div className="h-3 w-16 animate-pulse rounded    bg-slate-100" />
          </div>
        ) : (
          <>
            <p className={`text-lg font-bold tabular-nums leading-tight ${t.value}`}>
              {display}
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-500 leading-snug">
              {label}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400 leading-tight truncate">
              {subLabel}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function SummaryCards() {
  const { data, isLoading } = useTransactionSummary();

  const cards: CardDef[] = [
    {
      label:    "Wallet Balance",
      value:    data?.walletBalance       ?? 0,
      subLabel: "Available to use",
      icon:     Wallet,
      colorKey: "emerald",
    },
    {
      label:    "Total Invested",
      value:    data?.totalInvested       ?? 0,
      subLabel: "All-time principal deployed",
      icon:     TrendingUp,
      colorKey: "blue",
    },
    {
      label:    "Total Deposited",
      value:    data?.totalDeposited      ?? 0,
      subLabel: "Wallet top-ups credited",
      icon:     ArrowDownLeft,
      colorKey: "violet",
    },
    {
      label:    "Total Withdrawn",
      value:    data?.totalWithdrawn      ?? 0,
      subLabel: "Sent to bank or UPI",
      icon:     ArrowUpRight,
      colorKey: "orange",
    },
    {
      label:    "Total Earnings",
      value:    data?.totalProfitCredited ?? 0,
      subLabel: "Profit and bonus credited",
      icon:     Sparkles,
      colorKey: "amber",
    },
    {
      label:      "Total Transactions",
      value:      data?.totalTransactions ?? 0,
      subLabel:   "Ledger entries",
      icon:       ReceiptText,
      colorKey:   "slate",
      isCurrency: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <SummaryCard key={c.label} {...c} loading={isLoading} />
      ))}
    </div>
  );
}
