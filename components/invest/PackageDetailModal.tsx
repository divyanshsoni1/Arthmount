"use client";

import { useState, useCallback } from "react";
import {
  X, TrendingUp, Clock, Shield, Users, Calculator,
  CalendarDays, Info, ChevronRight, Star, Zap, Award,
  BarChart3, Lock, CheckCircle,
} from "lucide-react";
import type { ActivePackage } from "@/api-client/invest";
import {
  formatINR, formatINRCompact, estimateMaturityValue, formatDate,
} from "@/api-client/invest";

// ─── Calculator ───────────────────────────────────────────────────────────────

function InvestCalculator({ pkg }: { pkg: ActivePackage }) {
  const [amount, setAmount] = useState<string>(String(pkg.minAmount));

  const parsed      = parseFloat(amount) || 0;
  const clamped     = Math.min(pkg.maxAmount, Math.max(0, parsed));
  const { totalReturn, maturityValue } = estimateMaturityValue(clamped, pkg.dailyReturnRate, pkg.tenureDays);
  const lockEndDate = new Date(Date.now() + pkg.tenureDays * 86_400_000);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setAmount(v);
  }, []);

  const isValid = parsed >= pkg.minAmount && parsed <= pkg.maxAmount;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Calculator size={15} className="text-emerald-600" />
        <h4 className="text-sm font-bold text-slate-800">Investment Calculator</h4>
      </div>

      {/* Amount input */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
          Investment Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
          <input
            type="number"
            value={amount}
            onChange={handleChange}
            min={pkg.minAmount}
            max={pkg.maxAmount}
            step="1"
            placeholder={String(pkg.minAmount)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />
        </div>
        {!isValid && parsed > 0 && (
          <p className="mt-1 text-[11px] text-red-500">
            {parsed < pkg.minAmount
              ? `Minimum is ${formatINR(pkg.minAmount)}`
              : `Maximum is ${formatINR(pkg.maxAmount)}`}
          </p>
        )}
        {/* Quick fill buttons */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {[pkg.minAmount, pkg.minAmount * 2, pkg.minAmount * 5, pkg.maxAmount].map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setAmount(String(v))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {formatINRCompact(v)}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {parsed > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white border border-slate-100 p-3">
            <p className="text-[10px] text-slate-400 font-medium">You Invest</p>
            <p className="text-base font-extrabold text-slate-800 tabular-nums mt-0.5">
              {formatINR(clamped)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
            <p className="text-[10px] text-emerald-600 font-medium">Est. Return</p>
            <p className="text-base font-extrabold text-emerald-700 tabular-nums mt-0.5">
              +{formatINR(totalReturn)}
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
            <p className="text-[10px] text-blue-600 font-medium">Maturity Value</p>
            <p className="text-base font-extrabold text-blue-700 tabular-nums mt-0.5">
              {formatINR(maturityValue)}
            </p>
          </div>
          <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
            <p className="text-[10px] text-violet-600 font-medium">Lock-in Ends</p>
            <p className="text-sm font-bold text-violet-700 mt-0.5">
              {formatDate(lockEndDate.toISOString())}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PackageDetailModal ───────────────────────────────────────────────────────

interface PackageDetailModalProps {
  pkg:      ActivePackage;
  onClose:  () => void;
  onInvest: (pkg: ActivePackage) => void;
}

const FEATURES = [
  "Daily compounding returns credited to your wallet",
  "100% capital-backed investment",
  "Transparent fee structure — no hidden charges",
  "Automated profit distribution every week",
  "Real-time portfolio tracking",
  "Dedicated customer support",
];

const FAQS = [
  {
    q: "When will I start earning returns?",
    a: "Returns begin accruing from the day after investment. Profits are credited weekly to your wallet.",
  },
  {
    q: "Can I withdraw during the lock-in period?",
    a: "No. Your capital is locked for the full tenure. Early withdrawals are not permitted to protect all investors.",
  },
  {
    q: "What happens at maturity?",
    a: "When the tenure ends, your investment status changes to Matured and you can withdraw your principal plus profits.",
  },
  {
    q: "Is my investment safe?",
    a: "All investments are managed by professional fund managers. Risk disclosure is displayed before confirming any investment.",
  },
];

export function PackageDetailModal({ pkg, onClose, onInvest }: PackageDetailModalProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const annualRate = (pkg.dailyReturnRate * 365).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <TrendingUp size={17} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{pkg.name}</h2>
              <p className="text-[11px] text-slate-400 font-mono">{pkg.code}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">

          {/* ROI hero strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: TrendingUp,   label: "Daily ROI",    value: `${pkg.dailyReturnRate}%`,   cls: "from-emerald-500 to-teal-600"   },
              { icon: BarChart3,    label: "Annual ROI",   value: `${annualRate}%`,             cls: "from-blue-500 to-indigo-600"    },
              { icon: Clock,        label: "Tenure",       value: `${pkg.tenureDays} days`,     cls: "from-violet-500 to-purple-600"  },
            ].map(({ icon: Icon, label, value, cls }) => (
              <div key={label} className={`rounded-xl bg-gradient-to-br ${cls} p-3 text-white text-center`}>
                <Icon size={14} className="mx-auto mb-1 text-white/80" />
                <p className="text-xs font-medium text-white/70">{label}</p>
                <p className="text-base font-extrabold tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          {/* Min / Max */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Min Investment</p>
              <p className="text-lg font-extrabold text-slate-800 tabular-nums mt-0.5">{formatINR(pkg.minAmount)}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Max Investment</p>
              <p className="text-lg font-extrabold text-slate-800 tabular-nums mt-0.5">{formatINR(pkg.maxAmount)}</p>
            </div>
          </div>

          {/* Description */}
          {pkg.description && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">About This Plan</h4>
              <p className="text-sm text-slate-700 leading-relaxed">{pkg.description}</p>
            </div>
          )}

          {/* Benefits */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Plan Benefits</h4>
            <div className="space-y-2">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-2">
                  <CheckCircle size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                  <p className="text-xs text-slate-700">{f}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Investor stats */}
          <div className="flex items-center gap-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="text-center">
              <p className="text-lg font-extrabold text-slate-800">{pkg.totalInvestors}</p>
              <p className="text-[10px] text-slate-400 font-medium">Total Investors</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <p className="text-lg font-extrabold text-slate-800">{pkg.activeInvestors}</p>
              <p className="text-[10px] text-slate-400 font-medium">Active Now</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <p className="text-lg font-extrabold text-emerald-600">{formatINRCompact(pkg.totalInvested)}</p>
              <p className="text-[10px] text-slate-400 font-medium">Total Invested</p>
            </div>
          </div>

          {/* Calculator */}
          <InvestCalculator pkg={pkg} />

          {/* Lock-in warning */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
            <Lock size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Lock-in Period:</strong> Your capital will be locked for {pkg.tenureDays} days from the investment date.
              Withdrawals, transfers, and cancellations are not permitted during this period.
            </p>
          </div>

          {/* Risk disclaimer */}
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <Info size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Investments are subject to market risks. Returns shown are indicative based on current rates and may vary.
              Please read all related documents carefully before investing.
            </p>
          </div>

          {/* FAQs */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">FAQs</h4>
            <div className="space-y-2">
              {FAQS.map((faq, i) => (
                <div key={i} className="rounded-xl border border-slate-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    {faq.q}
                    <ChevronRight
                      size={13}
                      className={`shrink-0 text-slate-400 transition-transform ${openFaq === i ? "rotate-90" : ""}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-3 text-xs text-slate-500 leading-relaxed border-t border-slate-50">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onInvest(pkg)}
            className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <TrendingUp size={15} /> Invest Now
          </button>
        </div>
      </div>
    </div>
  );
}
