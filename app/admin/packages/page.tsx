"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, SlidersHorizontal, X, Package,
  TrendingUp, Users, IndianRupee, Calendar,
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
  BarChart2, ArrowUpRight, CheckCircle2, XCircle,
  ChevronDown,
} from "lucide-react";
import {
  useAdminPackages,
  type AdminPackage,
  type PackageSortBy,
  type PackageStatusFilter,
  useCreatePackage,
  extractPackageError,
} from "@/api-client/packages";
import { useUser } from "@/api-client/user";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

// ─── Sort options ─────────────────────────────────────────────────────────────

const SORT_OPTIONS: { label: string; value: PackageSortBy }[] = [
  { label: "Latest",            value: "latest"            },
  { label: "Oldest",            value: "oldest"            },
  { label: "Highest Investment",value: "highestInvestment" },
  { label: "Lowest Investment", value: "lowestInvestment"  },
  { label: "Most Investors",    value: "mostInvestors"     },
  { label: "Least Investors",   value: "leastInvestors"    },
];

// ─── Create Package Modal ─────────────────────────────────────────────────────

interface CreateModalProps { onClose: () => void; onCreated: () => void }

function CreatePackageModal({ onClose, onCreated }: CreateModalProps) {
  const create = useCreatePackage();
  const [form, setForm] = useState({
    name: "", description: "", minAmount: "", maxAmount: "",
    dailyReturnRate: "", tenureDays: "", isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitErr, setSubmitErr] = useState("");

  function set(k: keyof typeof form, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim())                   e.name = "Package name is required.";
    if (!form.minAmount)                     e.minAmount = "Minimum amount required.";
    if (!form.maxAmount)                     e.maxAmount = "Maximum amount required.";
    const min = Number(form.minAmount), max = Number(form.maxAmount);
    if (min > 0 && max > 0 && max <= min)    e.maxAmount = "Maximum must be greater than minimum.";
    if (!form.dailyReturnRate)               e.dailyReturnRate = "Daily ROI is required.";
    if (Number(form.dailyReturnRate) <= 0)   e.dailyReturnRate = "ROI must be positive.";
    if (!form.tenureDays)                    e.tenureDays = "Tenure is required.";
    if (Number(form.tenureDays) < 1)         e.tenureDays = "Tenure must be at least 1 day.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitErr("");
    try {
      await create.mutateAsync({
        name:            form.name.trim(),
        description:     form.description.trim() || undefined,
        minAmount:       Number(form.minAmount),
        maxAmount:       Number(form.maxAmount),
        dailyReturnRate: Number(form.dailyReturnRate),
        tenureDays:      Math.round(Number(form.tenureDays)),
        isActive:        form.isActive,
      });
      onCreated();
      onClose();
    } catch (err) {
      setSubmitErr(extractPackageError(err));
    }
  }

  const inputCls = (k: string) =>
    `w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:ring-2 ${
      errors[k]
        ? "border-red-300 bg-red-50/40 focus:ring-red-200"
        : "border-slate-200 bg-slate-50 focus:border-emerald-400 focus:ring-emerald-100 focus:bg-white"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="create-pkg-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md">
              <Package size={16} className="text-white" />
            </div>
            <div>
              <h2 id="create-pkg-title" className="text-sm font-bold text-slate-800">Create Package</h2>
              <p className="text-[11px] text-slate-400">New investment plan</p>
            </div>
          </div>
          <button
            type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Package Name <span className="text-red-400">*</span></label>
              <input className={inputCls("name")} placeholder="e.g. Gold Plan" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} />
              {errors.name && <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>}
            </div>
            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description <span className="text-slate-300">(optional)</span></label>
              <textarea className={`${inputCls("description")} resize-none`} rows={2} placeholder="Brief description…" value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />
            </div>
            {/* Min / Max */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Min Amount (₹) <span className="text-red-400">*</span></label>
                <input type="number" min={0} className={inputCls("minAmount")} placeholder="10000" value={form.minAmount} onChange={(e) => set("minAmount", e.target.value)} />
                {errors.minAmount && <p className="mt-1 text-[11px] text-red-500">{errors.minAmount}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Max Amount (₹) <span className="text-red-400">*</span></label>
                <input type="number" min={0} className={inputCls("maxAmount")} placeholder="500000" value={form.maxAmount} onChange={(e) => set("maxAmount", e.target.value)} />
                {errors.maxAmount && <p className="mt-1 text-[11px] text-red-500">{errors.maxAmount}</p>}
              </div>
            </div>
            {/* ROI / Tenure */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Daily ROI (%) <span className="text-red-400">*</span></label>
                <input type="number" step="0.01" min={0} className={inputCls("dailyReturnRate")} placeholder="1.5" value={form.dailyReturnRate} onChange={(e) => set("dailyReturnRate", e.target.value)} />
                {errors.dailyReturnRate && <p className="mt-1 text-[11px] text-red-500">{errors.dailyReturnRate}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tenure (Days) <span className="text-red-400">*</span></label>
                <input type="number" min={1} className={inputCls("tenureDays")} placeholder="30" value={form.tenureDays} onChange={(e) => set("tenureDays", e.target.value)} />
                {errors.tenureDays && <p className="mt-1 text-[11px] text-red-500">{errors.tenureDays}</p>}
              </div>
            </div>
            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Initial Status</label>
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)} type="button"
                    onClick={() => set("isActive", v)}
                    className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                      form.isActive === v
                        ? v ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-600"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {v ? "Active" : "Inactive"}
                  </button>
                ))}
              </div>
            </div>
            {submitErr && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-600">
                <AlertCircle size={13} /> {submitErr}
              </div>
            )}
          </div>
          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
            <button
              type="submit" disabled={create.isPending}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              {create.isPending ? <><RefreshCw size={12} className="animate-spin" /> Creating…</> : <><Plus size={12} /> Create Package</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Package Card ─────────────────────────────────────────────────────────────

function PackageCard({ pkg, index }: { pkg: AdminPackage; index: number }) {
  const roiAnnual = (pkg.dailyReturnRate * 365).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <Link
        href={`/admin/packages/${pkg.id}`}
        className="group block rounded-2xl bg-white border border-slate-100/80 shadow-sm hover:shadow-lg hover:border-emerald-100 transition-all duration-200 p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        aria-label={`View ${pkg.name} package details`}
      >
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-200/50">
              <Package size={17} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                {pkg.name}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{pkg.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border ${
              pkg.isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-slate-50 text-slate-500 border-slate-200"
            }`}>
              {pkg.isActive
                ? <CheckCircle2 size={9} className="text-emerald-500" />
                : <XCircle size={9} className="text-slate-400" />}
              {pkg.isActive ? "Active" : "Inactive"}
            </span>
            <ArrowUpRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Min – Max</p>
            <p className="text-xs font-bold text-slate-700 tabular-nums">
              {fmtINR(pkg.minAmount)} – {fmtINR(pkg.maxAmount)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-0.5">Daily ROI</p>
            <p className="text-xs font-bold text-emerald-700 tabular-nums">
              {pkg.dailyReturnRate}% <span className="font-normal text-emerald-400">({roiAnnual}% p.a.)</span>
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Tenure</p>
            <p className="text-xs font-bold text-slate-700">{pkg.tenureDays} days</p>
          </div>
          <div className="rounded-xl bg-blue-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-0.5">Total Invested</p>
            <p className="text-xs font-bold text-blue-700 tabular-nums">{fmtINR(pkg.totalInvested)}</p>
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Users size={11} className="text-slate-400" />
              <span className="font-semibold text-slate-700">{pkg.totalInvestors}</span> investors
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <TrendingUp size={11} className="text-emerald-400" />
              <span className="font-semibold text-emerald-700">{pkg.activeInvestors}</span> active
            </span>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Calendar size={9} />
            {fmtDate(pkg.createdAt)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Filter toolbar ───────────────────────────────────────────────────────────

interface FilterBarProps {
  search:   string; onSearch:  (v: string) => void;
  status:   PackageStatusFilter; onStatus:  (v: PackageStatusFilter) => void;
  sortBy:   PackageSortBy;       onSortBy:  (v: PackageSortBy) => void;
  onReset:  () => void;
  isDirty:  boolean;
}

function FilterBar({ search, onSearch, status, onStatus, sortBy, onSortBy, onReset, isDirty }: FilterBarProps) {
  const STATUS_OPTS: { label: string; value: PackageStatusFilter }[] = [
    { label: "All",      value: "ALL"      },
    { label: "Active",   value: "ACTIVE"   },
    { label: "Inactive", value: "INACTIVE" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative min-w-[200px] flex-1 sm:flex-none sm:w-64">
        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search packages…"
          aria-label="Search packages"
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
        />
      </div>

      {/* Status filter */}
      <div
        role="group"
        aria-label="Filter by status"
        className="flex items-center gap-1 rounded-xl bg-slate-100 p-1"
      >
        {STATUS_OPTS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onStatus(opt.value)}
            aria-pressed={status === opt.value}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
              status === opt.value
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="relative">
        <SlidersHorizontal size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <select
          value={sortBy}
          onChange={(e) => onSortBy(e.target.value as PackageSortBy)}
          aria-label="Sort packages"
          className="appearance-none rounded-xl border border-slate-200 bg-white pl-8 pr-8 py-2 text-[11px] font-semibold text-slate-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 cursor-pointer transition-all"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {/* Reset */}
      {isDirty && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all"
          aria-label="Reset filters"
        >
          <X size={11} /> Reset
        </button>
      )}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-slate-400">Page {page} of {pages}</p>
      <div className="flex items-center gap-1">
        <button
          type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          const p = pages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= pages - 3 ? pages - 6 + i : page - 3 + i;
          return (
            <button
              key={p} type="button" onClick={() => onPage(p)}
              className={`h-8 w-8 rounded-xl text-xs font-semibold transition-all ${
                p === page
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-200"
                  : "border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button" onClick={() => onPage(page + 1)} disabled={page >= pages}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, isSuperAdmin, onCreate }: { hasFilters: boolean; isSuperAdmin: boolean; onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-8 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Package size={24} className="text-slate-300" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-700">
          {hasFilters ? "No packages match your filters" : "No packages yet"}
        </p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          {hasFilters
            ? "Try adjusting your search or filter criteria."
            : "Create your first investment package to get started."}
        </p>
      </div>
      {!hasFilters && isSuperAdmin && (
        <button
          type="button" onClick={onCreate}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:from-emerald-600 hover:to-emerald-700 transition-all"
        >
          <Plus size={13} /> Create Package
        </button>
      )}
    </motion.div>
  );
}

// ─── Main content (needs Suspense for useSearchParams) ────────────────────────

function PackagesContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user }     = useUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // State — initialise from URL params
  const [search,  setSearch]  = useState(searchParams.get("search")  ?? "");
  const [status,  setStatus]  = useState<PackageStatusFilter>((searchParams.get("status") as PackageStatusFilter) ?? "ALL");
  const [sortBy,  setSortBy]  = useState<PackageSortBy>((searchParams.get("sortBy") as PackageSortBy) ?? "latest");
  const [page,    setPage]    = useState(Number(searchParams.get("page") ?? 1));
  const [showCreate, setShowCreate] = useState(false);

  const isDirty = search !== "" || status !== "ALL" || sortBy !== "latest";

  // Sync state → URL
  const syncUrl = useCallback((overrides: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(overrides).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleSearch  = useCallback((v: string) => { setSearch(v); setPage(1); syncUrl({ search: v, page: "" }); }, [syncUrl]);
  const handleStatus  = useCallback((v: PackageStatusFilter) => { setStatus(v); setPage(1); syncUrl({ status: v === "ALL" ? "" : v, page: "" }); }, [syncUrl]);
  const handleSortBy  = useCallback((v: PackageSortBy)       => { setSortBy(v); setPage(1); syncUrl({ sortBy: v === "latest" ? "" : v, page: "" }); }, [syncUrl]);
  const handlePage    = useCallback((v: number)              => { setPage(v);  syncUrl({ page: v === 1 ? "" : String(v) }); }, [syncUrl]);
  const handleReset   = useCallback(() => { setSearch(""); setStatus("ALL"); setSortBy("latest"); setPage(1); router.replace("?", { scroll: false }); }, [router]);

  const { data, isLoading, isError, refetch } = useAdminPackages({ search, status, sortBy, page });
  const packages = data?.packages ?? [];
  const pages    = data?.pages    ?? 1;
  const total    = data?.total    ?? 0;

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight">Packages</h1>
          <p className="text-sm text-slate-400 mt-1">Manage investment plans offered to investors.</p>
        </div>
        {isSuperAdmin && (
          <motion.button
            type="button"
            onClick={() => setShowCreate(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-200 hover:from-emerald-600 hover:to-emerald-700 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 self-start"
            aria-label="Create new package"
          >
            <Plus size={15} /> Create Package
          </motion.button>
        )}
      </div>

      {/* Filter bar */}
      <FilterBar
        search={search}   onSearch={handleSearch}
        status={status}   onStatus={handleStatus}
        sortBy={sortBy}   onSortBy={handleSortBy}
        onReset={handleReset}
        isDirty={isDirty}
      />

      {/* Results summary */}
      {!isLoading && !isError && (
        <p className="text-xs text-slate-400">
          {total === 0 ? "No packages found" : `Showing ${packages.length} of ${total} package${total !== 1 ? "s" : ""}`}
        </p>
      )}

      {/* Error */}
      {isError && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-5 py-4"
          role="alert"
        >
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-700 flex-1">Failed to load packages.</p>
          <button type="button" onClick={() => refetch()} className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
            <RefreshCw size={11} /> Retry
          </button>
        </motion.div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Sk className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Sk className="h-4 w-28" />
                  <Sk className="h-3 w-16" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, j) => <Sk key={j} className="h-14 rounded-xl" />)}
              </div>
              <Sk className="h-8" />
            </div>
          ))}
        </div>
      )}

      {/* Package grid */}
      {!isLoading && !isError && packages.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {packages.map((pkg, i) => (
              <PackageCard key={pkg.id} pkg={pkg} index={i} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Empty */}
      {!isLoading && !isError && packages.length === 0 && (
        <EmptyState hasFilters={isDirty} isSuperAdmin={isSuperAdmin} onCreate={() => setShowCreate(true)} />
      )}

      {/* Pagination */}
      {!isLoading && !isError && (
        <Pagination page={page} pages={pages} onPage={handlePage} />
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreatePackageModal
            onClose={() => setShowCreate(false)}
            onCreated={() => refetch()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function PackagesPage() {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-start justify-between">
          <div className="space-y-2"><Sk className="h-8 w-36" /><Sk className="h-4 w-64" /></div>
          <Sk className="h-10 w-36 rounded-2xl" />
        </div>
        <div className="flex gap-3"><Sk className="h-9 w-64 rounded-xl" /><Sk className="h-9 w-40 rounded-xl" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Sk key={i} className="h-52 rounded-2xl" />)}
        </div>
      </div>
    }>
      <PackagesContent />
    </Suspense>
  );
}
