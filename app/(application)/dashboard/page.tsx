"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft, ArrowUpRight, BadgeCheck,
  ChevronLeft, ChevronRight, Clock, FileCheck,
  Plus, TrendingDown, TrendingUp, Wallet, BarChart3,
  Activity, CircleDollarSign, Zap, Target,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { useUser }     from "@/api-client/user";
import {
  useDashboard, useInvestments,
  fmtINR, fmtDate, fmtDateTime,
  type Investment,
} from "@/api-client/dashboard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TooltipStyle = {
  fontSize: 12, borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 12px rgba(0,0,0,.06)",
};

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  label:    string;
  value:    string;
  sub?:     string;
  icon:     React.ElementType;
  gradient: string;
  trend?:   "up" | "down" | "neutral";
  loading?: boolean;
}

function KpiCard({ label, value, sub, icon: Icon, gradient, trend, loading }: KpiProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-sm ${gradient} text-white`}>
      <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-white/5" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon size={17} className="text-white" />
          </div>
          {trend && trend !== "neutral" && (
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
              {trend === "up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {trend === "up" ? "↑" : "↓"}
            </span>
          )}
        </div>
        {loading ? (
          <div className="space-y-1.5">
            <div className="h-7 w-32 animate-pulse rounded-lg bg-white/20" />
            <div className="h-3 w-20 animate-pulse rounded bg-white/15" />
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

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { cls: string; label: string }> = {
  ACTIVE:    { cls: "bg-emerald-100 text-emerald-700", label: "Active"    },
  MATURED:   { cls: "bg-blue-100 text-blue-700",       label: "Matured"   },
  CANCELLED: { cls: "bg-slate-100 text-slate-500",     label: "Cancelled" },
  WITHDRAWN: { cls: "bg-amber-100 text-amber-700",     label: "Withdrawn" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { cls: "bg-slate-100 text-slate-500", label: status };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── KYC banner ───────────────────────────────────────────────────────────────

function KycBanner({ status }: { status: string }) {
  if (status === "APPROVED" || status === "AUTO_APPROVED") return null;
  const cfg: Record<string, { msg: string; cls: string; href: string; btn: string }> = {
    PENDING:   { msg: "Complete KYC to unlock all investment features.", cls: "bg-amber-50 border-amber-200 text-amber-800", href: "/dashboard/kyc", btn: "Start KYC" },
    IN_REVIEW: { msg: "Your KYC is under review — we'll notify you within 24–48 hrs.", cls: "bg-blue-50 border-blue-200 text-blue-800", href: "/dashboard/kyc", btn: "View Status" },
    REJECTED:  { msg: "KYC rejected. Please re-upload your documents.", cls: "bg-red-50 border-red-200 text-red-800", href: "/dashboard/kyc", btn: "Update Docs" },
  };
  const c = cfg[status];
  if (!c) return null;
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${c.cls}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <FileCheck size={16} className="shrink-0" />
        <p className="text-sm font-medium truncate">{c.msg}</p>
      </div>
      <Link href={c.href}
        className="shrink-0 rounded-xl border border-current/20 bg-white/60 px-3 py-1.5 text-xs font-bold hover:bg-white/80 transition-colors whitespace-nowrap">
        {c.btn}
      </Link>
    </div>
  );
}

// ─── Activity feed ────────────────────────────────────────────────────────────

const TXN_ICON: Record<string, { icon: React.ElementType; cls: string }> = {
  DEPOSIT:    { icon: ArrowDownLeft,    cls: "bg-emerald-100 text-emerald-600" },
  WITHDRAWAL: { icon: ArrowUpRight,     cls: "bg-orange-100 text-orange-600"  },
  INVESTMENT: { icon: TrendingUp,       cls: "bg-blue-100 text-blue-600"      },
  PROFIT:     { icon: CircleDollarSign, cls: "bg-violet-100 text-violet-600"  },
  COMMISSION: { icon: BarChart3,        cls: "bg-amber-100 text-amber-600"    },
  REFUND:     { icon: ArrowDownLeft,    cls: "bg-teal-100 text-teal-600"      },
};

function ActivityFeed({ entries, loading }: {
  entries: { id: string; transactionType: string; entryType: string; amount: number; description: string; createdAt: string }[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }
  if (!entries.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity size={28} className="text-slate-300 mb-3" />
        <p className="text-sm text-slate-400">No activity yet.</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-slate-50/80">
      {entries.map((e) => {
        const cfg = TXN_ICON[e.transactionType] ?? { icon: Activity, cls: "bg-slate-100 text-slate-500" };
        const Icon = cfg.icon;
        const isCredit = e.entryType === "CREDIT";
        return (
          <div key={e.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.cls}`}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{e.description}</p>
              <p className="text-[11px] text-slate-400">{fmtDateTime(e.createdAt)}</p>
            </div>
            <p className={`text-sm font-bold tabular-nums shrink-0 ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
              {isCredit ? "+" : "-"}{fmtINR(e.amount)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Investment table ─────────────────────────────────────────────────────────

function InvestmentTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInvestments(page);
  const rows = data?.investments ?? [];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Investment History</h3>
        {data && <p className="text-xs text-slate-400">{data.total} total</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/50">
              {["Plan", "Invested", "Profit", "Progress", "Maturity", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <TrendingUp size={28} className="text-slate-300" />
                    <p className="text-sm text-slate-400">No investments yet.</p>
                    <Link href="/dashboard/wallet" className="text-xs font-semibold text-emerald-600 hover:underline">
                      Add money to get started →
                    </Link>
                  </div>
                </td>
              </tr>
            ) : rows.map((inv: Investment) => {
              const progress = Math.min(100, Math.round((inv.completedDays / inv.tenureDays) * 100));
              return (
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{inv.packageName}</p>
                    <p className="text-[11px] text-slate-400">{inv.dailyReturnRate}%/day</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 tabular-nums">{fmtINR(inv.principalAmount)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-emerald-600 tabular-nums">+{fmtINR(inv.totalProfitEarned)}</p>
                    {inv.pendingProfit > 0 && <p className="text-[11px] text-amber-600">{fmtINR(inv.pendingProfit)} pending</p>}
                  </td>
                  <td className="px-4 py-3 min-w-[100px]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0 tabular-nums">{progress}%</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{inv.completedDays}/{inv.tenureDays} days</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(inv.maturityDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(data?.pages ?? 0) > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">Page {page} of {data?.pages}</span>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft size={13} />
            </button>
            <button type="button" onClick={() => setPage((p) => Math.min(data!.pages, p + 1))} disabled={page === data?.pages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profit chart ─────────────────────────────────────────────────────────────

function ProfitChart({ data: chartData, loading }: { data: { date: string; profit: number }[]; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Profit — Last 30 Days</h3>
          <p className="text-xs text-slate-400 mt-0.5">Daily credited profit to your wallet</p>
        </div>
        <TrendingUp size={16} className="text-emerald-500" />
      </div>
      {loading ? (
        <div className="h-52 animate-pulse rounded-xl bg-slate-50" />
      ) : chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 gap-2">
          <BarChart3 size={28} className="text-slate-300" />
          <p className="text-sm text-slate-400">No profit data yet.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={fmtDateShort} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtINR(Number(v))} />
            <Tooltip contentStyle={TooltipStyle} labelFormatter={(v) => fmtDateShort(String(v))} formatter={(v) => [fmtINR(Number(v)), "Profit"]} />
            <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fill="url(#profitGrad)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { data, isLoading, refetch }     = useDashboard();

  if (!userLoading && !user) { router.replace("/login"); return null; }

  const s       = data?.summary;
  const loading = isLoading;

  const kpiCards: KpiProps[] = [
    { label: "Portfolio Value",   value: fmtINR(s?.portfolioValue   ?? 0), icon: BarChart3,        gradient: "bg-gradient-to-br from-emerald-500 to-emerald-700",  trend: "up"      },
    { label: "Wallet Balance",    value: fmtINR(s?.walletBalance    ?? 0), icon: Wallet,           gradient: "bg-gradient-to-br from-blue-500 to-blue-700",         trend: "neutral" },
    { label: "Total Invested",    value: fmtINR(s?.totalInvested    ?? 0), icon: TrendingUp,       gradient: "bg-gradient-to-br from-violet-500 to-violet-700",     trend: "up"      },
    { label: "Total Profit",      value: fmtINR(s?.totalProfit      ?? 0), icon: CircleDollarSign, gradient: "bg-gradient-to-br from-teal-500 to-teal-700",          trend: "up"      },
    { label: "Today's Profit",    value: fmtINR(s?.todayProfit      ?? 0), icon: Zap,              gradient: "bg-gradient-to-br from-amber-500 to-amber-600",        trend: (s?.todayProfit ?? 0) > 0 ? "up" : "neutral" },
    { label: "Month Profit",      value: fmtINR(s?.monthProfit      ?? 0), icon: Activity,         gradient: "bg-gradient-to-br from-pink-500 to-rose-600",          trend: "up"      },
    { label: "Overall ROI",       value: `${s?.roi ?? "0.00"}%`,          icon: Target,           gradient: "bg-gradient-to-br from-indigo-500 to-indigo-700",     trend: "up"      },
    { label: "Active Plans",      value: String(s?.activeInvestments ?? 0), icon: BadgeCheck,      gradient: "bg-gradient-to-br from-cyan-500 to-cyan-700",          trend: "neutral" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Hero welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#141720] to-slate-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10" />
        <div className="absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            {userLoading
              ? <div className="h-7 w-48 animate-pulse rounded-xl bg-white/20 mb-2" />
              : <h1 className="text-2xl font-extrabold">Welcome back, {user?.name?.split(" ")[0] ?? "Investor"} 👋</h1>
            }
            <p className="text-sm text-white/50 mt-1">
              {s ? `Member since ${fmtDate(s.user.createdAt)}` : "Loading your portfolio…"}
            </p>
            {s && (
              <div className="mt-4 flex flex-wrap gap-4">
                <div>
                  <p className="text-[11px] text-white/40 uppercase tracking-wider">Portfolio Value</p>
                  <p className="text-3xl font-extrabold tabular-nums mt-0.5">{fmtINR(s.portfolioValue)}</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-[11px] text-white/40 uppercase tracking-wider">Wallet</p>
                  <p className="text-xl font-bold tabular-nums mt-0.5">{fmtINR(s.walletBalance)}</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-[11px] text-white/40 uppercase tracking-wider">Today's Profit</p>
                  <p className={`text-xl font-bold tabular-nums mt-0.5 ${s.todayProfit > 0 ? "text-emerald-400" : "text-white"}`}>
                    {s.todayProfit > 0 ? "+" : ""}{fmtINR(s.todayProfit)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/dashboard/wallet"
              className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-900/30">
              <Plus size={15} /> Add Money
            </Link>
            <button type="button" onClick={() => refetch()}
              className="flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors">
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KYC alert */}
      {s && <KycBanner status={s.user.kycStatus} />}

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} loading={loading} />
        ))}
      </div>

      {/* Chart + activity */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProfitChart data={data?.chart ?? []} loading={loading} />
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <Activity size={14} className="text-slate-300" />
          </div>
          <ActivityFeed entries={data?.activity ?? []} loading={loading} />
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Add Money",     href: "/dashboard/wallet",   icon: Plus,        cls: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20" },
            { label: "Withdraw",      href: "/dashboard/withdraw", icon: ArrowUpRight, cls: "bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-500/20"    },
            { label: "Invest Now",    href: "/dashboard/invest",   icon: TrendingUp,   cls: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20"          },
            { label: "KYC Verify",    href: "/dashboard/kyc",      icon: FileCheck,    cls: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"               },
          ].map(({ label, href, icon: Icon, cls }) => (
            <Link key={label} href={href}
              className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${cls}`}>
              <Icon size={14} /> {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Investment table */}
      <InvestmentTable />

    </div>
  );
}
