/**
 * TransactionCard — single transaction row displayed in the list.
 * Hover animations, credit/debit color coding, status badge, click handler.
 */

"use client";

import { ChevronRight } from "lucide-react";
import {
  type TransactionRecord,
  TXN_TYPE_LABELS,
  fmtTxnINR,
  fmtTxnDateTime,
  deriveStatus,
} from "@/api-client/transactions";
import { TransactionIcon }        from "./TransactionIcon";
import { TransactionStatusBadge } from "./TransactionStatusBadge";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function TransactionCardSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-50 last:border-0">
      <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface Props {
  txn:     TransactionRecord;
  onClick: (txn: TransactionRecord) => void;
}

export function TransactionCard({ txn, onClick }: Props) {
  const isCredit  = txn.entryType === "CREDIT";
  const status    = deriveStatus(txn);
  const typeLabel = TXN_TYPE_LABELS[txn.transactionType] ?? txn.transactionType;

  // Sub-label: package name for investments/profit, method for deposits, etc.
  let subLabel = "";
  if (txn.investment) subLabel = txn.investment.packageName;
  else if (txn.deposit)    subLabel = txn.deposit.method.replace(/_/g, " ");
  else if (txn.withdrawal) subLabel = txn.withdrawal.method === "UPI" ? "UPI Transfer" : "Bank Transfer";

  return (
    <button
      type="button"
      onClick={() => onClick(txn)}
      className="
        group w-full flex items-center gap-4 px-5 py-4
        border-b border-slate-50 last:border-0
        text-left transition-all duration-150
        hover:bg-slate-50/70 active:bg-slate-100/80
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400
      "
    >
      {/* Icon */}
      <TransactionIcon type={txn.transactionType} entryType={txn.entryType} size="md" />

      {/* Middle content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800 leading-snug truncate">
            {typeLabel}
          </p>
          {subLabel && (
            <span className="text-[11px] text-slate-500 font-medium truncate">
              · {subLabel}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-slate-400 leading-tight truncate">
          {txn.description}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          {fmtTxnDateTime(txn.createdAt)}
        </p>
      </div>

      {/* Right side — amount + status */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <p
          className={`
            text-sm font-bold tabular-nums
            ${isCredit ? "text-emerald-600" : "text-red-500"}
          `}
        >
          {isCredit ? "+" : "−"}{fmtTxnINR(txn.amount)}
        </p>
        <TransactionStatusBadge status={status} size="sm" />
      </div>

      {/* Chevron */}
      <ChevronRight
        size={15}
        className="shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-400"
      />
    </button>
  );
}
