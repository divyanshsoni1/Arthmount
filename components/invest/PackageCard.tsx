"use client";

import { TrendingUp, Clock, ShieldCheck, Users, ChevronRight, Zap, Star, Award } from "lucide-react";
import type { ActivePackage } from "@/api-client/invest";
import { formatINRCompact, estimateMaturityValue } from "@/api-client/invest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RiskLevel {
  label: string;
  dot:   string; // Tailwind bg class for the dot indicator
  text:  string; // Tailwind text class
  bg:    string; // Tailwind bg class for the badge pill
}

function getRiskLevel(dailyRate: number): RiskLevel {
  if (dailyRate < 0.5)
    return { label: "Low Risk",    dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" };
  if (dailyRate < 1.0)
    return { label: "Med Risk",    dot: "bg-amber-500",   text: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-500/10"   };
  return   { label: "High Risk",   dot: "bg-red-500",     text: "text-red-700 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-500/10"       };
}

/** Accent color driven purely by index — ties the left bar, ROI color, and CTA button together. */
function getAccent(index: number) {
  const accents = [
    { bar: "bg-emerald-500",  roiText: "text-emerald-600 dark:text-emerald-400", btn: "bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400" },
    { bar: "bg-blue-500",     roiText: "text-blue-600 dark:text-blue-400",       btn: "bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"             },
    { bar: "bg-violet-500",   roiText: "text-violet-600 dark:text-violet-400",   btn: "bg-violet-600 hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400"     },
    { bar: "bg-rose-500",     roiText: "text-rose-600 dark:text-rose-400",       btn: "bg-rose-600 hover:bg-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400"             },
    { bar: "bg-amber-500",    roiText: "text-amber-600 dark:text-amber-400",     btn: "bg-amber-600 hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400"         },
    { bar: "bg-cyan-500",     roiText: "text-cyan-600 dark:text-cyan-400",       btn: "bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400"             },
  ];
  return accents[index % accents.length];
}

/** At most one feature badge — the most important signal only. */
function getFeatureBadge(pkg: ActivePackage): { label: string; icon: React.ElementType } | null {
  if (pkg.displayOrder === 0) return { label: "Featured", icon: Award  };
  if (pkg.totalInvestors > 50)  return { label: "Popular",  icon: Star   };
  if (pkg.dailyReturnRate * 365 > 200) return { label: "High Returns", icon: Zap };
  return null;
}

// ─── Stat cell ────────────────────────────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

// ─── PackageCard ──────────────────────────────────────────────────────────────

export interface PackageCardProps {
  pkg:      ActivePackage;
  index:    number;
  onInvest: (pkg: ActivePackage) => void;
  onDetail: (pkg: ActivePackage) => void;
}

export function PackageCard({ pkg, index, onInvest, onDetail }: PackageCardProps) {
  const risk         = getRiskLevel(pkg.dailyReturnRate);
  const accent       = getAccent(index);
  const badge        = getFeatureBadge(pkg);
  const annualRate   = (pkg.dailyReturnRate * 365).toFixed(1);
  const { totalReturn } = estimateMaturityValue(
    pkg.minAmount,
    pkg.dailyReturnRate,
    pkg.tenureDays,
  );

  return (
    <article
      className="group relative flex flex-col rounded-2xl bg-card text-card-foreground ring-1 ring-foreground/10 shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 overflow-hidden focus-within:ring-2 focus-within:ring-ring"
      aria-label={`${pkg.name} investment plan`}
    >
      {/* ── Left accent bar ──────────────────────────────────────────────── */}
      <div className={`absolute inset-y-0 left-0 w-1 ${accent.bar} rounded-l-2xl`} aria-hidden="true" />

      {/* ── Card body ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 px-5 pt-5 pb-4 pl-6">

        {/* Row 1 — Name + badge + risk */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold leading-snug text-foreground line-clamp-1">
                {pkg.name}
              </h3>
              {badge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <badge.icon size={9} aria-hidden="true" />
                  {badge.label}
                </span>
              )}
            </div>
            {pkg.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {pkg.description}
              </p>
            )}
          </div>

          {/* Risk pill — right-aligned */}
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${risk.bg} ${risk.text}`}
            aria-label={`Risk level: ${risk.label}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${risk.dot}`} aria-hidden="true" />
            {risk.label}
          </span>
        </div>

        {/* Row 2 — ROI hero */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
              Daily Return
            </p>
            <p className={`text-3xl font-extrabold tabular-nums leading-none ${accent.roiText}`}>
              {pkg.dailyReturnRate}
              <span className="text-lg font-bold">%</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
              Annual
            </p>
            <p className="text-lg font-bold tabular-nums text-foreground">
              {annualRate}%
            </p>
          </div>
        </div>

        {/* Row 3 — Key stats grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">
          <StatCell label="Min"     value={formatINRCompact(pkg.minAmount)} />
          <StatCell label="Max"     value={formatINRCompact(pkg.maxAmount)} />
          <StatCell label="Tenure"  value={`${pkg.tenureDays} Days`}        />
          <StatCell label="Est. Return" value={`+${formatINRCompact(totalReturn)}`} />
        </div>

        {/* Row 4 — Tenure + investors meta line */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground -mt-1">
          <span className="flex items-center gap-1">
            <Clock size={11} aria-hidden="true" />
            Lock-in {pkg.tenureDays}d
          </span>
          {pkg.totalInvestors > 0 && (
            <>
              <span className="opacity-30">·</span>
              <span className="flex items-center gap-1">
                <Users size={11} aria-hidden="true" />
                {pkg.totalInvestors.toLocaleString()} investors
              </span>
            </>
          )}
          {pkg.totalInvested > 0 && (
            <>
              <span className="opacity-30">·</span>
              <span>{formatINRCompact(pkg.totalInvested)} invested</span>
            </>
          )}
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="mt-auto grid grid-cols-[1fr_2fr] gap-2 border-t border-border bg-muted/30 px-5 py-3 pl-6">
        <button
          type="button"
          onClick={() => onDetail(pkg)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View details for ${pkg.name}`}
        >
          Details
          <ChevronRight size={12} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onInvest(pkg)}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 ${accent.btn}`}
          aria-label={`Invest now in ${pkg.name}`}
        >
          <TrendingUp size={13} aria-hidden="true" />
          Invest Now
        </button>
      </div>
    </article>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function PackageCardSkeleton() {
  return (
    <div
      className="relative flex flex-col rounded-2xl bg-card ring-1 ring-foreground/10 shadow-sm overflow-hidden"
      aria-hidden="true"
    >
      {/* Left accent bar placeholder */}
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-muted animate-pulse" />

      <div className="px-5 pt-5 pb-4 pl-6 flex flex-col gap-4">
        {/* Name row */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-36 rounded-lg bg-muted animate-pulse" />
            <div className="h-3 w-48 rounded   bg-muted animate-pulse" />
          </div>
          <div className="h-5 w-16 rounded-full bg-muted animate-pulse shrink-0" />
        </div>

        {/* ROI row */}
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="h-2 w-16 rounded bg-muted animate-pulse" />
            <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="space-y-1 text-right">
            <div className="h-2 w-12 rounded bg-muted animate-pulse ml-auto" />
            <div className="h-5 w-16 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-2 w-10 rounded bg-muted animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>

        {/* Meta line */}
        <div className="h-3 w-48 rounded bg-muted animate-pulse -mt-1" />
      </div>

      {/* Footer */}
      <div className="grid grid-cols-[1fr_2fr] gap-2 border-t border-border bg-muted/30 px-5 py-3 pl-6">
        <div className="h-9 rounded-xl bg-muted animate-pulse" />
        <div className="h-9 rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  );
}
