/**
 * TransactionList — paginated list with skeleton loader, empty state, and pagination controls.
 */

"use client";

import { TrendingUp, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import { type TransactionRecord, type TxnFilters } from "@/api-client/transactions";
import { useTransactionList }   from "@/api-client/transactions";
import { TransactionCard, TransactionCardSkeleton } from "./TransactionCard";

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
        <Inbox size={28} className="text-slate-300" />
      </div>
      <p className="text-base font-bold text-slate-700 mb-1">
        {hasFilters ? "No matching transactions" : "No transactions yet"}
      </p>
      <p className="text-sm text-slate-400 max-w-xs">
        {hasFilters
          ? "Try adjusting your filters or search query."
          : "Your financial activity will appear here once you start investing or add money to your wallet."
        }
      </p>
      {!hasFilters && (
        <div className="mt-5 flex gap-3">
          <Link
            href="/dashboard/wallet"
            className="
              rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white
              hover:bg-emerald-600 transition-colors shadow-sm
            "
          >
            Add Money to Wallet
          </Link>
          <Link
            href="/dashboard/invest"
            className="
              flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white
              px-4 py-2 text-xs font-bold text-slate-700
              hover:bg-slate-50 transition-colors
            "
          >
            <TrendingUp size={13} />
            Start Investing
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Pagination controls ──────────────────────────────────────────────────────

interface PaginationProps {
  page:      number;
  pages:     number;
  total:     number;
  limit:     number;
  loading:   boolean;
  onPage:    (p: number) => void;
}

function Pagination({ page, pages, total, limit, loading, onPage }: PaginationProps) {
  if (pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  // Build page numbers to show: first, last, current ± 1, with ellipsis
  const range = new Set([1, pages, page, page - 1, page + 1].filter((n) => n >= 1 && n <= pages));
  const pageNums = Array.from(range).sort((a, b) => a - b);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
      <span className="text-xs text-slate-400">
        Showing {from}–{to} of {total.toLocaleString("en-IN")}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page === 1 || loading}
          aria-label="Previous page"
          className="
            flex h-8 w-8 items-center justify-center rounded-lg
            border border-slate-200 text-slate-500
            hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <ChevronLeft size={14} />
        </button>

        {pageNums.map((n, idx) => {
          const prev = pageNums[idx - 1];
          const showEllipsis = prev && n - prev > 1;
          return (
            <span key={n} className="flex items-center gap-1.5">
              {showEllipsis && (
                <span className="px-1 text-xs text-slate-300">…</span>
              )}
              <button
                type="button"
                onClick={() => onPage(n)}
                disabled={loading}
                className={`
                  h-8 min-w-[2rem] rounded-lg border px-2 text-xs font-semibold
                  transition-colors disabled:cursor-not-allowed
                  ${n === page
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }
                `}
              >
                {n}
              </button>
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page === pages || loading}
          aria-label="Next page"
          className="
            flex h-8 w-8 items-center justify-center rounded-lg
            border border-slate-200 text-slate-500
            hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────────

const SKELETON_COUNT = 8;

interface Props {
  filters:  TxnFilters;
  onPage:   (p: number) => void;
  onSelect: (txn: TransactionRecord) => void;
}

export function TransactionList({ filters, onPage, onSelect }: Props) {
  const { data, isLoading, isFetching } = useTransactionList(filters);

  const records = data?.records ?? [];
  const total   = data?.total   ?? 0;
  const page    = data?.page    ?? filters.page  ?? 1;
  const pages   = data?.pages   ?? 1;
  const limit   = filters.limit ?? 20;

  const hasFilters =
    !!filters.search ||
    (filters.types?.length ?? 0) > 0 ||
    !!filters.entryType ||
    !!filters.from ||
    !!filters.to ||
    filters.amountMin != null ||
    filters.amountMax != null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">Transactions</h2>
          {!isLoading && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {total.toLocaleString("en-IN")}
            </span>
          )}
        </div>
        {isFetching && !isLoading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        )}
      </div>

      {/* List body */}
      <div>
        {isLoading ? (
          Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <TransactionCardSkeleton key={i} />
          ))
        ) : records.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          records.map((txn) => (
            <TransactionCard key={txn.id} txn={txn} onClick={onSelect} />
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        pages={pages}
        total={total}
        limit={limit}
        loading={isFetching}
        onPage={onPage}
      />
    </div>
  );
}
