"use client";

import { useAdminStats } from "@/api-client/admin";
import {
  Users, ShieldCheck, ShieldX, Wallet, TrendingUp,
  ArrowDownCircle, ArrowUpCircle, Clock, BadgeCheck,
  AlertTriangle, Activity,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

// ─── KPI card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:    string;
  value:    string | number;
  sub?:     string;
  icon:     React.ElementType;
  color:    string; // tailwind bg class
  loading?: boolean;
}

function KpiCard({ label, value, sub, icon: Icon, color, loading }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-28 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}

// ─── Section heading ─────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
      {children}
    </h2>
  );
}

// ─── Format helpers ──────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminHomePage() {
  const { data, isLoading } = useAdminStats();
  const s = data?.stats;

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Platform Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Real-time metrics across the Arthmount platform.</p>
      </div>

      {/* ── Users ── */}
      <section>
        <SectionTitle>Users</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Total Users"     value={s?.totalUsers   ?? 0} icon={Users}        color="bg-blue-500"   loading={isLoading} />
          <KpiCard label="Active"          value={s?.activeUsers  ?? 0} icon={Activity}     color="bg-emerald-500" loading={isLoading} />
          <KpiCard label="Frozen"          value={s?.frozenUsers  ?? 0} icon={AlertTriangle} color="bg-amber-500" loading={isLoading} />
          <KpiCard label="New Today"       value={s?.newToday     ?? 0} icon={Users}        color="bg-purple-500" loading={isLoading} sub="registrations" />
          <KpiCard label="New This Week"   value={s?.newThisWeek  ?? 0} icon={Users}        color="bg-indigo-500" loading={isLoading} sub="last 7 days" />
          <KpiCard label="New This Month"  value={s?.newThisMonth ?? 0} icon={Users}        color="bg-sky-500"   loading={isLoading} sub="last 30 days" />
        </div>
      </section>

      {/* ── KYC ── */}
      <section>
        <SectionTitle>KYC Status</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Pending"    value={s?.kyc.pending  ?? 0} icon={Clock}       color="bg-amber-500"  loading={isLoading} />
          <KpiCard label="In Review"  value={s?.kyc.inReview ?? 0} icon={ShieldCheck} color="bg-blue-500"   loading={isLoading} />
          <KpiCard label="Approved"   value={s?.kyc.approved ?? 0} icon={BadgeCheck}  color="bg-emerald-500" loading={isLoading} />
          <KpiCard label="Rejected"   value={s?.kyc.rejected ?? 0} icon={ShieldX}     color="bg-red-500"    loading={isLoading} />
        </div>
      </section>

      {/* ── Finance ── */}
      <section>
        <SectionTitle>Finance</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Total Deposits"    value={fmtINR(s?.deposits.total           ?? 0)} icon={ArrowDownCircle} color="bg-emerald-500" loading={isLoading} sub={`${s?.deposits.totalCount ?? 0} txns`} />
          <KpiCard label="Successful Deposits" value={fmtINR(s?.deposits.successful    ?? 0)} icon={ArrowDownCircle} color="bg-green-600"  loading={isLoading} sub={`${s?.deposits.successCount ?? 0} txns`} />
          <KpiCard label="Withdrawals"       value={fmtINR(s?.withdrawals.total        ?? 0)} icon={ArrowUpCircle}   color="bg-orange-500" loading={isLoading} sub={`${s?.withdrawals.totalCount ?? 0} txns`} />
          <KpiCard label="Active Investments" value={fmtINR(s?.investments.activeAmount ?? 0)} icon={TrendingUp}     color="bg-violet-500" loading={isLoading} sub={`${s?.investments.activeCount ?? 0} active`} />
          <KpiCard label="Wallet Balance"    value={fmtINR(s?.wallet.totalMainBalance  ?? 0)} icon={Wallet}          color="bg-teal-500"   loading={isLoading} sub="all users" />
          <KpiCard label="Invested (wallet)" value={fmtINR(s?.wallet.totalInvestedBalance ?? 0)} icon={TrendingUp}   color="bg-cyan-500"  loading={isLoading} />
        </div>
      </section>

      {/* ── Charts ── */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* User Growth */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-bold text-slate-800 mb-1">New Users — Last 30 Days</p>
          <p className="text-xs text-slate-500 mb-4">Daily registration trend</p>
          {isLoading ? (
            <div className="h-52 animate-pulse rounded-xl bg-slate-50" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.growth ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtDate(v)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}
                  labelFormatter={(v) => fmtDate(String(v))}
                />
                <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} fill="url(#userGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Deposits */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-bold text-slate-800 mb-1">Daily Deposits — Last 30 Days</p>
          <p className="text-xs text-slate-500 mb-4">Successful deposit amounts (₹)</p>
          {isLoading ? (
            <div className="h-52 animate-pulse rounded-xl bg-slate-50" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.deposits ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtDate(v)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtINR(v)} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}
                  labelFormatter={(v) => fmtDate(String(v))}
                  formatter={(v) => [fmtINR(Number(v)), "Amount"]}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
