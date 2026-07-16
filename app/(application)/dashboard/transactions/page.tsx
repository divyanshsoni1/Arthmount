"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useUser }             from "@/api-client/user";
import {
  type TxnFilters,
  type TransactionRecord,
  txnListKey,
} from "@/api-client/transactions";
import { isAdminRole, getDashboardRoute } from "@/lib/routing";

import { TransactionFilters }         from "@/components/transactions/TransactionFilters";
import { TransactionList }            from "@/components/transactions/TransactionList";
import { TransactionDetailDrawer }    from "@/components/transactions/TransactionDetailDrawer";
import { ExportMenu }                 from "@/components/transactions/ExportMenu";

// ─── Default filters ──────────────────────────────────────────────────────────

const DEFAULT_FILTERS: TxnFilters = {
  sort:  "desc",
  page:  1,
  limit: 20,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const router               = useRouter();
  const qc                   = useQueryClient();
  const { user, isLoading: userLoading } = useUser();

  const [filters,     setFilters]     = useState<TxnFilters>(DEFAULT_FILTERS);
  const [selected,    setSelected]    = useState<TransactionRecord | null>(null);
  const [refreshing,  setRefreshing]  = useState(false);

  // Keep a stable reference to the filters without page for the export menu
  const exportFilters = {
    search:    filters.search,
    types:     filters.types,
    entryType: filters.entryType,
    from:      filters.from,
    to:        filters.to,
    amountMin: filters.amountMin,
    amountMax: filters.amountMax,
    sort:      filters.sort,
  };

  // Redirect unauthenticated users
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login?next=/dashboard/transactions");
    }
  }, [user, userLoading, router]);

  // Redirect admins/partners — this page is for regular users only
  useEffect(() => {
    if (!userLoading && user && isAdminRole(user.role)) {
      router.replace(getDashboardRoute(user.role));
    }
  }, [user, userLoading, router]);

  // ── Filter handlers ─────────────────────────────────────────────────────────

  const handleFilterChange = useCallback((patch: Partial<TxnFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handlePage = useCallback((p: number) => {
    setFilters((prev) => ({ ...prev, page: p }));
    // Scroll list into view smoothly
    window.scrollTo({ top: 300, behavior: "smooth" });
  }, []);

  // ── Refresh ─────────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: txnListKey(filters) });
    setRefreshing(false);
  };

  // ── Loading gate ────────────────────────────────────────────────────────────

  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // Not authenticated or is an admin — both cases are handled by the redirects above.
  // Render nothing while the redirect is in-flight.
  if (!user || isAdminRole(user.role)) return null;

  return (
    <>
      <div className="min-h-screen bg-slate-50 print:bg-white">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md print:hidden">
          <div className="mx-auto max-w-5xl px-4">
            <div className="flex items-center gap-3 py-3">
              {/* Back */}
              <Link
                href="/dashboard"
                aria-label="Back to dashboard"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
              >
                <ArrowLeft size={18} />
              </Link>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-slate-900 leading-none truncate">
                  Transaction History
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                  View all your financial activities in one secure place.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Security badge */}
                <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  <span className="text-[11px] font-semibold text-emerald-700">Secured</span>
                </div>

                {/* Refresh */}
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Refresh transactions"
                  className="
                    flex h-9 w-9 items-center justify-center rounded-xl
                    border border-slate-200 bg-white text-slate-500
                    hover:bg-slate-50 hover:border-slate-300
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all
                  "
                >
                  <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                </button>

                {/* Export */}
                <ExportMenu filters={exportFilters} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Page content ─────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">

          {/* Filters */}
          <TransactionFilters
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
            isLoading={false}
          />

          {/* Transaction list */}
          <TransactionList
            filters={filters}
            onPage={handlePage}
            onSelect={setSelected}
          />

          {/* Footer note */}
          <p className="text-center text-[11px] text-slate-400 pb-4">
            All transactions are end-to-end encrypted and recorded in our immutable ledger.
            For disputes, contact{" "}
            <a href="mailto:support@arthmount.com" className="text-emerald-600 hover:underline">
              support@arthmount.com
            </a>
          </p>
        </div>
      </div>

      {/* Detail drawer — rendered outside the page flow to avoid z-index issues */}
      <TransactionDetailDrawer
        txn={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
