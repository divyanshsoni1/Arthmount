"use client";

import { useState, useCallback, useRef } from "react";
import Link                               from "next/link";
import { useAdminUserList }               from "@/api-client/admin";
import {
  ChevronLeft, ChevronRight, Eye, Search, X,
  UserCheck, UserX, Shield, Users, SlidersHorizontal,
  Download, RefreshCw, UserPlus, Activity,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const ROLE_FILTERS = [
  { value: "ALL",         label: "All Roles"  },
  { value: "USER",        label: "User"       },
  { value: "AGENT",       label: "Agent"      },
  { value: "ADMIN",       label: "Admin"      },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "SUPPORT",     label: "Support"    },
];

const KYC_BADGE: Record<string, string> = {
  PENDING:       "bg-amber-50 text-amber-700 border-amber-200",
  IN_REVIEW:     "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  AUTO_APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED:      "bg-red-50 text-red-700 border-red-200",
};

const ROLE_STYLE: Record<string, string> = {
  USER:        "bg-slate-100 text-slate-600",
  AGENT:       "bg-violet-100 text-violet-700",
  ADMIN:       "bg-blue-100 text-blue-700",
  SUPER_ADMIN: "bg-rose-100 text-rose-700",
  SUPPORT:     "bg-teal-100 text-teal-700",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-orange-500", "bg-pink-500", "bg-cyan-500", "bg-indigo-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color} text-white text-[11px] font-bold`}>
      {initials}
    </div>
  );
}

function EmptyState({ query }: { query: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-4">
        <Users size={24} className="text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{query ? "No users found" : "No users yet"}</p>
      <p className="text-xs text-slate-400 mt-1.5">
        {query ? "Try a different search or filter." : "Users will appear here once they register."}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [search,    setSearch]    = useState("");
  const [query,     setQuery]     = useState("");
  const [role,      setRole]      = useState("ALL");
  const [page,      setPage]      = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, refetch } = useAdminUserList(query, role, page);
  const users = data?.users ?? [];

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setQuery(val); setPage(1); }, 400);
  }, []);

  const clearSearch = useCallback(() => { setSearch(""); setQuery(""); setPage(1); }, []);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Users</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {data ? `${data.total.toLocaleString("en-IN")} total users` : "Manage platform users"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button type="button"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <Download size={12} />
            Export
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Users",   value: data?.total           ?? "…", icon: Users,     color: "text-blue-600",    bg: "bg-blue-50" },
          { label: "Shown",         value: users.length,                  icon: Activity,  color: "text-slate-600",   bg: "bg-slate-100" },
          { label: "Active",        value: users.filter((u) => !u.isFrozen).length, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Frozen",        value: users.filter((u) => u.isFrozen).length,  icon: UserX,    color: "text-red-600",     bg: "bg-red-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon size={15} className={color} />
            </div>
            <div>
              <p className={`text-lg font-extrabold tabular-nums ${color}`}>{value}</p>
              <p className="text-[11px] text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, email or phone…"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
          />
          {search && (
            <button type="button" onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Role filters */}
        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((f) => (
            <button key={f.value} type="button"
              onClick={() => { setRole(f.value); setPage(1); }}
              className={[
                "rounded-xl px-3.5 py-1.5 text-xs font-semibold border transition-all duration-150",
                role === f.value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex ml-auto items-center gap-1.5 text-xs text-slate-400">
          <SlidersHorizontal size={12} />
          <span>Filters active</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {["User", "Contact", "Role", "KYC Status", "Balance", "Account", "Joined", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
                        <div className="h-3.5 w-28 animate-pulse rounded bg-slate-100" />
                      </div>
                    </td>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={8}><EmptyState query={!!(search || role !== "ALL")} /></td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50/80 hover:bg-slate-50/60 transition-colors group">

                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name ?? "?"} />
                        <div>
                          <p className="font-semibold text-slate-900 text-sm truncate max-w-[130px]">{u.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{u.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-700 truncate max-w-[160px]">{u.email ?? "—"}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{u.phone ?? "—"}</p>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ROLE_STYLE[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                        <Shield size={9} />
                        {u.role.replace("_", " ")}
                      </span>
                    </td>

                    {/* KYC */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${KYC_BADGE[u.kycStatus] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
                        {u.kycStatus.replace("_", " ")}
                      </span>
                    </td>

                    {/* Balance */}
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-bold text-slate-800 tabular-nums">{fmtINR(u.mainBalance)}</p>
                      <p className="text-[11px] text-emerald-600 mt-0.5 tabular-nums">+{fmtINR(u.investedBalance)} inv</p>
                    </td>

                    {/* Account status */}
                    <td className="px-5 py-3.5">
                      {u.isFrozen ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                          <UserX size={10} /> Frozen
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <UserCheck size={10} /> Active
                        </span>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="text-xs text-slate-600">{fmtDate(u.createdAt)}</p>
                      {u.lastLoginAt && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Last: {fmtDate(u.lastLoginAt)}</p>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/users/${u.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors shadow-sm">
                        <Eye size={12} /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(data?.pages ?? 0) > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-700">{page}</span> of <span className="font-semibold">{data?.pages}</span>
              {data && <> — {data.total.toLocaleString("en-IN")} users</>}
            </span>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, data?.pages ?? 0) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > (data?.pages ?? 1)) return null;
                return (
                  <button key={p} type="button" onClick={() => setPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${p === page ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
                    {p}
                  </button>
                );
              })}
              <button type="button" onClick={() => setPage((p) => Math.min(data!.pages, p + 1))} disabled={page === data?.pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
