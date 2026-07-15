"use client";

import { useState } from "react";
import { RefreshCw, Download, ArrowUpRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminWithdrawalStats,
  useAdminWithdrawals,
  ADMIN_WITHDRAWAL_STATS_KEY,
  type AdminWithdrawalRow,
} from "@/api-client/admin";
import {
  WithdrawalStatsCards,
  WithdrawalStatsCardsSkeleton,
} from "@/components/admin/withdrawals/WithdrawalStatsCards";
import { WithdrawalsTable }        from "@/components/admin/withdrawals/WithdrawalsTable";
import { WithdrawalDetailDrawer }  from "@/components/admin/withdrawals/WithdrawalDetailDrawer";

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(records: AdminWithdrawalRow[]) {
  const headers = [
    "ID","User","Email","Phone","Method","Amount","Fee","Net Amount",
    "Bank/UPI","Reference","Status","Requested At","Processed At",
  ];
  const rows = records.map((r) => [
    r.id,
    `"${r.user.name}"`,
    r.user.email ?? "",
    r.user.phone ?? "",
    r.method,
    r.amount,
    r.fee,
    r.netAmount,
    r.method === "BANK"
      ? `"${r.bankName ?? ""} ${r.accountNumber ?? ""}"`
      : r.upiId ?? "",
    r.transactionReference ?? "",
    r.status,
    r.requestedAt,
    r.processedAt ?? "",
  ].join(","));
  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `withdrawals-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminWithdrawalsPage() {
  const qc  = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAdminWithdrawalStats();
  const { data: listData, refetch: refetchList } = useAdminWithdrawals({ page: 1, limit: 20 });

  function handleRefresh() {
    refetchStats();
    refetchList();
    qc.invalidateQueries({ queryKey: ADMIN_WITHDRAWAL_STATS_KEY });
    qc.invalidateQueries({ queryKey: ["admin", "withdrawals", "list"] });
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ArrowUpRight size={20} className="text-emerald-500" />
            Withdrawal Management
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Review, approve, and process user withdrawal requests securely.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => listData && exportCSV(listData.records)}
            disabled={!listData?.records.length}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={13} className={statsLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      {statsLoading
        ? <WithdrawalStatsCardsSkeleton />
        : <WithdrawalStatsCards stats={stats} loading={statsLoading} />
      }

      {/* ── Table ── */}
      <WithdrawalsTable onRowClick={(row) => setSelectedId(row.id)} />

      {/* ── Detail drawer ── */}
      {selectedId && (
        <WithdrawalDetailDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
