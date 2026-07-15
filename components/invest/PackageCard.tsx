"use client";

import { TrendingUp, Clock, Shield, Users, Star, Zap, Award, ChevronRight } from "lucide-react";
import type { ActivePackage } from "@/api-client/invest";
import { formatINR, formatINRCompact, estimateMaturityValue } from "@/api-client/invest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRiskLevel(dailyRate: number): { label: string; color: string } {
  if (dailyRate < 0.5)  return { label: "Low Risk",    color: "text-emerald-600 bg-emerald-50" };
  if (dailyRate < 1.0)  return { label: "Medium Risk", color: "text-amber-600 bg-amber-50"     };
  return                       { label: "High Risk",   color: "text-red-600 bg-red-50"         };
}

function getBadges(pkg: ActivePackage): { label: string; icon: React.ElementType; cls: string }[] {
  const badges = [];
  const annualRate = pkg.dailyReturnRate * 365;

  if (pkg.totalInvestors > 50)  badges.push({ label: "Popular",      icon: Star,    cls: "bg-amber-100 text-amber-700"   });
  if (annualRate > 200)         badges.push({ label: "High Returns", icon: Zap,     cls: "bg-violet-100 text-violet-700" });
  if (pkg.tenureDays <= 30)     badges.push({ label: "Short Tenure", icon: Clock,   cls: "bg-blue-100 text-blue-700"     });
  if (pkg.displayOrder === 0)   badges.push({ label: "Featured",     icon: Award,   cls: "bg-rose-100 text-rose-700"     });
  return badges.slice(0, 2);
}

function getCardGradient(index: number): string {
  const gradients = [
    "from-emerald-500 to-teal-600",
    "from-blue-500 to-indigo-600",
    "from-violet-500 to-purple-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-sky-600",
  ];
  return gradients[index % gradients.length];
}

// ─── Stat item ────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-slate-400 font-medium">{label}</span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}

// ─── PackageCard ──────────────────────────────────────────────────────────────

interface PackageCardProps {
  pkg:     ActivePackage;
  index:   number;
  onInvest: (pkg: ActivePackage) => void;
  onDetail: (pkg: ActivePackage) => void;
}

export function PackageCard({ pkg, index, onInvest, onDetail }: PackageCardProps) {
  const risk              = getRiskLevel(pkg.dailyReturnRate);
  const badges            = getBadges(pkg);
  const gradient          = getCardGradient(index);
  const annualReturnRate  = pkg.dailyReturnRate * 365;
  const { totalReturn }   = estimateMaturityValue(pkg.minAmount, pkg.dailyReturnRate, pkg.tenureDays);
  const minExpectedReturn = totalReturn;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">

      {/* Coloured accent top strip */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />

      {/* Card header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Icon + name */}
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
              <TrendingUp size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">{pkg.name}</h3>
              <p className="text-[11px] text-slate-400 font-mono">{pkg.code}</p>
            </div>
          </div>

          {/* Risk badge */}
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${risk.color}`}>
            {risk.label}
          </span>
        </div>

        {/* Feature badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {badges.map(({ label, icon: Icon, cls }) => (
              <span key={label} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>
                <Icon size={9} /> {label}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {pkg.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
            {pkg.description}
          </p>
        )}

        {/* ROI hero */}
        <div className={`rounded-xl bg-gradient-to-br ${gradient} p-3 text-white mb-3`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-white/70 uppercase tracking-wider">Daily Return</p>
              <p className="text-2xl font-extrabold tabular-nums mt-0.5">{pkg.dailyReturnRate}%</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium text-white/70 uppercase tracking-wider">Annual</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{annualReturnRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <Stat label="Min Investment"    value={formatINRCompact(pkg.minAmount)} />
          <Stat label="Max Investment"    value={formatINRCompact(pkg.maxAmount)} />
          <Stat label="Tenure"            value={`${pkg.tenureDays} Days`}        />
          <Stat label="Min Return"        value={`+${formatINRCompact(minExpectedReturn)}`} />
          <Stat label="Total Investors"   value={String(pkg.totalInvestors)}      />
          <Stat label="Active Investors"  value={String(pkg.activeInvestors)}     />
        </div>
      </div>

      {/* Investor bar */}
      {pkg.totalInvestors > 0 && (
        <div className="px-5 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {[...Array(Math.min(3, pkg.activeInvestors))].map((_, i) => (
                <div key={i} className={`h-5 w-5 rounded-full border-2 border-white bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <Users size={8} className="text-white" />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              {pkg.totalInvestors} investor{pkg.totalInvestors !== 1 ? "s" : ""}
              {pkg.totalInvested > 0 && ` · ${formatINRCompact(pkg.totalInvested)} invested`}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex gap-2 p-4 pt-3 border-t border-slate-50">
        <button
          type="button"
          onClick={() => onDetail(pkg)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          View Details <ChevronRight size={12} />
        </button>
        <button
          type="button"
          onClick={() => onInvest(pkg)}
          className={`flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${gradient} px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all`}
        >
          <TrendingUp size={13} /> Invest Now
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function PackageCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="h-1.5 w-full bg-slate-100 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-slate-100 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 rounded bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="flex gap-2 p-4 border-t border-slate-50">
        <div className="flex-1 h-10 rounded-xl bg-slate-100 animate-pulse" />
        <div className="flex-[2] h-10 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}
