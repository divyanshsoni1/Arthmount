"use client";

import { Suspense, use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  ArrowLeft, Package, CheckCircle2, XCircle, Edit2,
  Trash2, StopCircle, PlayCircle, AlertTriangle, RefreshCw,
  AlertCircle, IndianRupee, Users, TrendingUp, Calendar,
  Clock, BarChart2, Activity, Search, ChevronLeft,
  ChevronRight, ChevronDown, Medal, Star, Zap,
} from "lucide-react";
import {
  useAdminPackage, usePackageAnalytics, useTopInvestors,
  usePackageInvestments, usePackageActivity,
  useUpdatePackage, useDeletePackage, useTogglePackage,
  extractPackageError,
  type AdminPackageDetail,
  type TopInvestor,
  type PackageActivityItem,
  type PackageInvestmentRow,
} from "@/api-client/packages";
import { useUser } from "@/api-client/user";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)    return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
function fmtAxisINR(v: number): string {
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(0)}L`;
  if (v >= 1_000)   return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v}`;
}

const TOOLTIP_STYLE = {
  fontSize: 12, borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(0,0,0,.08)",
  background: "#fff",
};

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, gradient, glow, index, loading,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; gradient: string; glow: string;
  index: number; loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100/80 shadow-sm hover:shadow-md p-5 transition-shadow"
    >
      <div className={`pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full ${glow} opacity-10 blur-xl group-hover:opacity-20 transition-opacity`} />
      <div className="relative">
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-md`}>
          <Icon size={18} className="text-white" aria-hidden="true" />
        </div>
        {loading ? (
          <div className="space-y-2">
            <Sk className="h-6 w-24" />
            <Sk className="h-3 w-16" />
          </div>
        ) : (
          <>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums leading-tight">{value}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
            {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────────

function ChartCard({
  title, sub, children, loading, minH = "h-56",
}: {
  title: string; sub?: string; children: React.ReactNode; loading?: boolean; minH?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl bg-white border border-slate-100/80 shadow-sm p-5"
    >
      <div className="mb-4">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {loading ? <Sk className={`${minH} w-full`} /> : children}
    </motion.div>
  );
}

// ─── Edit Package Modal ───────────────────────────────────────────────────────

function EditModal({ pkg, onClose }: { pkg: AdminPackageDetail; onClose: () => void }) {
  const update = useUpdatePackage(pkg.id);
  const [form, setForm] = useState({
    name:            pkg.name,
    description:     pkg.description ?? "",
    minAmount:       String(pkg.minAmount),
    maxAmount:       String(pkg.maxAmount),
    dailyReturnRate: String(pkg.dailyReturnRate),
    tenureDays:      String(pkg.tenureDays),
    isActive:        pkg.isActive,
    isVisible:       pkg.isVisible,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitErr, setSubmitErr] = useState("");

  function set(k: keyof typeof form, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim())                    e.name = "Package name is required.";
    const min = Number(form.minAmount), max = Number(form.maxAmount);
    if (min > 0 && max > 0 && max <= min)     e.maxAmount = "Maximum must be greater than minimum.";
    if (Number(form.dailyReturnRate) <= 0)    e.dailyReturnRate = "ROI must be positive.";
    if (Number(form.tenureDays) < 1)          e.tenureDays = "Tenure must be at least 1 day.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitErr("");
    try {
      await update.mutateAsync({
        name:            form.name.trim(),
        description:     form.description.trim() || undefined,
        minAmount:       Number(form.minAmount),
        maxAmount:       Number(form.maxAmount),
        dailyReturnRate: Number(form.dailyReturnRate),
        tenureDays:      Math.round(Number(form.tenureDays)),
        isActive:        form.isActive,
        isVisible:       form.isVisible,
      });
      onClose();
    } catch (err) { setSubmitErr(extractPackageError(err)); }
  }

  const inp = (k: string) =>
    `w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:ring-2 ${
      errors[k]
        ? "border-red-300 bg-red-50/40 focus:ring-red-200"
        : "border-slate-200 bg-slate-50 focus:border-emerald-400 focus:ring-emerald-100 focus:bg-white"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-pkg-title">
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.2 }} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 id="edit-pkg-title" className="text-sm font-bold text-slate-800 flex items-center gap-2"><Edit2 size={15} className="text-emerald-500" /> Edit Package</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors" aria-label="Close"><XCircle size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Package Name <span className="text-red-400">*</span></label>
              <input className={inp("name")} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} />
              {errors.name && <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
              <textarea className={`${inp("description")} resize-none`} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Min Amount (₹)</label>
                <input type="number" min={0} className={inp("minAmount")} value={form.minAmount} onChange={(e) => set("minAmount", e.target.value)} />
                {errors.minAmount && <p className="mt-1 text-[11px] text-red-500">{errors.minAmount}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Max Amount (₹)</label>
                <input type="number" min={0} className={inp("maxAmount")} value={form.maxAmount} onChange={(e) => set("maxAmount", e.target.value)} />
                {errors.maxAmount && <p className="mt-1 text-[11px] text-red-500">{errors.maxAmount}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Daily ROI (%)</label>
                <input type="number" step="0.01" min={0} className={inp("dailyReturnRate")} value={form.dailyReturnRate} onChange={(e) => set("dailyReturnRate", e.target.value)} />
                {errors.dailyReturnRate && <p className="mt-1 text-[11px] text-red-500">{errors.dailyReturnRate}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tenure (Days)</label>
                <input type="number" min={1} className={inp("tenureDays")} value={form.tenureDays} onChange={(e) => set("tenureDays", e.target.value)} />
                {errors.tenureDays && <p className="mt-1 text-[11px] text-red-500">{errors.tenureDays}</p>}
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 rounded accent-emerald-500" />
                <span className="text-xs font-semibold text-slate-600">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.isVisible} onChange={(e) => set("isVisible", e.target.checked)} className="h-4 w-4 rounded accent-emerald-500" />
                <span className="text-xs font-semibold text-slate-600">Visible to users</span>
              </label>
            </div>
            {submitErr && <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-600"><AlertCircle size={13} /> {submitErr}</div>}
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
            <button type="submit" disabled={update.isPending} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60 transition-all">
              {update.isPending ? <><RefreshCw size={12} className="animate-spin" /> Saving…</> : <><Edit2 size={12} /> Save Changes</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  title, message, confirmLabel, confirmClass, icon: Icon,
  onConfirm, onCancel, loading,
}: {
  title: string; message: string; confirmLabel: string;
  confirmClass: string; icon: React.ElementType;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }} className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mx-auto mb-4">
          <Icon size={22} className="text-red-500" />
        </div>
        <h2 id="confirm-title" className="text-sm font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-xs text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={loading} className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white disabled:opacity-60 transition-all ${confirmClass}`}>
            {loading ? <><RefreshCw size={12} className="animate-spin" /> Working…</> : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Analytics day-range filter ───────────────────────────────────────────────

const DAYS_OPTIONS = [
  { label: "7D",  value: 7   },
  { label: "30D", value: 30  },
  { label: "90D", value: 90  },
  { label: "1Y",  value: 365 },
];

function DaysFilter({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Analytics period">
      {DAYS_OPTIONS.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition-all ${
            value === o.value ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Top Investors Panel ──────────────────────────────────────────────────────

function TopInvestorsPanel({ investors, loading }: { investors: TopInvestor[]; loading: boolean }) {
  const MEDALS = ["🥇", "🥈", "🥉"];
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl bg-white border border-slate-100/80 shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <p className="text-sm font-bold text-slate-800">Top Investors</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Leaderboard · Top 10</p>
        </div>
        <Medal size={16} className="text-amber-400" aria-hidden="true" />
      </div>
      <div className="divide-y divide-slate-50 overflow-y-auto max-h-[420px]">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <Sk className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5"><Sk className="h-3 w-24" /><Sk className="h-2.5 w-16" /></div>
                <Sk className="h-4 w-14" />
              </div>
            ))
          : investors.length === 0
          ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Users size={24} className="text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">No investors yet</p>
            </div>
          )
          : investors.map((inv, i) => {
              const initials = inv.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Link
                  key={inv.userId}
                  href={`/admin/users/${inv.userId}`}
                  className="group flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                  aria-label={`View ${inv.name}'s profile`}
                >
                  <span className="text-base shrink-0 w-5">{MEDALS[i] ?? <span className="text-[11px] font-bold text-slate-400">#{i + 1}</span>}</span>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-[10px] font-bold text-slate-600 ring-2 ring-white">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-emerald-700 transition-colors">{inv.name}</p>
                    <p className="text-[10px] text-slate-400">{inv.investmentCount} investment{inv.investmentCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-800 tabular-nums">{fmtINR(inv.totalInvested)}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold">+{inv.growthPct}%</p>
                  </div>
                </Link>
              );
            })}
      </div>
    </motion.div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

const ACTIVITY_DOT: Record<string, string> = {
  investment: "bg-emerald-400",
  profit:     "bg-blue-400",
  audit:      "bg-slate-400",
};

function ActivityFeed({ items, loading }: { items: PackageActivityItem[]; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100/80 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <p className="text-sm font-bold text-slate-800">Recent Activity</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Latest package events</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          Live
        </span>
      </div>
      <div className="divide-y divide-slate-50/80 max-h-72 overflow-y-auto" role="log" aria-label="Activity feed" aria-live="polite">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <Sk className="h-2 w-2 rounded-full shrink-0 mt-1.5" />
                <div className="flex-1 space-y-1.5"><Sk className="h-3 w-40" /><Sk className="h-2.5 w-20" /></div>
              </div>
            ))
          : items.length === 0
          ? <div className="flex flex-col items-center py-8 text-center"><Zap size={20} className="text-slate-200 mb-2" /><p className="text-xs text-slate-400">No activity yet</p></div>
          : items.slice(0, 20).map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${ACTIVITY_DOT[item.type] ?? "bg-slate-300"}`} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-tight">{item.title}</p>
                  {item.amount !== null && <p className="text-[11px] font-semibold text-emerald-700 tabular-nums mt-0.5">{fmtINR(item.amount)}</p>}
                </div>
                <time dateTime={item.timestamp} className="shrink-0 text-[10px] text-slate-400">{fmtRelative(item.timestamp)}</time>
              </motion.div>
            ))}
      </div>
    </div>
  );
}

// ─── Investments Table ────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    "bg-emerald-50 text-emerald-700 border-emerald-100",
  MATURED:   "bg-blue-50   text-blue-700    border-blue-100",
  CANCELLED: "bg-red-50    text-red-600     border-red-100",
  WITHDRAWN: "bg-amber-50  text-amber-700   border-amber-100",
};

function InvestmentsTable({ packageId }: { packageId: string }) {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("latest");

  const { data, isLoading } = usePackageInvestments(packageId, { page, search, status, sortBy });
  const rows  = data?.investments ?? [];
  const pages = data?.pages       ?? 1;
  const total = data?.total       ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl bg-white border border-slate-100/80 shadow-sm overflow-hidden"
    >
      {/* Table header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div>
          <p className="text-sm font-bold text-slate-800">Investments</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{total} total investment{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search investor…" aria-label="Search investors"
              className="rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all w-44"
            />
          </div>
          <div className="relative">
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status"
              className="appearance-none rounded-xl border border-slate-200 pl-3 pr-7 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 cursor-pointer">
              {["ALL","ACTIVE","MATURED","CANCELLED","WITHDRAWN"].map((s) => <option key={s} value={s}>{s === "ALL" ? "All Status" : s}</option>)}
            </select>
            <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} aria-label="Sort by"
              className="appearance-none rounded-xl border border-slate-200 pl-3 pr-7 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 cursor-pointer">
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
              <option value="profit_desc">Most Profit</option>
            </select>
            <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" aria-label="Package investments">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["Investor","Amount","ROI","Progress","Profit","Status","Invested"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5"><Sk className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              : rows.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <BarChart2 size={22} className="text-slate-200" />
                      <p className="text-xs text-slate-400">No investments found</p>
                    </div>
                  </td>
                </tr>
              )
              : rows.map((row: PackageInvestmentRow, i: number) => (
                  <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-4 py-3.5">
                      <Link href={`/admin/users/${row.userId}`} className="flex items-center gap-2 group/link hover:text-emerald-700 transition-colors">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-[9px] font-bold text-slate-600">
                          {row.userName.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-700 group/link:text-emerald-700 leading-tight">{row.userName}</p>
                          {row.userEmail && <p className="text-[10px] text-slate-400 truncate max-w-[100px]">{row.userEmail}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800 tabular-nums whitespace-nowrap">{fmtINR(row.amount)}</td>
                    <td className="px-4 py-3.5 text-emerald-700 font-semibold whitespace-nowrap">{row.dailyReturnRate}%/day</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="relative h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                          <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-400" style={{ width: `${Math.min(100, (row.completedDays / row.tenureDays) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-500 tabular-nums">{row.completedDays}/{row.tenureDays}d</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-blue-700 tabular-nums whitespace-nowrap">{fmtINR(row.paidProfit)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${STATUS_BADGE[row.status] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{fmtDateShort(row.investedAt)}</td>
                  </motion.tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">Page {page} of {pages}</p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-all" aria-label="Previous"><ChevronLeft size={13} /></button>
            <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-all" aria-label="Next"><ChevronRight size={13} /></button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Detail page inner content ────────────────────────────────────────────────

function PackageDetailContent({ id }: { id: string }) {
  const router       = useRouter();
  const { user }     = useUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [days,      setDays]      = useState(30);
  const [showEdit,  setShowEdit]  = useState(false);
  const [confirm,   setConfirm]   = useState<"stop" | "activate" | "delete" | null>(null);

  const { data: pkg, isLoading: pkgLoading, isError: pkgError, refetch: refetchPkg } = useAdminPackage(id);
  const { data: analytics, isLoading: analyticsLoading } = usePackageAnalytics(id, days);
  const { data: investors,  isLoading: investorsLoading  } = useTopInvestors(id);
  const { data: activity,   isLoading: activityLoading   } = usePackageActivity(id);

  const togglePkg = useTogglePackage(id);
  const deletePkg = useDeletePackage();

  // ─── KPI cards data ─────────────────────────────────────────────────────────

  const kpiCards = useMemo(() => {
    if (!pkg) return [];
    return [
      { label: "Total Invested",     value: fmtINR(pkg.totalInvested),     sub: `${pkg.totalInvestors} investors`,   icon: IndianRupee,  gradient: "from-emerald-400 to-emerald-600", glow: "bg-emerald-400" },
      { label: "Active Investments", value: String(pkg.activeInvestments),  sub: "Currently running",                 icon: TrendingUp,   gradient: "from-blue-400 to-blue-600",       glow: "bg-blue-400"    },
      { label: "Total Profit Paid",  value: fmtINR(pkg.totalProfitPaid),    sub: "Distributed to investors",          icon: Star,         gradient: "from-violet-400 to-violet-600",   glow: "bg-violet-400"  },
      { label: "Pending Profit",     value: fmtINR(pkg.pendingProfit),      sub: "Awaiting distribution",             icon: Clock,        gradient: "from-amber-400 to-amber-500",     glow: "bg-amber-400"   },
      { label: "Avg Investment",     value: fmtINR(pkg.avgInvestment),      sub: "Per investor",                      icon: BarChart2,    gradient: "from-teal-400 to-teal-600",       glow: "bg-teal-400"    },
      { label: "Today's Investment", value: fmtINR(pkg.todayInvestment),    sub: `${pkg.todayInvestors} new today`,   icon: Calendar,     gradient: "from-orange-400 to-orange-500",   glow: "bg-orange-400"  },
      { label: "Daily ROI",          value: `${pkg.dailyReturnRate}%`,       sub: `${(pkg.dailyReturnRate * 365).toFixed(1)}% per year`, icon: Activity, gradient: "from-pink-400 to-pink-600", glow: "bg-pink-400" },
      { label: "Tenure",             value: `${pkg.tenureDays} days`,        sub: `≈${Math.round(pkg.tenureDays / 30)} months`,          icon: Clock,    gradient: "from-cyan-400 to-cyan-600",  glow: "bg-cyan-400" },
    ];
  }, [pkg]);

  // ─── Action handlers ─────────────────────────────────────────────────────────

  async function handleToggle(isActive: boolean) {
    await togglePkg.mutateAsync(isActive);
    setConfirm(null);
    refetchPkg();
  }

  async function handleDelete() {
    await deletePkg.mutateAsync(id);
    setConfirm(null);
    router.replace("/admin/packages");
  }

  // ─── Error / not found ───────────────────────────────────────────────────────

  if (pkgError) return (
    <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
      <AlertCircle size={36} className="text-red-300" />
      <p className="text-sm font-bold text-slate-700">Package not found or failed to load.</p>
      <Link href="/admin/packages" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
        <ArrowLeft size={13} /> Back to Packages
      </Link>
    </div>
  );

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin/packages" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors" aria-label="Back to packages">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            {pkgLoading ? (
              <div className="space-y-2"><Sk className="h-7 w-48" /><Sk className="h-4 w-32" /></div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">{pkg?.name}</h1>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                    pkg?.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-200"
                  }`}>
                    {pkg?.isActive ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                    {pkg?.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  {pkg?.dailyReturnRate}% daily · {pkg?.tenureDays} days · {fmtINR(pkg?.minAmount ?? 0)}–{fmtINR(pkg?.maxAmount ?? 0)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Actions — Super Admin only */}
        {isSuperAdmin && !pkgLoading && pkg && (
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400">
              <Edit2 size={13} /> Edit
            </button>
            {pkg.isActive ? (
              <button type="button" onClick={() => setConfirm("stop")}
                className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">
                <StopCircle size={13} /> Stop
              </button>
            ) : (
              <button type="button" onClick={() => setConfirm("activate")}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
                <PlayCircle size={13} /> Activate
              </button>
            )}
            <button type="button" onClick={() => setConfirm("delete")}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <section aria-labelledby="pkg-kpi-heading">
        <h2 id="pkg-kpi-heading" className="sr-only">Package metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {pkgLoading
            ? Array.from({ length: 8 }).map((_, i) => <Sk key={i} className="h-28 rounded-2xl" />)
            : kpiCards.map((c, i) => <KpiCard key={c.label} {...c} index={i} loading={pkgLoading} />)}
        </div>
      </section>

      {/* ── Charts + Right panel ── */}
      <section className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Left: charts */}
        <div className="xl:col-span-3 space-y-4">

          {/* Days filter */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analytics</p>
            <DaysFilter value={days} onChange={setDays} />
          </div>

          {/* Capital Growth */}
          <ChartCard title="Capital Growth" sub="Cumulative investment over time" loading={analyticsLoading} minH="h-64">
            {analytics?.capitalGrowth && (
              <ResponsiveContainer width="100%" height={256}>
                <AreaChart data={analytics.capitalGrowth} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="pkgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={fmtDateShort} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={fmtAxisINR} axisLine={false} tickLine={false} width={56} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => fmtDateShort(String(v))} formatter={(v) => [fmtINR(Number(v)), "Invested"]} />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5} fill="url(#pkgGrad)" dot={false} activeDot={{ r: 5, fill: "#10b981", strokeWidth: 0 }} isAnimationActive />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Investment Trend + Investor Growth */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Investment Trend" sub="Daily new investments" loading={analyticsLoading} minH="h-48">
              {analytics?.capitalGrowth && (
                <ResponsiveContainer width="100%" height={192}>
                  <LineChart data={analytics.capitalGrowth} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={fmtDateShort} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => fmtDateShort(String(v))} formatter={(v) => [Number(v), "Investments"]} />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }} isAnimationActive />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Investor Growth" sub="New unique investors per day" loading={analyticsLoading} minH="h-48">
              {analytics?.investorGrowth && (
                <ResponsiveContainer width="100%" height={192}>
                  <BarChart data={analytics.investorGrowth} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={fmtDateShort} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => fmtDateShort(String(v))} formatter={(v) => [Number(v), "New Investors"]} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[5, 5, 0, 0]} maxBarSize={32} isAnimationActive />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Profit Distribution + Investment Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Profit Distribution" sub="Paid vs pending vs projected" loading={analyticsLoading} minH="h-52">
              {analytics?.profitDistribution && analytics.profitDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={208}>
                  <PieChart>
                    <Pie data={analytics.profitDistribution} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={52} outerRadius={80} paddingAngle={3} isAnimationActive>
                      {analytics.profitDistribution.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtINR(Number(v))} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center gap-2"><BarChart2 size={24} className="text-slate-200" /><p className="text-xs text-slate-400">No profit data</p></div>
              )}
            </ChartCard>

            <ChartCard title="Investment Distribution" sub="Breakdown by investment size" loading={analyticsLoading} minH="h-52">
              {analytics?.investmentDistribution && (
                <ResponsiveContainer width="100%" height={208}>
                  <BarChart data={analytics.investmentDistribution} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [Number(v), "Investors"]} />
                    <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={40} isAnimationActive>
                      {analytics.investmentDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Investments table */}
          <InvestmentsTable packageId={id} />
        </div>

        {/* Right panel: investors + activity */}
        <div className="xl:col-span-1 space-y-4 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
          <TopInvestorsPanel investors={investors ?? []} loading={investorsLoading} />
          <ActivityFeed items={activity ?? []} loading={activityLoading} />
        </div>
      </section>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showEdit && pkg && <EditModal pkg={pkg} onClose={() => setShowEdit(false)} />}
        {confirm === "stop" && (
          <ConfirmDialog
            title="Stop Package?" message="New investments will be blocked. Existing investments continue running."
            confirmLabel="Stop Package" confirmClass="bg-amber-500 hover:bg-amber-600"
            icon={AlertTriangle}
            onConfirm={() => handleToggle(false)}
            onCancel={() => setConfirm(null)}
            loading={togglePkg.isPending}
          />
        )}
        {confirm === "activate" && (
          <ConfirmDialog
            title="Activate Package?" message="This package will become available for new investments immediately."
            confirmLabel="Activate" confirmClass="bg-emerald-500 hover:bg-emerald-600"
            icon={PlayCircle}
            onConfirm={() => handleToggle(true)}
            onCancel={() => setConfirm(null)}
            loading={togglePkg.isPending}
          />
        )}
        {confirm === "delete" && (
          <ConfirmDialog
            title="Delete Package?" message="This action cannot be undone. The package will be permanently removed."
            confirmLabel="Delete Package" confirmClass="bg-red-500 hover:bg-red-600"
            icon={Trash2}
            onConfirm={handleDelete}
            onCancel={() => setConfirm(null)}
            loading={deletePkg.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3"><Sk className="h-9 w-9 rounded-xl" /><div className="space-y-2"><Sk className="h-7 w-48" /><Sk className="h-4 w-32" /></div></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">{Array.from({ length: 8 }).map((_, i) => <Sk key={i} className="h-28 rounded-2xl" />)}</div>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4"><div className="xl:col-span-3 space-y-4"><Sk className="h-72 rounded-2xl" /><div className="grid grid-cols-2 gap-4"><Sk className="h-52 rounded-2xl" /><Sk className="h-52 rounded-2xl" /></div></div><Sk className="h-96 rounded-2xl" /></div>
      </div>
    }>
      <PackageDetailContent id={id} />
    </Suspense>
  );
}
