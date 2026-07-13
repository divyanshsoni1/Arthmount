"use client";

import { useAdminStats }  from "@/api-client/admin";
import {
  Users, ShieldCheck, ShieldX, Wallet, TrendingUp,
  ArrowDownCircle, ArrowUpCircle, Clock, BadgeCheck,
  AlertTriangle, Activity, Banknote, UserPlus, UserCheck,
  Target, BarChart2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, PieChart,
  Pie, Cell, Legend,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:   string;
  value:   string | number;
  sub?:    string;
  icon:    React.ElementType;
  accent:  string;   // bg color class for icon
  trend?:  { value: string; up: boolean };
  loading?: boolean;
}

function KpiCard({ label, value, sub, icon: Icon, accent, trend, loading }: KpiCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Subtle background pattern */}
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${accent} opacity-[0.07] transition-all group-hover:opacity-[0.12]`} />

      <div className="relative flex items-start justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent} shadow-sm`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${trend.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
            {trend.up ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-28 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-3.5 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums leading-tight">{value}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">{label}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Chart card wrapper ────────────────────────────────────────────────────────

function ChartCard({ title, sub, children, loading }: { title: string; sub?: string; children: React.ReactNode; loading?: boolean }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <BarChart2 size={16} className="text-slate-300" />
      </div>
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-slate-50" />
      ) : children}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const TooltipStyle = { fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,.06)" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminHomePage() {
  const { data, isLoading } = useAdminStats();
  const s = data?.stats;

  // KYC pie data
  const kycPie = [
    { name: "Approved",  value: s?.kyc.approved  ?? 0, color: "#10b981" },
    { name: "Pending",   value: s?.kyc.pending   ?? 0, color: "#f59e0b" },
    { name: "In Review", value: s?.kyc.inReview  ?? 0, color: "#3b82f6" },
    { name: "Rejected",  value: s?.kyc.rejected  ?? 0, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Platform Overview</h1>
          <p className="text-sm text-slate-400 mt-0.5">Real-time metrics across the Arthmount platform.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
          <Activity size={14} className="text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-700">Live Data</span>
        </div>
      </div>

      {/* ── User KPIs ── */}
      <section>
        <SectionHeader title="Users" sub="Registration & account stats" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Total Users"    value={fmtNum(s?.totalUsers   ?? 0)} icon={Users}     accent="bg-blue-500"    loading={isLoading} />
          <KpiCard label="Active"         value={fmtNum(s?.activeUsers  ?? 0)} icon={UserCheck} accent="bg-emerald-500" loading={isLoading} trend={{ value: "Live", up: true }} />
          <KpiCard label="Frozen"         value={fmtNum(s?.frozenUsers  ?? 0)} icon={AlertTriangle} accent="bg-amber-500" loading={isLoading} />
          <KpiCard label="New Today"      value={s?.newToday    ?? 0} icon={UserPlus}  accent="bg-purple-500" loading={isLoading} sub="registrations" />
          <KpiCard label="This Week"      value={s?.newThisWeek ?? 0} icon={UserPlus}  accent="bg-indigo-500" loading={isLoading} sub="last 7 days" />
          <KpiCard label="This Month"     value={s?.newThisMonth ?? 0} icon={UserPlus} accent="bg-sky-500"    loading={isLoading} sub="last 30 days" />
        </div>
      </section>

      {/* ── KYC KPIs ── */}
      <section>
        <SectionHeader title="KYC Status" sub="Verification pipeline breakdown" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Pending"    value={s?.kyc.pending  ?? 0} icon={Clock}       accent="bg-amber-500"  loading={isLoading} />
          <KpiCard label="In Review"  value={s?.kyc.inReview ?? 0} icon={ShieldCheck} accent="bg-blue-500"   loading={isLoading} />
          <KpiCard label="Approved"   value={s?.kyc.approved ?? 0} icon={BadgeCheck}  accent="bg-emerald-500" loading={isLoading} trend={{ value: "Verified", up: true }} />
          <KpiCard label="Rejected"   value={s?.kyc.rejected ?? 0} icon={ShieldX}     accent="bg-red-500"    loading={isLoading} />
        </div>
      </section>

      {/* ── Finance KPIs ── */}
      <section>
        <SectionHeader title="Finance" sub="Deposits, withdrawals & investments" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Total Deposits"      value={fmtINR(s?.deposits.total            ?? 0)} icon={ArrowDownCircle} accent="bg-emerald-600" loading={isLoading} sub={`${s?.deposits.totalCount ?? 0} txns`} />
          <KpiCard label="Successful"          value={fmtINR(s?.deposits.successful       ?? 0)} icon={BadgeCheck}      accent="bg-green-600"  loading={isLoading} sub={`${s?.deposits.successCount ?? 0} txns`} />
          <KpiCard label="Withdrawals"         value={fmtINR(s?.withdrawals.total         ?? 0)} icon={ArrowUpCircle}   accent="bg-orange-500" loading={isLoading} sub={`${s?.withdrawals.totalCount ?? 0} txns`} />
          <KpiCard label="Active Investments"  value={fmtINR(s?.investments.activeAmount  ?? 0)} icon={TrendingUp}      accent="bg-violet-500" loading={isLoading} sub={`${s?.investments.activeCount ?? 0} active`} />
          <KpiCard label="Wallet Balance"      value={fmtINR(s?.wallet.totalMainBalance   ?? 0)} icon={Wallet}          accent="bg-teal-500"   loading={isLoading} sub="all users" />
          <KpiCard label="Invested Balance"    value={fmtINR(s?.wallet.totalInvestedBalance ?? 0)} icon={Banknote}      accent="bg-cyan-500"   loading={isLoading} />
        </div>
      </section>

      {/* ── Charts ── */}
      <section className="grid gap-5 lg:grid-cols-3">

        {/* User Growth — 2/3 */}
        <div className="lg:col-span-2">
          <ChartCard title="User Registrations" sub="Daily new users — last 30 days" loading={isLoading}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.growth ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={fmtDate} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={TooltipStyle} labelFormatter={(v) => fmtDate(String(v))} />
                <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2.5} fill="url(#userGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* KYC Pie — 1/3 */}
        <ChartCard title="KYC Distribution" sub="All-time breakdown" loading={isLoading}>
          {kycPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={kycPie}
                  cx="50%"
                  cy="45%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {kycPie.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={TooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">No KYC data yet.</div>
          )}
        </ChartCard>
      </section>

      {/* Daily Deposits Bar */}
      <section>
        <ChartCard title="Daily Deposits" sub="Successful deposit amounts (₹) — last 30 days" loading={isLoading}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.deposits ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={fmtDate} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtINR(v)} />
              <Tooltip
                contentStyle={TooltipStyle}
                labelFormatter={(v) => fmtDate(String(v))}
                formatter={(v) => [fmtINR(Number(v)), "Amount"]}
              />
              <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Summary strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Deposit Value",    value: fmtINR(s?.deposits.total ?? 0),           accent: "text-emerald-600" },
          { label: "Total Withdrawal Value", value: fmtINR(s?.withdrawals.total ?? 0),         accent: "text-orange-600" },
          { label: "Active Investment AUM",  value: fmtINR(s?.investments.activeAmount ?? 0),  accent: "text-violet-600" },
          { label: "Platform Wallet AUM",    value: fmtINR((s?.wallet.totalMainBalance ?? 0) + (s?.wallet.totalInvestedBalance ?? 0)), accent: "text-blue-600" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white shadow-sm px-5 py-4">
            {isLoading
              ? <div className="h-6 w-24 animate-pulse rounded bg-slate-100 mb-1.5" />
              : <p className={`text-xl font-extrabold tabular-nums ${accent}`}>{value}</p>
            }
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </section>

    </div>
  );
}
