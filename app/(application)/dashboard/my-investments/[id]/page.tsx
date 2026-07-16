"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, TrendingUp, Lock, CheckCircle, XCircle,
  ArrowUpCircle, Calendar, BarChart3, Shield, Info,
  CircleDollarSign, Clock, Users, Zap, RefreshCw,
  AlertTriangle, ExternalLink,
} from "lucide-react";

import { useUser }              from "@/api-client/user";
import {
  useInvestmentDetail,
  useAllInvestments,
  derivePortfolioStats,
  formatINR, formatINRCompact, formatDate, formatDateTime,
  daysRemaining, lockInProgress, estimateMaturityValue,
  INVEST_DETAIL_KEY,
} from "@/api-client/invest";
import { useQueryClient }       from "@tanstack/react-query";

import { InvestmentTimeline }   from "@/components/my-investments/InvestmentTimeline";
import {
  PortfolioGrowthChart,
} from "@/components/my-investments/charts/PortfolioGrowthChart";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  ACTIVE:    { label: "Active",    icon: TrendingUp,    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500" },
  MATURED:   { label: "Matured",   icon: CheckCircle,   cls: "bg-blue-50 text-blue-700 border-blue-200",           dot: "bg-blue-500"    },
  CANCELLED: { label: "Cancelled", icon: XCircle,       cls: "bg-slate-50 text-slate-500 border-slate-200",        dot: "bg-slate-400"   },
  WITHDRAWN: { label: "Withdrawn", icon: ArrowUpCircle, cls: "bg-amber-50 text-amber-700 border-amber-200",        dot: "bg-amber-500"   },
} as const;

