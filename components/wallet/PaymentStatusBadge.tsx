"use client";

import type { DepositStatus } from "@/api-client/wallet";

const CONFIG: Record<DepositStatus, { label: string; cls: string }> = {
  PENDING:    { label: "Pending",    cls: "bg-amber-100 text-amber-700 border-amber-200"  },
  PROCESSING: { label: "Processing", cls: "bg-blue-100 text-blue-700 border-blue-200"    },
  SUCCESS:    { label: "Success",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  FAILED:     { label: "Failed",     cls: "bg-red-100 text-red-700 border-red-200"        },
  REJECTED:   { label: "Rejected",   cls: "bg-red-100 text-red-700 border-red-200"        },
  CANCELLED:  { label: "Cancelled",  cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

export function PaymentStatusBadge({ status }: { status: DepositStatus }) {
  const cfg = CONFIG[status] ?? CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
