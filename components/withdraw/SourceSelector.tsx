"use client";

import { Lock, Wallet, TrendingUp, Calendar, CheckCircle } from "lucide-react";
import type { MaturedInvestment, WithdrawalSource } from "@/api-client/withdraw";
import { fmtWithdrawINR, fmtWithdrawDate } from "@/api-client/withdraw";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysRemaining(maturityDate: string): number {
  return Math.ceil((new Date(maturityDate).getTime() - Date.now()) / 86_400_000);
}

function lockProgress(completedDays: number, tenureDays: number): number {
  if (tenureDays === 0) return 100;
  return Math.min(100, Math.round((completedDays / tenureDays) * 100));
}

// ─── Matured investment card ──────────────────────────────────────────────────

function InvestmentCard({
  inv,
  selected,
  onSelect,
}: {
  inv:      MaturedInvestment;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const available  = inv.principalAmount + inv.totalProfitEarned;
  const roi        = inv.principalAmount > 0
    ? ((inv.totalProfitEarned / inv.principalAmount) * 100).toFixed(2)
    : "0.00";
  const progress   = lockProgress(inv.completedDays, inv.tenureDays);
  const isMatured  = inv.status === "MATURED" || daysRemaining(inv.maturityDate) <= 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(inv.id)}
      className={`
        w-full text-left rounded-2xl border-2 p-3.5 sm:p-4 transition-all duration-200
        ${selected
          ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100"
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Radio indicator */}
        <div className={`
          mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors
          ${selected ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"}
          flex items-center justify-center
        `}>
          {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-slate-900 truncate max-w-[140px] sm:max-w-none">
              {inv.packageName}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase shrink-0">
              {inv.packageCode}
            </span>
            {isMatured && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shrink-0">
                <CheckCircle size={9} /> Matured
              </span>
            )}
          </div>

          {/* Stats grid — 2 cols on all sizes, clean alignment */}
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div>
              <p className="text-slate-400 text-[10px] leading-none mb-0.5">Principal</p>
              <p className="font-semibold text-slate-800 tabular-nums">{fmtWithdrawINR(inv.principalAmount)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] leading-none mb-0.5">Profit Earned</p>
              <p className="font-semibold text-emerald-600 tabular-nums">+{fmtWithdrawINR(inv.totalProfitEarned)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] leading-none mb-0.5">Available</p>
              <p className="font-bold text-slate-900 tabular-nums">{fmtWithdrawINR(available)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] leading-none mb-0.5">ROI</p>
              <p className="font-semibold text-violet-600">{roi}%</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                <Calendar size={9} /> Matured {fmtWithdrawDate(inv.maturityDate)}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 shrink-0 ml-1">{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Locked investment card (disabled) ───────────────────────────────────────

function LockedInvestmentCard({
  name,
  code,
  principalAmount,
  maturityDate,
  completedDays,
  tenureDays,
}: {
  name:            string;
  code:            string;
  principalAmount: number;
  maturityDate:    string;
  completedDays:   number;
  tenureDays:      number;
}) {
  const days     = daysRemaining(maturityDate);
  const progress = lockProgress(completedDays, tenureDays);

  return (
    <div className="w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-3.5 sm:p-4 opacity-70">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200">
          <Lock size={8} className="text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-slate-500 truncate max-w-[140px] sm:max-w-none">{name}</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase shrink-0">
              {code}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500 shrink-0">
              <Lock size={8} /> Locked
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-3 text-xs">
            <div>
              <p className="text-slate-400 text-[10px] leading-none mb-0.5">Principal</p>
              <p className="font-semibold text-slate-500 tabular-nums">{fmtWithdrawINR(principalAmount)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] leading-none mb-0.5">Unlocks in</p>
              <p className="font-bold text-red-500">{days} day{days !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                <Calendar size={9} /> Matures {fmtWithdrawDate(maturityDate)}
              </span>
              <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-1">{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-slate-300 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Source selector ──────────────────────────────────────────────────────────

interface Props {
  source:              WithdrawalSource;
  onSourceChange:      (s: WithdrawalSource) => void;
  selectedInvestment:  string | null;
  onInvestmentSelect:  (id: string) => void;
  walletBalance:       number;
  maturedInvestments:  MaturedInvestment[];
  lockedInvestments?:  {
    id:              string;
    packageName:     string;
    packageCode:     string;
    principalAmount: number;
    maturityDate:    string;
    completedDays:   number;
    tenureDays:      number;
  }[];
}

export function SourceSelector({
  source,
  onSourceChange,
  selectedInvestment,
  onInvestmentSelect,
  walletBalance,
  maturedInvestments,
  lockedInvestments = [],
}: Props) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Source toggle — full-width buttons with min touch target */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Wallet option */}
        <button
          type="button"
          onClick={() => onSourceChange("WALLET")}
          className={`
            flex items-center gap-2.5 sm:gap-3 rounded-2xl border-2 p-3.5 sm:p-4 text-left transition-all duration-200
            min-h-[64px] sm:min-h-[auto]
            ${source === "WALLET"
              ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100"
              : "border-slate-200 bg-white hover:border-slate-300 active:bg-slate-50"
            }
          `}
        >
          <div className={`
            flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl transition-colors
            ${source === "WALLET" ? "bg-emerald-500" : "bg-slate-100"}
          `}>
            <Wallet size={14} className={source === "WALLET" ? "text-white" : "text-slate-400"} />
          </div>
          <div className="min-w-0">
            <p className={`text-xs sm:text-sm font-bold leading-snug ${source === "WALLET" ? "text-emerald-700" : "text-slate-700"}`}>
              Wallet Balance
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 tabular-nums truncate">
              {fmtWithdrawINR(walletBalance)}
            </p>
          </div>
        </button>

        {/* Investment option */}
        <button
          type="button"
          onClick={() => onSourceChange("INVESTMENT")}
          disabled={maturedInvestments.length === 0}
          className={`
            flex items-center gap-2.5 sm:gap-3 rounded-2xl border-2 p-3.5 sm:p-4 text-left transition-all duration-200
            min-h-[64px] sm:min-h-[auto]
            disabled:cursor-not-allowed disabled:opacity-50
            ${source === "INVESTMENT"
              ? "border-teal-500 bg-teal-50 shadow-md shadow-teal-100"
              : "border-slate-200 bg-white hover:border-slate-300 active:bg-slate-50"
            }
          `}
        >
          <div className={`
            flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl transition-colors
            ${source === "INVESTMENT" ? "bg-teal-500" : "bg-slate-100"}
          `}>
            <TrendingUp size={14} className={source === "INVESTMENT" ? "text-white" : "text-slate-400"} />
          </div>
          <div className="min-w-0">
            <p className={`text-xs sm:text-sm font-bold leading-snug ${source === "INVESTMENT" ? "text-teal-700" : "text-slate-700"}`}>
              Matured Plan
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
              {maturedInvestments.length === 0
                ? "None available"
                : `${maturedInvestments.length} plan${maturedInvestments.length !== 1 ? "s" : ""} ready`
              }
            </p>
          </div>
        </button>
      </div>

      {/* Matured investment list */}
      {source === "INVESTMENT" && maturedInvestments.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CheckCircle size={10} className="text-emerald-500" />
            Select an investment to withdraw
          </p>
          {/* Scrollable when many items — max 3 visible on mobile */}
          <div className="space-y-2 max-h-72 sm:max-h-96 overflow-y-auto overscroll-contain pr-0.5
            [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.200)_transparent]">
            {maturedInvestments.map((inv) => (
              <InvestmentCard
                key={inv.id}
                inv={inv}
                selected={selectedInvestment === inv.id}
                onSelect={onInvestmentSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Locked investments (informational) */}
      {source === "INVESTMENT" && lockedInvestments.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Lock size={10} className="text-slate-400" />
            Not yet matured
          </p>
          <div className="space-y-2">
            {lockedInvestments.map((inv) => (
              <LockedInvestmentCard
                key={inv.id}
                name={inv.packageName}
                code={inv.packageCode}
                principalAmount={inv.principalAmount}
                maturityDate={inv.maturityDate}
                completedDays={inv.completedDays}
                tenureDays={inv.tenureDays}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty — no matured investments selected but source is INVESTMENT */}
      {source === "INVESTMENT" && maturedInvestments.length === 0 && lockedInvestments.length === 0 && (
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50 py-8 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <TrendingUp size={20} className="text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-600">No matured investments</p>
            <p className="text-xs text-slate-400 mt-0.5">Investments appear here once their tenure is complete.</p>
          </div>
        </div>
      )}
    </div>
  );
}