function StatusBadge({ status }: { status: string }) {
  const cfg  = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.CANCELLED;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${cfg.cls}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

// ─── Summary row ─────────────────────────────────────────────────────────────

function SummaryRow({
  label, value, valueClass, sub,
}: { label: string; value: string; valueClass?: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="text-right">
        <span className={`text-xs font-bold tabular-nums ${valueClass ?? "text-slate-800"}`}>{value}</span>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
        <div className="h-5 w-48 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <div className="h-36 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-52 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-52 animate-pulse rounded-2xl bg-slate-100" />
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

// ─── Lock-in card ─────────────────────────────────────────────────────────────

function LockInCard({ status, maturityDate, completedDays, tenureDays }: {
  status: string; maturityDate: string; completedDays: number; tenureDays: number;
}) {
  const progress  = lockInProgress(completedDays, tenureDays);
  const remaining = Math.max(0, daysRemaining(maturityDate));
  const isActive  = status === "ACTIVE";
  const isMatured = status === "MATURED" || status === "WITHDRAWN";

  return (
    <div className={`rounded-2xl border p-4 ${
      isMatured
        ? "border-blue-100 bg-blue-50"
        : isActive
        ? "border-amber-100 bg-amber-50"
        : "border-slate-100 bg-slate-50"
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {isMatured
            ? <CheckCircle size={16} className="text-blue-500" />
            : isActive
            ? <Lock size={16} className="text-amber-500" />
            : <XCircle size={16} className="text-slate-400" />
          }
          <p className={`text-sm font-bold ${
            isMatured ? "text-blue-700" : isActive ? "text-amber-700" : "text-slate-500"
          }`}>
            {isMatured ? "Lock-in Complete" : isActive ? "Funds Locked" : "Investment Ended"}
          </p>
        </div>
        {isActive && (
          <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
            {remaining} days left
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-500">{completedDays}/{tenureDays} days</span>
          <span className="text-[11px] font-bold text-slate-600 tabular-nums">{progress}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-white/70 border border-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isMatured ? "bg-blue-500" : "bg-amber-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <p className={`text-xs ${isMatured ? "text-blue-700" : isActive ? "text-amber-700" : "text-slate-500"}`}>
        {isMatured
          ? `Matured on ${formatDate(maturityDate)}. Funds are available for withdrawal.`
          : isActive
          ? `Capital is locked until ${formatDate(maturityDate)}. No early withdrawals permitted.`
          : `Investment ended on ${formatDate(maturityDate)}.`
        }
      </p>
    </div>
  );
}

// ─── Trust stats strip ────────────────────────────────────────────────────────

function TrustStats({ allData, packageId }: {
  allData: ReturnType<typeof derivePortfolioStats> | null;
  packageId: string;
}) {
  const pkg = allData?.byPackage.find((p) => p.packageId === packageId);
  if (!pkg) return null;

  const items = [
    { label: "Your Investments",     value: String(pkg.count),                       icon: Users,           color: "text-blue-600",    bg: "bg-blue-50"    },
    { label: "Total Invested",       value: formatINRCompact(pkg.invested),           icon: CircleDollarSign,color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Earned",         value: `+${formatINRCompact(pkg.profit)}`,       icon: TrendingUp,      color: "text-violet-600",  bg: "bg-violet-50"  },
    { label: "Package ROI",          value: `${pkg.roi >= 0 ? "+" : ""}${pkg.roi}%`, icon: BarChart3,       color: "text-amber-600",   bg: "bg-amber-50"   },
  ];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-slate-50">
        <Shield size={14} className="text-slate-400" />
        <h3 className="text-sm font-bold text-slate-900">Your Stats for This Package</h3>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-100">
        {items.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-3 bg-white p-4">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon size={14} className={color} />
            </div>
            <div>
              <p className={`text-base font-extrabold tabular-nums ${color}`}>{value}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvestmentDetailPage() {
  const router   = useRouter();
  const params   = useParams<{ id: string }>();
  const id       = params?.id ?? "";
  const qc       = useQueryClient();

  const { user, isLoading: userLoading } = useUser();
  const {
    data:      inv,
    isLoading: invLoading,
    error:     invError,
    refetch,
  } = useInvestmentDetail(id);

  const { data: allData, isLoading: allLoading } = useAllInvestments();
  const stats = useMemo(
    () => allData?.investments?.length
      ? derivePortfolioStats(allData.investments)
      : null,
    [allData]
  );

  // Build simple growth sparkline for this investment (must be before any early returns)
  const growthSeries = useMemo(() => {
    if (!inv) return [];
    const points = Math.max(2, inv.completedDays);
    const dailyP = inv.principalAmount * (inv.dailyReturnRate / 100);
    return Array.from({ length: Math.min(points, 30) }, (_, i) => {
      const d = new Date(inv.investedAt);
      d.setDate(d.getDate() + i);
      return { date: d.toISOString(), value: inv.principalAmount + dailyP * (i + 1) };
    });
  }, [inv]);

  // Auth guard
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace(`/login?next=/dashboard/my-investments/${id}`);
    }
  }, [user, userLoading, router, id]);

  if (userLoading || invLoading) return <DetailSkeleton />;
  if (!user) return null;

  // Error states
  if (invError) {
    const axiosErr = invError as any;
    const status   = axiosErr?.response?.status;
    const is404    = status === 404;
    const is403    = status === 403 || status === 401;

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/my-investments"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-sm font-bold text-slate-900">Investment Details</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">
              {is404 ? "Investment Not Found"
               : is403 ? "Access Denied"
               : "Failed to Load Investment"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {is404 ? "This investment doesn't exist or has been removed."
               : is403 ? "You don't have permission to view this investment."
               : "Something went wrong. Please try again."}
            </p>
          </div>
          <div className="flex gap-2">
            {!is403 && !is404 && (
              <button type="button" onClick={() => refetch()}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors">
                <RefreshCw size={12} /> Retry
              </button>
            )}
            <Link href="/dashboard/my-investments"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              <ArrowLeft size={12} /> My Investments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!inv) return null;

  const profit          = inv.totalProfitEarned;
  const roi             = inv.principalAmount > 0
    ? ((profit / inv.principalAmount) * 100).toFixed(2)
    : "0.00";
  const { totalReturn: estFinalReturn, maturityValue } = estimateMaturityValue(
    inv.principalAmount, inv.dailyReturnRate, inv.tenureDays
  );
  const progress        = lockInProgress(inv.completedDays, inv.tenureDays);
  const remaining       = Math.max(0, daysRemaining(inv.maturityDate));
  const isActive        = inv.status === "ACTIVE";
  const isMatured       = inv.status === "MATURED";
  const canWithdraw     = isMatured;
  const method          = inv.paymentMethod === "RAZORPAY" ? "Online (Razorpay)" : inv.paymentMethod === "WALLET" ? "Wallet Balance" : inv.paymentMethod ?? "—";

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard/my-investments"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label="Back to My Investments">
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-slate-900 truncate leading-none">{inv.packageName}</h1>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{inv.packageCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={inv.status} />
            <button type="button" onClick={() => { refetch(); qc.invalidateQueries({ queryKey: INVEST_DETAIL_KEY(id) }); }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              aria-label="Refresh">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-5">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] to-slate-700 p-5 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-500/10" />
          <div className="pointer-events-none absolute -left-4  bottom-0  h-24 w-24 rounded-full bg-white/5"   />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20">
                <TrendingUp size={14} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-extrabold leading-none">{inv.packageName}</p>
                <p className="text-[11px] text-white/50 font-mono mt-0.5">{inv.packageCode}</p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={inv.status} />
              </div>
            </div>

            <div className="flex flex-wrap gap-5">
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-wider">You Invested</p>
                <p className="text-2xl font-extrabold tabular-nums mt-0.5">{formatINR(inv.principalAmount)}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-wider">Profit Earned</p>
                <p className={`text-2xl font-extrabold tabular-nums mt-0.5 ${profit > 0 ? "text-emerald-400" : "text-white"}`}>
                  {profit > 0 ? "+" : ""}{formatINR(profit)}
                </p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-wider">ROI</p>
                <p className={`text-2xl font-extrabold tabular-nums mt-0.5 ${Number(roi) > 0 ? "text-violet-400" : "text-white"}`}>
                  {Number(roi) > 0 ? "+" : ""}{roi}%
                </p>
              </div>
            </div>

            {/* Lock-in mini bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-white/50">{inv.completedDays}/{inv.tenureDays} days</span>
                <span className="text-[11px] font-bold text-white/70 tabular-nums">{progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {isActive && (
                <p className="text-[11px] text-white/40 mt-1">Matures on {formatDate(inv.maturityDate)} · {remaining} days remaining</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Main grid ─────────────────────────────────────────────────────── */}
        <div className="grid gap-5 md:grid-cols-2">

          {/* Investment summary */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-slate-50">
              <CircleDollarSign size={14} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900">Investment Summary</h3>
            </div>
            <div className="px-5 pb-4">
              <SummaryRow label="Package Name"        value={inv.packageName}                               />
              <SummaryRow label="Package Code"        value={inv.packageCode}                               />
              <SummaryRow label="Investment Amount"   value={formatINR(inv.principalAmount)}  valueClass="text-slate-900 font-extrabold" />
              <SummaryRow label="Daily Return Rate"   value={`${inv.dailyReturnRate}% / day`}               />
              <SummaryRow label="Tenure"              value={`${inv.tenureDays} days`}                       />
              <SummaryRow label="Profit Earned"       value={`+${formatINR(profit)}`}          valueClass="text-emerald-600 font-extrabold" />
              <SummaryRow label="Pending Profit"      value={formatINR(inv.pendingProfit)}     valueClass={inv.pendingProfit > 0 ? "text-amber-600" : "text-slate-400"} />
              <SummaryRow label="Estimated Return"    value={`+${formatINR(estFinalReturn)}`}  valueClass="text-violet-600" sub="At full maturity" />
              <SummaryRow label="Maturity Value"      value={formatINR(maturityValue)}          valueClass="text-blue-600"  sub="Principal + full return" />
              <SummaryRow label="Overall ROI"         value={`${Number(roi) > 0 ? "+" : ""}${roi}%`} valueClass={Number(roi) > 0 ? "text-emerald-600" : "text-slate-400"} />
            </div>
          </div>

          {/* Transaction & dates */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-slate-50">
              <Calendar size={14} className="text-blue-500" />
              <h3 className="text-sm font-bold text-slate-900">Transaction Details</h3>
            </div>
            <div className="px-5 pb-4">
              <SummaryRow label="Investment Date"   value={formatDate(inv.investedAt)}                                        />
              <SummaryRow label="Maturity Date"     value={formatDate(inv.maturityDate)}                                       />
              <SummaryRow label="Days Completed"    value={`${inv.completedDays} / ${inv.tenureDays}`}                         />
              <SummaryRow label="Days Remaining"    value={isActive ? `${remaining} days` : "—"}                              />
              <SummaryRow label="Progress"          value={`${progress}%`}                                                     />
              <SummaryRow label="Payment Method"    value={method}                                                             />
              {inv.transactionRef && (
                <SummaryRow label="Transaction Ref" value={inv.transactionRef} valueClass="font-mono text-[11px] text-slate-600" />
              )}
              <SummaryRow label="Status"            value={STATUS_CFG[inv.status as keyof typeof STATUS_CFG]?.label ?? inv.status} />
            </div>

            {/* Withdraw eligibility */}
            <div className={`mx-5 mb-5 rounded-xl border p-3 ${
              canWithdraw
                ? "border-emerald-100 bg-emerald-50"
                : "border-slate-100 bg-slate-50"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {canWithdraw
                  ? <CheckCircle size={13} className="text-emerald-500" />
                  : <Lock        size={13} className="text-amber-500"   />
                }
                <p className={`text-xs font-bold ${canWithdraw ? "text-emerald-700" : "text-amber-700"}`}>
                  {canWithdraw ? "Withdrawal Available" : isActive ? "Funds Locked" : "Not Withdrawable"}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {canWithdraw
                  ? "Your investment has matured. Visit the withdraw section to claim your funds."
                  : isActive
                  ? `Funds are locked until ${formatDate(inv.maturityDate)}. ${remaining} days remain.`
                  : "This investment is no longer active."
                }
              </p>
              {canWithdraw && (
                <Link href="/dashboard/wallet"
                  className="mt-2 flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline">
                  Go to Wallet <ExternalLink size={10} />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Lock-in card ──────────────────────────────────────────────────── */}
        <LockInCard
          status={inv.status}
          maturityDate={inv.maturityDate}
          completedDays={inv.completedDays}
          tenureDays={inv.tenureDays}
        />

        {/* ── Performance chart ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-slate-50">
            <BarChart3 size={14} className="text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900">Investment Growth</h3>
            <span className="text-xs text-slate-400">— estimated daily value</span>
          </div>
          <div className="px-2 pb-4">
            <PortfolioGrowthChart data={growthSeries} loading={false} />
          </div>
        </div>

        {/* ── Package info ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-slate-50">
            <Info size={14} className="text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900">Package Information</h3>
          </div>
          <div className="px-5 pb-5">
            <div className="grid grid-cols-3 gap-3 mt-3">
              {[
                { icon: Zap,      label: "Daily ROI",  value: `${inv.dailyReturnRate}%`,                             cls: "from-emerald-500 to-teal-600"   },
                { icon: BarChart3,label: "Annual ROI",  value: `${(inv.dailyReturnRate * 365).toFixed(1)}%`,          cls: "from-blue-500 to-indigo-600"    },
                { icon: Clock,    label: "Tenure",      value: `${inv.tenureDays}d`,                                  cls: "from-violet-500 to-purple-600"  },
              ].map(({ icon: Icon, label, value, cls }) => (
                <div key={label} className={`rounded-xl bg-gradient-to-br ${cls} p-3 text-white text-center`}>
                  <Icon size={13} className="mx-auto mb-1 text-white/70" />
                  <p className="text-[10px] font-medium text-white/70">{label}</p>
                  <p className="text-base font-extrabold tabular-nums">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Investments are subject to market risks. Returns shown are indicative based on current rates.
                Capital is locked for the full tenure and cannot be withdrawn early.
              </p>
            </div>
          </div>
        </div>

        {/* ── Trust stats ───────────────────────────────────────────────────── */}
        {!allLoading && stats && (
          <TrustStats allData={stats} packageId={inv.packageId} />
        )}

        {/* ── Timeline ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-slate-50">
            <Clock size={14} className="text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900">Investment Timeline</h3>
          </div>
          <div className="px-5 py-5">
            <InvestmentTimeline investment={inv} />
          </div>
        </div>

        {/* ── Bottom navigation ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <Link href="/dashboard/my-investments"
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <ArrowLeft size={14} /> All Investments
          </Link>
          <Link href="/dashboard/invest"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90 transition-all">
            <TrendingUp size={14} /> Invest Again
          </Link>
        </div>

      </div>
    </div>
  );
}
