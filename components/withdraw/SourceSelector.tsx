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
        w-full text-left rounded-2xl border-2 p-4 transition-all duration-200
        ${selected
          ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900 truncate">{inv.packageName}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
              {inv.packageCode}
            </span>
            {isMatured && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <CheckCircle size={9} /> Matured
              </span>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-slate-400">Principal</span>
              <p className="font-semibold text-slate-800 tabular-nums">{fmtWithdrawINR(inv.principalAmount)}</p>
            </div>
            <div>
              <span className="text-slate-400">Profit Earned</span>
              <p className="font-semibold text-emerald-600 tabular-nums">+{fmtWithdrawINR(inv.totalProfitEarned)}</p>
            </div>
            <div>
              <span className="text-slate-400">Available</span>
              <p className="font-bold text-slate-900 tabular-nums">{fmtWithdrawINR(available)}</p>
            </div>
            <div>
              <span className="text-slate-400">ROI</span>
              <p className="font-semibold text-violet-600">{roi}%</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar size={9} /> Matured {fmtWithdrawDate(inv.maturityDate)}
              </span>
              <span className="text-[10px] font-bold text-emerald-600">{progress}%</span>
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
    <div className="w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 opacity-70">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200">
          <Lock size={8} className="text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-500 truncate">{name}</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase">
              {code}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">
              <Lock size={8} /> Locked
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs">
            <div>
              <span className="text-slate-400">Principal</span>
              <p className="font-semibold text-slate-500 tabular-nums">{fmtWithdrawINR(principalAmount)}</p>
            </div>
            <div>
              <span className="text-slate-400">Unlocks in</span>
              <p className="font-bold text-red-500">{days} day{days !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar size={9} /> Matures {fmtWithdrawDate(maturityDate)}
              </span>
              <span className="text-[10px] font-bold text-slate-400">{progress}%</span>
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
    <div className="space-y-4">
      {/* Radio group */}
      <div className="grid grid-cols-2 gap-3">
        {/* Wallet option */}
        <button
          type="button"
          onClick={() => onSourceChange("WALLET")}
          className={`
            flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200
            ${source === "WALLET"
              ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100"
              : "border-slate-200 bg-white hover:border-slate-300"
            }
          `}
        >
          <div className={`
            flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors
            ${source === "WALLET" ? "bg-emerald-500" : "bg-slate-100"}
          `}>
            <Wallet size={15} className={source === "WALLET" ? "text-white" : "text-slate-400"} />
          </div>
          <div>
            <p className={`text-sm font-bold ${source === "WALLET" ? "text-emerald-700" : "text-slate-700"}`}>
              Wallet Balance
            </p>
            <p className="text-xs text-slate-500 tabular-nums">{fmtWithdrawINR(walletBalance)}</p>
          </div>
        </button>

        {/* Investment option */}
        <button
          type="button"
          onClick={() => onSourceChange("INVESTMENT")}
          disabled={maturedInvestments.length === 0}
          className={`
            flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200
            disabled:cursor-not-allowed disabled:opacity-50
            ${source === "INVESTMENT"
              ? "border-teal-500 bg-teal-50 shadow-md shadow-teal-100"
              : "border-slate-200 bg-white hover:border-slate-300"
            }
          `}
        >
          <div className={`
            flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors
            ${source === "INVESTMENT" ? "bg-teal-500" : "bg-slate-100"}
          `}>
            <TrendingUp size={15} className={source === "INVESTMENT" ? "text-white" : "text-slate-400"} />
          </div>
          <div>
            <p className={`text-sm font-bold ${source === "INVESTMENT" ? "text-teal-700" : "text-slate-700"}`}>
              Matured Investment
            </p>
            <p className="text-xs text-slate-500">
              {maturedInvestments.length === 0
                ? "None available"
                : `${maturedInvestments.length} plan${maturedInvestments.length !== 1 ? "s" : ""} ready`
              }
            </p>
          </div>
        </button>
      </div>

      {/* Investment picker (only when investment source selected) */}
      {source === "INVESTMENT" && (
        <div className="space-y-3">
          {maturedInvestments.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Matured Investment
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {maturedInvestments.map((inv) => (
                  <InvestmentCard
                    key={inv.id}
                    inv={inv}
                    selected={selectedInvestment === inv.id}
                    onSelect={onInvestmentSelect}
                  />
                ))}
              </div>
            </>
          )}

          {/* Locked investments (informational) */}
          {lockedInvestments.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mt-4">
                <Lock size={10} /> Locked Investments (Not Yet Available)
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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
            </>
          )}

          {maturedInvestments.length === 0 && lockedInvestments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
              <TrendingUp size={24} className="text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">No investments found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
