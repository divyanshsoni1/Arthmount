"use client";

import { useAdminStats } from "@/api-client/admin";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Users, Wallet, ShieldCheck } from "lucide-react";

function fmtINR(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

function ChartCard({ title, sub, children, loading }: {
  title: string; sub: string;
  children: React.ReactNode; loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
      <p className="text-sm font-bold text-slate-800 mb-0.5">{title}</p>
      <p className="text-xs text-slate-500 mb-4">{sub}</p>
      {loading
        ? <div className="h-52 animate-pulse rounded-xl bg-slate-50" />
        : children}
    </div>
  );
}

function StatPill({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon size={17} className="text-white" />
      </div>
      <div>
        <p className="text-xl font-extrabold text-slate-900 tabular-nums leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useAdminStats();
  const s = data?.stats;

  const kycPie = s ? [
    { name: "Approved",  value: s.kyc.approved  },
    { name: "In Review", value: s.kyc.inReview  },
    { name: "Pending",   value: s.kyc.pending   },
    { name: "Rejected",  value: s.kyc.rejected  },
  ] : [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform growth and financial overview — last 30 days.</p>
      </div>

      {/* KPI pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill icon={Users}       label="Total Users"         value={s?.totalUsers  ?? "—"}                     color="bg-blue-500"    />
        <StatPill icon={ShieldCheck} label="KYC Approved"          value={s?.kyc.approved ?? "—"}                    color="bg-emerald-500" />
        <StatPill icon={Wallet}      label="Total Deposits"        value={s ? fmtINR(s.deposits.successful) : "—"}   color="bg-violet-500"  />
        <StatPill icon={TrendingUp}  label="Active Investments"    value={s?.investments.activeCount ?? "—"}          color="bg-orange-500"  />
      </div>

      {/* User growth chart */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="User Registrations" sub="Daily new users — last 30 days" loading={isLoading}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.growth ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={fmtDate} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}
                labelFormatter={(v) => fmtDate(String(v))}
              />
              <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} fill="url(#aGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Deposits bar */}
        <ChartCard title="Daily Deposits" sub="Successful deposit amounts (₹) — last 30 days" loading={isLoading}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.deposits ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={fmtDate} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtINR(Number(v))} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}
                labelFormatter={(v) => fmtDate(String(v))}
                formatter={(v) => [fmtINR(Number(v)), "Amount"]}
              />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* KYC pie + finance summary */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* KYC distribution */}
        <ChartCard title="KYC Distribution" sub="Breakdown by verification status" loading={isLoading}>
          {kycPie.every((p) => p.value === 0) ? (
            <div className="flex h-52 items-center justify-center text-sm text-slate-400">No KYC data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={kycPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value"
                  label={false}
                  labelLine={false}>
                  {kycPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Finance summary */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
          <p className="text-sm font-bold text-slate-800 mb-0.5">Finance Summary</p>
          <p className="text-xs text-slate-500 mb-5">Platform-wide financial totals</p>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-50" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Total Deposits",    value: fmtINR(s?.deposits.total     ?? 0), sub: `${s?.deposits.totalCount ?? 0} transactions`,    color: "bg-emerald-50 text-emerald-700" },
                { label: "Successful",        value: fmtINR(s?.deposits.successful ?? 0), sub: `${s?.deposits.successCount ?? 0} transactions`,  color: "bg-green-50 text-green-700"   },
                { label: "Withdrawals",       value: fmtINR(s?.withdrawals.total   ?? 0), sub: `${s?.withdrawals.totalCount ?? 0} completed`,    color: "bg-orange-50 text-orange-700" },
                { label: "Active Investments",value: fmtINR(s?.investments.activeAmount ?? 0), sub: `${s?.investments.activeCount ?? 0} active plans`, color: "bg-violet-50 text-violet-700" },
                { label: "Wallet Balance",    value: fmtINR(s?.wallet.totalMainBalance ?? 0), sub: "all users combined",                        color: "bg-blue-50 text-blue-700"     },
              ].map((row) => (
                <div key={row.label} className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${row.color.split(" ")[0]}`}>
                  <div>
                    <p className={`text-sm font-bold ${row.color.split(" ")[1]}`}>{row.value}</p>
                    <p className="text-[11px] text-slate-500">{row.sub}</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">{row.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
