/**
 * ExportMenu — dropdown with CSV, Excel, and Print options.
 * CSV and Excel are generated client-side from fetched data.
 * No server round-trip required; uses fetchAllForExport from the API client.
 */

"use client";

import { useRef, useState, useEffect } from "react";
import { Download, FileText, Table2, Printer, Loader2, ChevronDown } from "lucide-react";
import {
  type TxnFilters,
  type TransactionRecord,
  fetchAllForExport,
  TXN_TYPE_LABELS,
  fmtTxnINR,
  fmtTxnDateTime,
  deriveStatus,
} from "@/api-client/transactions";

// ─── CSV builder ──────────────────────────────────────────────────────────────

function buildCsvRow(fields: string[]): string {
  return fields.map((f) => `"${(f ?? "").replace(/"/g, '""')}"`).join(",");
}

const CSV_HEADERS = [
  "Date", "Transaction ID", "Type", "Entry", "Amount (₹)",
  "Balance Before (₹)", "Balance After (₹)", "Status",
  "Description", "Reference Type", "External Ref",
];

function recordToCsvRow(r: TransactionRecord): string {
  return buildCsvRow([
    fmtTxnDateTime(r.createdAt),
    r.id,
    TXN_TYPE_LABELS[r.transactionType] ?? r.transactionType,
    r.entryType,
    r.amount.toFixed(2),
    r.balanceBefore.toFixed(2),
    r.balanceAfter.toFixed(2),
    deriveStatus(r),
    r.description,
    r.referenceType,
    r.externalTransactionId ?? "",
  ]);
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportCsv(records: TransactionRecord[], filename: string) {
  const rows = [
    buildCsvRow(CSV_HEADERS),
    ...records.map(recordToCsvRow),
  ];
  downloadBlob(rows.join("\r\n"), filename, "text/csv;charset=utf-8;");
}

// ─── Minimal Excel-compatible TSV (opens correctly in Excel / Sheets) ─────────

function exportExcel(records: TransactionRecord[], filename: string) {
  const rows = [
    CSV_HEADERS.join("\t"),
    ...records.map((r) => [
      fmtTxnDateTime(r.createdAt),
      r.id,
      TXN_TYPE_LABELS[r.transactionType] ?? r.transactionType,
      r.entryType,
      r.amount.toFixed(2),
      r.balanceBefore.toFixed(2),
      r.balanceAfter.toFixed(2),
      deriveStatus(r),
      r.description,
      r.referenceType,
      r.externalTransactionId ?? "",
    ].join("\t")),
  ];
  downloadBlob(rows.join("\r\n"), filename, "application/vnd.ms-excel");
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  filters: Omit<TxnFilters, "page" | "limit">;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportMenu({ filters }: Props) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState<"csv" | "excel" | null>(null);
  const ref                   = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filename = () => {
    const d = new Date().toISOString().split("T")[0];
    return `transactions-${d}`;
  };

  const handleExport = async (format: "csv" | "excel") => {
    setLoading(format);
    setOpen(false);
    try {
      const records = await fetchAllForExport(filters);
      if (format === "csv")   exportCsv(records,   `${filename()}.csv`);
      if (format === "excel") exportExcel(records, `${filename()}.xls`);
    } catch (err) {
      console.error("[ExportMenu] Export failed:", err);
    } finally {
      setLoading(null);
    }
  };

  const handlePrint = () => {
    setOpen(false);
    window.print();
  };

  const isLoading = loading !== null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        disabled={isLoading}
        className="
          flex items-center gap-2 rounded-xl border border-slate-200 bg-white
          px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm
          hover:bg-slate-50 hover:border-slate-300
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-150
        "
      >
        {isLoading
          ? <Loader2 size={14} className="animate-spin" />
          : <Download size={14} />
        }
        Export
        <ChevronDown size={12} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="
          absolute right-0 top-full mt-1.5 z-30
          w-44 rounded-xl border border-slate-200 bg-white shadow-xl
          py-1 overflow-hidden
          animate-in fade-in slide-in-from-top-1 duration-150
        ">
          <button
            type="button"
            onClick={() => handleExport("csv")}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileText size={13} className="text-emerald-500" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport("excel")}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Table2 size={13} className="text-blue-500" />
            Export Excel
          </button>
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            onClick={handlePrint}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer size={13} className="text-slate-500" />
            Print Statement
          </button>
        </div>
      )}
    </div>
  );
}
