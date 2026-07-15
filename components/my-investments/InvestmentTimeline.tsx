"use client";

import {
  TrendingUp, CheckCircle, CircleDollarSign, Lock,
  ArrowUpCircle, Zap, XCircle,
} from "lucide-react";
import type { InvestmentRecord } from "@/api-client/invest";
import { formatINR, formatDateTime } from "@/api-client/invest";

// ─── Timeline event types ─────────────────────────────────────────────────────

interface TimelineEvent {
  id:        string;
  icon:      React.ElementType;
  iconCls:   string;
  ringCls:   string;
  title:     string;
  subtitle?: string;
  amount?:   string;
  amountCls?: string;
  date:      string;
}

// ─── Build events from a single investment ────────────────────────────────────

function buildEvents(inv: InvestmentRecord): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Investment Created
  events.push({
    id:       `${inv.id}-created`,
    icon:     TrendingUp,
    iconCls:  "bg-blue-100 text-blue-600",
    ringCls:  "ring-blue-100",
    title:    "Investment Created",
    subtitle: `${inv.packageName} · ${inv.dailyReturnRate}%/day`,
    amount:   formatINR(inv.principalAmount),
    amountCls: "text-blue-600",
    date:     inv.investedAt,
  });

  // 2. Plan Activated (same timestamp as investment — mark as next step)
  events.push({
    id:       `${inv.id}-activated`,
    icon:     Zap,
    iconCls:  "bg-emerald-100 text-emerald-600",
    ringCls:  "ring-emerald-100",
    title:    "Plan Activated",
    subtitle: `Lock-in started · ${inv.tenureDays} days`,
    date:     inv.investedAt,
  });

  // 3. Returns credited (if any profit)
  if (inv.totalProfitEarned > 0) {
    events.push({
      id:       `${inv.id}-profit`,
      icon:     CircleDollarSign,
      iconCls:  "bg-violet-100 text-violet-600",
      ringCls:  "ring-violet-100",
      title:    "Returns Updated",
      subtitle: `${inv.completedDays} days of returns credited`,
      amount:   `+${formatINR(inv.totalProfitEarned)}`,
      amountCls: "text-emerald-600",
      date:     inv.investedAt, // approximate — server doesn't expose last-profit date
    });
  }

  // 4. Pending profit
  if (inv.pendingProfit > 0) {
    events.push({
      id:       `${inv.id}-pending`,
      icon:     Lock,
      iconCls:  "bg-amber-100 text-amber-600",
      ringCls:  "ring-amber-100",
      title:    "Pending Returns",
      subtitle: "Awaiting next disbursement",
      amount:   `+${formatINR(inv.pendingProfit)}`,
      amountCls: "text-amber-600",
      date:     inv.investedAt,
    });
  }

  // 5. Maturity
  if (inv.status === "MATURED" || inv.status === "WITHDRAWN") {
    events.push({
      id:       `${inv.id}-matured`,
      icon:     CheckCircle,
      iconCls:  "bg-blue-100 text-blue-600",
      ringCls:  "ring-blue-100",
      title:    "Investment Matured",
      subtitle: "Lock-in period completed",
      amount:   `${formatINR(inv.principalAmount + inv.totalProfitEarned)}`,
      amountCls: "text-blue-700",
      date:     inv.maturityDate,
    });
  }

  // 6. Withdrawal
  if (inv.status === "WITHDRAWN") {
    events.push({
      id:       `${inv.id}-withdrawn`,
      icon:     ArrowUpCircle,
      iconCls:  "bg-teal-100 text-teal-600",
      ringCls:  "ring-teal-100",
      title:    "Withdrawal Completed",
      subtitle: "Funds returned to wallet",
      amount:   `+${formatINR(inv.principalAmount + inv.totalProfitEarned)}`,
      amountCls: "text-teal-600",
      date:     inv.maturityDate,
    });
  }

  // 7. Cancelled
  if (inv.status === "CANCELLED") {
    events.push({
      id:       `${inv.id}-cancelled`,
      icon:     XCircle,
      iconCls:  "bg-slate-100 text-slate-500",
      ringCls:  "ring-slate-100",
      title:    "Investment Cancelled",
      subtitle: "Investment was cancelled",
      date:     inv.maturityDate,
    });
  }

  return events;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  investment: InvestmentRecord;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function InvestmentTimeline({ investment }: Props) {
  const events = buildEvents(investment);

  return (
    <div className="space-y-0">
      {events.map((evt, idx) => {
        const Icon     = evt.icon;
        const isLast   = idx === events.length - 1;

        return (
          <div key={evt.id} className="relative flex gap-3 pb-5">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-[17px] top-9 bottom-0 w-px bg-slate-100" />
            )}

            {/* Icon */}
            <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ${evt.iconCls} ${evt.ringCls} shadow-sm`}>
              <Icon size={14} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{evt.title}</p>
                  {evt.subtitle && (
                    <p className="text-xs text-slate-400 mt-0.5">{evt.subtitle}</p>
                  )}
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {formatDateTime(evt.date)}
                  </p>
                </div>
                {evt.amount && (
                  <span className={`shrink-0 text-sm font-bold tabular-nums ${evt.amountCls ?? "text-slate-700"}`}>
                    {evt.amount}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
