"use client";

import { useState }     from "react";
import { useAuditLogs } from "@/api-client/admin";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";

const ACTION_BADGE: Record<string, string> = {
  APPROVE:        "bg-emerald-100 text-emerald-700",
  REJECT:         "bg-red-100 text-red-700",
  CREATE:         "bg-blue-100 text-blue-700",
  UPDATE:         "bg-amber-100 text-amber-700",
  DELETE:         "bg-red-100 text-red-700",
  ENABLE:         "bg-emerald-100 text-emerald-700",
  DISABLE:        "bg-orange-100 text-orange-700",
  LOGIN:          "bg-slate-100 text-slate-600",
  LOGOUT:         "bg-slate-100 text-slate-600",
  RESET_PASSWORD: "bg-purple-100 text-purple-700",
  RESET_PIN:      "bg-purple-100 text-purple-700",
  EXPORT:         "bg-cyan-100 text-cyan-700",
  IMPORT:         "bg-cyan-100 text-cyan-700",
};

const STATUS_BADGE: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  FAILED:  "bg-red-100 text-red-700",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs(page);
  const logs = data?.logs ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
          <Shield size={17} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Audit Logs</h1>
          <p className="text-sm text-slate-500">
            {data ? `${data.total.toLocaleString("en-IN")} immutable log entries` : "Loading..."}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Admin", "Action", "Resource", "Title", "Status", "IP", "Timestamp"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(12)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                    No audit logs yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                    {/* Admin */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-800">{log.admin?.name ?? "System"}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{log.admin?.id?.slice(0, 8) ?? "—"}...</p>
                    </td>
                    {/* Action */}
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ACTION_BADGE[log.action] ?? "bg-slate-100 text-slate-600"}`}>
                        {log.action.replace("_", " ")}
                      </span>
                    </td>
                    {/* Resource */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-slate-700">{log.resourceType}</p>
                      {log.resourceId && (
                        <p className="text-[11px] text-slate-400 font-mono">{log.resourceId.slice(0, 8)}...</p>
                      )}
                    </td>
                    {/* Title */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs text-slate-700 truncate">{log.title}</p>
                      {log.description && (
                        <p className="text-[11px] text-slate-400 truncate">{log.description}</p>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[log.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {log.status}
                      </span>
                    </td>
                    {/* IP */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-500">{log.ipAddress ?? "—"}</span>
                    </td>
                    {/* Timestamp */}
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDate(log.createdAt)}
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
              <button type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft size={15} />
              </button>
              <button type="button"
                onClick={() => setPage((p) => Math.min(data!.pages, p + 1))}
                disabled={page === data?.pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Immutability notice */}
      <p className="text-xs text-center text-slate-400 leading-relaxed">
        Audit logs are immutable and cannot be edited or deleted.
        Every admin action is permanently recorded.
      </p>
    </div>
  );
}
