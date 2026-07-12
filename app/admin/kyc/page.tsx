"use client";

import { useState }        from "react";
import Link                from "next/link";
import { useAdminKycList } from "@/api-client/admin";
import {
  BadgeCheck, ChevronLeft, ChevronRight, Clock,
  Eye, ShieldX, AlertTriangle,
} from "lucide-react";

type StatusFilter = "ALL" | "IN_REVIEW" | "PENDING" | "APPROVED" | "REJECTED";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL",       label: "All"        },
  { value: "IN_REVIEW", label: "In Review"  },
  { value: "PENDING",   label: "Pending"    },
  { value: "APPROVED",  label: "Approved"   },
  { value: "REJECTED",  label: "Rejected"   },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING:    "bg-amber-100 text-amber-700 border-amber-200",
  IN_REVIEW:  "bg-blue-100 text-blue-700 border-blue-200",
  APPROVED:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED:   "bg-red-100 text-red-700 border-red-200",
  AUTO_APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  PENDING:   Clock,
  IN_REVIEW: AlertTriangle,
  APPROVED:  BadgeCheck,
  REJECTED:  ShieldX,
  AUTO_APPROVED: BadgeCheck,
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminKycPage() {
  const [status, setStatus] = useState<StatusFilter>("IN_REVIEW");
  const [page,   setPage]   = useState(1);

  const { data, isLoading } = useAdminKycList(status, page);
  const records = data?.records ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">KYC Requests</h1>
        <p className="text-sm text-slate-500 mt-0.5">Review and verify user KYC submissions.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => { setStatus(f.value); setPage(1); }}
            className={[
              "rounded-xl px-4 py-1.5 text-sm font-semibold border transition-all",
              status === f.value
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-slate-400">
                    No KYC records found for this filter.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const Icon = STATUS_ICON[r.status] ?? Clock;
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                            {r.user.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{r.user.name}</p>
                            <p className="text-xs text-slate-500">ID: {r.user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-600">{r.user.email ?? "—"}</p>
                        <p className="text-xs text-slate-500">{r.user.phone ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {fmtDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[r.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
                          <Icon size={10} />
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/admin/kyc/${r.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-primary/40 hover:text-primary transition-colors"
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
