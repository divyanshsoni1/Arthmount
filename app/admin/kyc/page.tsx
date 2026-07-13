"use client";

import { useState, useCallback, useRef } from "react";
import Link                from "next/link";
import { useAdminKycList } from "@/api-client/admin";
import {
  BadgeCheck, ChevronLeft, ChevronRight, Clock,
  Eye, ShieldX, AlertTriangle, Search, X, FileCheck,
  RefreshCw, SlidersHorizontal,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | "IN_REVIEW" | "PENDING" | "APPROVED" | "REJECTED";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_TABS: { value: StatusFilter; label: string; color: string }[] = [
  { value: "ALL",       label: "All",       color: "slate"   },
  { value: "IN_REVIEW", label: "In Review", color: "blue"    },
  { value: "PENDING",   label: "Pending",   color: "amber"   },
  { value: "APPROVED",  label: "Approved",  color: "emerald" },
  { value: "REJECTED",  label: "Rejected",  color: "red"     },
];

const STATUS_STYLE: Record<string, { badge: string; icon: React.ElementType; dot: string }> = {
  PENDING:       { badge: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock,          dot: "bg-amber-400"  },
  IN_REVIEW:     { badge: "bg-blue-50 text-blue-700 border-blue-200",      icon: AlertTriangle,  dot: "bg-blue-400"   },
  APPROVED:      { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: BadgeCheck, dot: "bg-emerald-400" },
  AUTO_APPROVED: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: BadgeCheck, dot: "bg-emerald-400" },
  REJECTED:      { badge: "bg-red-50 text-red-700 border-red-200",         icon: ShieldX,        dot: "bg-red-400"    },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-orange-500", "bg-pink-500", "bg-cyan-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full ${color} font-bold text-white ${sz}`}>
      {initials}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
        <FileCheck size={28} className="text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-700">
        {filtered ? "No matching KYC records" : "No KYC submissions yet"}
      </p>
      <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
        {filtered
          ? "Try adjusting your search or status filter."
          : "KYC submissions will appear here once users start verifying."}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminKycPage() {
  const [status,  setStatus]  = useState<StatusFilter>("IN_REVIEW");
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState("");
  const [query,   setQuery]   = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, refetch } = useAdminKycList(status, page, query);
  const records = data?.records ?? [];

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(val);
      setPage(1);
    }, 400);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch("");
    setQuery("");
    setPage(1);
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">KYC Requests</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {data ? `${data.total.toLocaleString("en-IN")} total records` : "Review and verify user KYC submissions."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, email, Aadhaar, PAN…"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
          />
          {search && (
            <button type="button" onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setStatus(tab.value); setPage(1); }}
              className={[
                "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold border transition-all duration-150",
                status === tab.value
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              {tab.label}
              {data && status === tab.value && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${status === tab.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {data.total}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex ml-auto items-center gap-1.5 text-xs text-slate-400">
          <SlidersHorizontal size={12} />
          <span>Filters applied</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">User</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Contact</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Documents</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Submitted</th>
                <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-28 animate-pulse rounded bg-slate-100" />
                          <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
                        </div>
                      </div>
                    </td>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6}><EmptyState filtered={!!(search || status !== "ALL")} /></td>
                </tr>
              ) : (
                records.map((r) => {
                  const style = STATUS_STYLE[r.status] ?? STATUS_STYLE.PENDING;
                  const Icon  = style.icon;
                  const hasAll5 = !!(r.aadhaarFrontUrl && r.aadhaarBackUrl && r.panFrontUrl && r.selfieUrl);
                  return (
                    <tr key={r.id} className="border-b border-slate-50/80 hover:bg-slate-50/60 transition-colors group">

                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.user.name ?? "?"} />
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{r.user.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{r.user.id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-slate-700 truncate max-w-[160px]">{r.user.email ?? "—"}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{r.user.phone ?? "—"}</p>
                      </td>

                      {/* Documents */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {[
                            { label: "AF", url: r.aadhaarFrontUrl, title: "Aadhaar Front" },
                            { label: "AB", url: r.aadhaarBackUrl,  title: "Aadhaar Back"  },
                            { label: "PF", url: r.panFrontUrl,     title: "PAN Front"      },
                            { label: "SL", url: r.selfieUrl,       title: "Selfie"         },
                          ].map(({ label, url, title }) => (
                            <span
                              key={label}
                              title={title}
                              className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${url ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{hasAll5 ? "All uploaded" : "Incomplete"}</p>
                      </td>

                      {/* Submitted */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-xs text-slate-700">{fmtDate(r.createdAt)}</p>
                        {r.aadhaarNumber && (
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {r.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          <Icon size={10} />
                          {r.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-center">
                        <Link
                          href={`/admin/kyc/${r.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors shadow-sm"
                        >
                          <Eye size={12} />
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(data?.pages ?? 0) > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-700">{page}</span> of <span className="font-semibold text-slate-700">{data?.pages}</span>
              {data && <> — {data.total.toLocaleString("en-IN")} records</>}
            </span>
            <div className="flex gap-1.5">
              <button type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, data?.pages ?? 0) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > (data?.pages ?? 1)) return null;
                return (
                  <button key={p} type="button"
                    onClick={() => setPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${p === page ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
                    {p}
                  </button>
                );
              })}
              <button type="button"
                onClick={() => setPage((p) => Math.min(data!.pages, p + 1))}
                disabled={page === data?.pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
