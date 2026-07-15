"use client";

import { useState, useCallback, useRef } from "react";
import {
  Search, X, SlidersHorizontal, ChevronLeft, ChevronRight,
  Building2, Smartphone, Eye, RefreshCw, ArrowUpDown,
} from "lucide-react";
import {
  useAdminWithdrawals,
  type AdminWithdrawalRow,
  type AdminWithdrawalListParams,
} from "@/api-client/admin";
import { WITHDRAWAL_STATUS_CONFIG } from "@/api-client/withdraw";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(v: string | number): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "₹0";
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-violet-500","bg-blue-500","bg-emerald-500","bg-orange-500","bg-pink-500","bg-cyan-500","bg-indigo-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color} text-[11px] font-bold text-white`}>
      {initials}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = WITHDRAWAL_STATUS_CONFIG[status as keyof typeof WITHDRAWAL_STATUS_CONFIG]
    ?? { cls: "bg-slate-100 text-slate-500", dotColor: "bg-slate-400", label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

// ─── Status tabs ──────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: "ALL",        label: "All"        },
  { value: "PENDING",    label: "Pending"    },
  { value: "APPROVED",   label: "Approved"   },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED",  label: "Completed"  },
  { value: "REJECTED",   label: "Rejected"   },
  { value: "CANCELLED",  label: "Cancelled"  },
];

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-4">
        <ArrowUpDown size={22} className="text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-600">
        {filtered ? "No withdrawals match your filters" : "No withdrawal requests yet"}
      </p>
      <p className="text-xs text-slate-400 mt-1">
        {filtered ? "Try clearing search or filters." : "Withdrawal requests will appear here."}
      </p>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onRowClick: (row: AdminWithdrawalRow) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WithdrawalsTable({ onRowClick }: Props) {
  const [status,    setStatus]    = useState("ALL");
  const [method,    setMethod]    = useState("ALL");
  const [search,    setSearch]    = useState("");
  const [query,     setQuery]     = useState("");
  const [page,      setPage]      = useState(1);
  const [order,     setOrder]     = useState<"asc" | "desc">("desc");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params: AdminWithdrawalListParams = {
    page, limit: 20, order,
    status: status !== "ALL" ? status : undefined,
    method: method !== "ALL" ? method as "BANK" | "UPI" : undefined,
    search: query || undefined,
    dateFrom: dateFrom || undefined,
    dateTo:   dateTo   || undefined,
  };

  const { data, isLoading, refetch, isRefetching } = useAdminWithdrawals(params);
  const records = data?.records ?? [];
  const isFiltered = status !== "ALL" || method !== "ALL" || !!query || !!dateFrom || !!dateTo;

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setQuery(val); setPage(1); }, 350);
  }, []);

  function clearFilters() {
    setStatus("ALL"); setMethod("ALL"); setSearch(""); setQuery("");
    setDateFrom(""); setDateTo(""); setPage(1); setOrder("desc");
  }

  return (
    <div className="space-y-3">
      {/* ── Status tabs ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className={`
              shrink-0 flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all
              ${status === tab.value
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }
            `}
          >
            {tab.label}
            {status === tab.value && data && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-none">
                {data.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Search + filter row ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search user, ref, bank, UPI…"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-8 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
          />
          {search && (
            <button type="button" onClick={() => { setSearch(""); setQuery(""); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Method filter */}
        <select
          value={method}
          onChange={(e) => { setMethod(e.target.value); setPage(1); }}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="ALL">All Methods</option>
          <option value="BANK">Bank</option>
          <option value="UPI">UPI</option>
        </select>

        {/* Order toggle */}
        <button
          type="button"
          onClick={() => { setOrder((o) => o === "desc" ? "asc" : "desc"); setPage(1); }}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowUpDown size={12} />
          {order === "desc" ? "Newest" : "Oldest"}
        </button>

        {/* Advanced filters toggle */}
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
            showFilters ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal size={12} /> Filters
          {isFiltered && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
        </button>

        {/* Refresh */}
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={12} className={(isLoading || isRefetching) ? "animate-spin" : ""} />
          Refresh
        </button>

        {isFiltered && (
          <button type="button" onClick={clearFilters}
            className="flex h-9 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors">
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* ── Advanced date filters ── */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-emerald-400" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-emerald-400" />
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {["User", "Amount / Net", "Destination", "Reference", "Requested", "Status", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                          <div className="h-2.5 w-16 animate-pulse rounded bg-slate-100" />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={7}><EmptyState filtered={isFiltered} /></td></tr>
              ) : (
                records.map((r: AdminWithdrawalRow) => (
                  <tr key={r.id}
                    className="border-b border-slate-50/80 hover:bg-slate-50/60 transition-colors cursor-pointer group"
                    onClick={() => onRowClick(r)}
                  >
                    {/* User */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.user.name} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate max-w-[130px]">{r.user.name}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[130px]">{r.user.email ?? r.user.phone ?? "—"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="font-bold text-slate-900 tabular-nums">{fmtINR(r.amount)}</p>
                      <p className="text-[11px] text-emerald-600 tabular-nums">Net: {fmtINR(r.netAmount)}</p>
                      {parseFloat(r.fee) > 0 && (
                        <p className="text-[10px] text-slate-400">Fee: {fmtINR(r.fee)}</p>
                      )}
                    </td>

                    {/* Destination */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {r.method === "BANK"
                          ? <><Building2 size={12} className="text-blue-400 shrink-0" />
                              <span className="text-xs text-slate-700 truncate max-w-[120px]">
                                {r.bankName ?? "Bank"} ••••{(r.accountNumber ?? "").slice(-4)}
                              </span>
                            </>
                          : <><Smartphone size={12} className="text-violet-400 shrink-0" />
                              <span className="text-xs text-slate-700 truncate max-w-[120px]">{r.upiId}</span>
                            </>
                        }
                      </div>
                    </td>

                    {/* Reference */}
                    <td className="px-4 py-3.5">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                        {r.transactionReference
                          ? r.transactionReference.slice(0, 18) + "…"
                          : r.id.slice(0, 8) + "…"
                        }
                      </span>
                    </td>

                    {/* Requested */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-xs text-slate-600">{fmtDate(r.requestedAt)}</p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRowClick(r); }}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-700 transition-colors shadow-sm"
                      >
                        <Eye size={11} /> Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(data?.pages ?? 0) > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
            <span className="text-xs text-slate-500">
              Page <strong className="text-slate-700">{page}</strong> of <strong>{data?.pages}</strong>
              {data && <> — {data.total.toLocaleString("en-IN")} total</>}
            </span>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, data?.pages ?? 0) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > (data?.pages ?? 1)) return null;
                return (
                  <button key={p} type="button" onClick={() => setPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${
                      p === page ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}>
                    {p}
                  </button>
                );
              })}
              <button type="button" onClick={() => setPage((p) => Math.min(data!.pages, p + 1))} disabled={page === data?.pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
