"use client";

import { useState, useCallback }   from "react";
import Link                         from "next/link";
import { useAdminUserList }         from "@/api-client/admin";
import {
  ChevronLeft, ChevronRight, Eye, Search, X,
} from "lucide-react";

const ROLE_FILTERS = [
  { value: "ALL",        label: "All Roles"  },
  { value: "USER",       label: "User"       },
  { value: "AGENT",      label: "Agent"      },
  { value: "ADMIN",      label: "Admin"      },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "SUPPORT",    label: "Support"    },
];

const KYC_BADGE: Record<string, string> = {
  PENDING:      "bg-amber-100 text-amber-700",
  IN_REVIEW:    "bg-blue-100 text-blue-700",
  APPROVED:     "bg-emerald-100 text-emerald-700",
  AUTO_APPROVED:"bg-emerald-100 text-emerald-700",
  REJECTED:     "bg-red-100 text-red-700",
};

function fmtINR(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "Never logged in";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [role,   setRole]   = useState("ALL");
  const [page,   setPage]   = useState(1);
  const [query,  setQuery]  = useState("");   // debounced search applied to API

  const { data, isLoading } = useAdminUserList(query, role, page);
  const users = data?.users ?? [];

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
    // Simple debounce — just apply on Enter or 0.5s idle
    const t = setTimeout(() => setQuery(v), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {data ? `${data.total.toLocaleString("en-IN")} total users` : "Loading..."}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, email or phone..."
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
          {search && (
            <button type="button" onClick={() => { setSearch(""); setQuery(""); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Role filter */}
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((f) => (
            <button key={f.value} type="button"
              onClick={() => { setRole(f.value); setPage(1); }}
              className={[
                "rounded-xl px-3.5 py-1.5 text-xs font-semibold border transition-all",
                role === f.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["User", "Contact", "Role", "KYC", "Balance", "Status", "Joined", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                          {u.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <p className="font-semibold text-slate-900 text-sm truncate max-w-[120px]">{u.name}</p>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-600 truncate max-w-[160px]">{u.email ?? "—"}</p>
                      <p className="text-xs text-slate-500">{u.phone ?? "—"}</p>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        {u.role}
                      </span>
                    </td>
                    {/* KYC */}
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${KYC_BADGE[u.kycStatus] ?? "bg-slate-100 text-slate-500"}`}>
                        {u.kycStatus.replace("_", " ")}
                      </span>
                    </td>
                    {/* Balance */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-800">{fmtINR(u.mainBalance)}</p>
                      <p className="text-[11px] text-slate-400">+{fmtINR(u.investedBalance)} inv.</p>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      {u.isFrozen ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">Frozen</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">Active</span>
                      )}
                    </td>
                    {/* Joined */}
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDate(u.createdAt)}
                    </td>
                    {/* Action */}
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-primary/40 hover:text-primary transition-colors">
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">Page {page} of {data?.pages}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft size={15} />
              </button>
              <button type="button" onClick={() => setPage((p) => Math.min(data!.pages, p + 1))} disabled={page === data?.pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
