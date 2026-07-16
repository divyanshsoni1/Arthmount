"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, History, ArrowUpRight,
  Info, ShieldCheck, CheckCircle2, AlertCircle,
} from "lucide-react";

import { useUser }        from "@/api-client/user";
import { useQueryClient } from "@tanstack/react-query";
import {
  useWithdrawSummary,
  useRequestWithdrawal,
  useWithdrawFees,
  WITHDRAW_SUMMARY_KEY,
  fmtWithdrawINR,
  extractWithdrawError,
  type WithdrawalSource,
} from "@/api-client/withdraw";

import { WithdrawSummaryCards, SummaryCardsSkeleton } from "@/components/withdraw/SummaryCards";
import { SourceSelector }    from "@/components/withdraw/SourceSelector";
import { AmountInput }       from "@/components/withdraw/AmountInput";
import {
  PayoutMethod,
  validateBank,
  validateUpi,
  type PayoutMethodType,
  type BankDetails,
  type UpiDetails,
} from "@/components/withdraw/PayoutMethod";
import { ConfirmationDialog } from "@/components/withdraw/ConfirmationDialog";
import { WithdrawalHistory }  from "@/components/withdraw/WithdrawalHistory";

// ─── Default form state ───────────────────────────────────────────────────────

const DEFAULT_BANK: BankDetails = {
  accountHolderName: "",
  bankName:          "",
  accountNumber:     "",
  confirmAccount:    "",
  ifscCode:          "",
};

const DEFAULT_UPI: UpiDetails = { upiId: "" };

// ─── Success banner ───────────────────────────────────────────────────────────

function SuccessBanner({
  reference,
  amount,
  onDismiss,
}: {
  reference: string;
  amount:    string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 shadow-sm"
    >
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-500">
        <CheckCircle2 size={16} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-emerald-800">Withdrawal Request Submitted</p>
        <p className="text-xs text-emerald-700 mt-0.5 leading-snug">
          {fmtWithdrawINR(amount)} will be credited to your account within 1–2 business days.
        </p>
        <p className="mt-1.5 font-mono text-[11px] text-emerald-600 truncate">
          Ref: <strong>{reference}</strong>
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-emerald-400 hover:text-emerald-600 transition-colors text-xl leading-none mt-0.5 p-1 -mr-1"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── Step heading ─────────────────────────────────────────────────────────────

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-extrabold text-white">
        {step}
      </span>
      <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
    </div>
  );
}

// ─── Section wrapper (for history toggle) ─────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-emerald-500" />
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Notice banner ────────────────────────────────────────────────────────────

function NoticeBanner({
  intent,
  children,
}: {
  intent: "warning" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    warning: "border-amber-200 bg-amber-50",
    info:    "border-slate-200 bg-white",
  };
  const iconColor = { warning: "text-amber-500", info: "text-slate-400" };

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${styles[intent]}`}>
      <Info size={14} className={`mt-0.5 shrink-0 ${iconColor[intent]}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ─── Form validation ──────────────────────────────────────────────────────────

function isFormValid({
  source, selectedInvestment, amount, maxAmount,
  payoutMethod, bankDetails, upiDetails,
}: {
  source:             WithdrawalSource;
  selectedInvestment: string | null;
  amount:             string;
  maxAmount:          number;
  payoutMethod:       PayoutMethodType;
  bankDetails:        BankDetails;
  upiDetails:         UpiDetails;
}): boolean {
  const n = parseFloat(amount);
  if (!isFinite(n) || n < 10 || n > 500_000) return false;
  if (maxAmount > 0 && n > maxAmount)         return false;
  if (source === "INVESTMENT" && !selectedInvestment) return false;

  if (payoutMethod === "BANK") {
    return Object.keys(validateBank(bankDetails)).length === 0;
  }
  return Object.keys(validateUpi(upiDetails)).length === 0;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WithdrawPage() {
  const router = useRouter();
  const qc     = useQueryClient();
  const { user, isLoading: userLoading } = useUser();

  // ── Server data ────────────────────────────────────────────────────────────
  const {
    data:        summary,
    isLoading:   summaryLoading,
    isRefetching,
    refetch:     refetchSummary,
  } = useWithdrawSummary();

  const requestWithdrawal = useRequestWithdrawal();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [source,             setSource]             = useState<WithdrawalSource>("WALLET");
  const [selectedInvestment, setSelectedInvestment] = useState<string | null>(null);
  const [amount,             setAmount]             = useState("");
  const [payoutMethod,       setPayoutMethod]       = useState<PayoutMethodType>("BANK");
  const [bankDetails,        setBankDetails]        = useState<BankDetails>(DEFAULT_BANK);
  const [upiDetails,         setUpiDetails]         = useState<UpiDetails>(DEFAULT_UPI);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [successRef,  setSuccessRef]  = useState<string | null>(null);
  const [successAmt,  setSuccessAmt]  = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Fee preview ────────────────────────────────────────────────────────────
  const numericAmount  = parseFloat(amount) || 0;
  const { data: fees } = useWithdrawFees(numericAmount);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login?next=/dashboard/withdraw");
    }
  }, [user, userLoading, router]);

  // ── Derived available amount ───────────────────────────────────────────────
  const maxAmount = useMemo(() => {
    if (!summary) return 0;
    if (source === "WALLET") return summary.walletBalance;
    if (source === "INVESTMENT" && selectedInvestment) {
      const inv = summary.maturedInvestments.find((i) => i.id === selectedInvestment);
      return inv ? inv.principalAmount + inv.totalProfitEarned : 0;
    }
    return 0;
  }, [summary, source, selectedInvestment]);

  // ── Source change → reset investment + amount ─────────────────────────────
  const handleSourceChange = useCallback((s: WithdrawalSource) => {
    setSource(s);
    setSelectedInvestment(null);
    setAmount("");
    setSubmitError(null);
  }, []);

  const handleInvestmentSelect = useCallback((id: string) => {
    setSelectedInvestment(id);
    setAmount("");
    setSubmitError(null);
  }, []);

  // ── Submit flow ────────────────────────────────────────────────────────────
  const formValid = isFormValid({
    source, selectedInvestment, amount, maxAmount, payoutMethod, bankDetails, upiDetails,
  });

  function handleSubmitClick() {
    setSubmitError(null);
    setShowConfirm(true);
  }

  async function handleConfirm() {
    const payout = payoutMethod === "BANK"
      ? {
          method:            "BANK" as const,
          accountHolderName: bankDetails.accountHolderName.trim(),
          bankName:          bankDetails.bankName.trim(),
          accountNumber:     bankDetails.accountNumber.trim(),
          ifscCode:          bankDetails.ifscCode.trim().toUpperCase(),
        }
      : {
          method: "UPI" as const,
          upiId:  upiDetails.upiId.trim(),
        };

    requestWithdrawal.mutate(
      {
        source,
        investmentId: source === "INVESTMENT" ? (selectedInvestment ?? undefined) : undefined,
        amount:       Math.round(numericAmount * 100) / 100,
        payout,
      },
      {
        onSuccess: (withdrawal) => {
          setShowConfirm(false);
          setSuccessRef(withdrawal.transactionReference ?? withdrawal.id);
          setSuccessAmt(withdrawal.amount);
          // Reset form
          setAmount("");
          setSelectedInvestment(null);
          setBankDetails(DEFAULT_BANK);
          setUpiDetails(DEFAULT_UPI);
          setSource("WALLET");
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        onError: (err) => {
          setShowConfirm(false);
          setSubmitError(extractWithdrawError(err));
        },
      }
    );
  }

  function handleRefresh() {
    refetchSummary();
    qc.invalidateQueries({ queryKey: WITHDRAW_SUMMARY_KEY });
  }

  // ── Confirmation data ──────────────────────────────────────────────────────
  const selectedInv = summary?.maturedInvestments.find((i) => i.id === selectedInvestment);
  const confirmData = {
    source,
    packageName:       selectedInv?.packageName,
    amount:            numericAmount,
    fee:               fees?.fee      ?? 0,
    tax:               fees?.tax      ?? 0,
    netAmount:         fees?.netAmount ?? numericAmount,
    method:            payoutMethod,
    accountHolderName: bankDetails.accountHolderName,
    bankName:          bankDetails.bankName,
    accountNumber:     bankDetails.accountNumber,
    ifscCode:          bankDetails.ifscCode,
    upiId:             upiDetails.upiId,
    processingTime:    fees?.processingTime ?? "1–2 business days",
  };

  // ── Loading / unauth guard ─────────────────────────────────────────────────
  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }
  if (!user) return null;

  // ── Derived states for notices ─────────────────────────────────────────────
  const hasPending      = !summaryLoading && (summary?.pendingCount ?? 0) > 0;
  const noWithdrawable  = !summaryLoading && (summary?.totalWithdrawable ?? 0) === 0;

  return (
    <>
      <div className="min-h-screen bg-slate-50">

        {/* ── Sticky top bar ────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">

            {/* Left: back + title */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Link
                href="/dashboard"
                aria-label="Back to dashboard"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft size={16} />
              </Link>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-none flex items-center gap-1.5 sm:gap-2">
                  <ArrowUpRight size={14} className="text-emerald-500 shrink-0" />
                  <span className="truncate">Withdraw Money</span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block truncate">
                  Securely transfer funds to your bank account or UPI ID
                </p>
              </div>
            </div>

            {/* Right: history + refresh */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                aria-pressed={showHistory}
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-2 text-xs font-semibold transition-colors min-h-[36px] ${
                  showHistory
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <History size={13} />
                <span className="hidden sm:inline">History</span>
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefetching || summaryLoading}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors min-h-[36px]"
                aria-label="Refresh balances"
              >
                <RefreshCw
                  size={13}
                  className={(isRefetching || summaryLoading) ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Page content ──────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

          {/* Success banner */}
          {successRef && (
            <SuccessBanner
              reference={successRef}
              amount={successAmt}
              onDismiss={() => setSuccessRef(null)}
            />
          )}

          {/* Summary cards */}
          {summaryLoading
            ? <SummaryCardsSkeleton />
            : <WithdrawSummaryCards summary={summary} loading={summaryLoading} />
          }

          {/* Pending withdrawal notice */}
          {hasPending && (
            <NoticeBanner intent="warning">
              <p className="text-sm text-amber-800 leading-snug">
                You have <strong>{summary!.pendingCount}</strong> pending withdrawal
                {summary!.pendingCount !== 1 ? "s" : ""} totalling{" "}
                <strong>{fmtWithdrawINR(summary!.pendingAmount)}</strong>.
                You can submit another request only after the current one is processed.
              </p>
            </NoticeBanner>
          )}

          {/* No withdrawable balance notice */}
          {noWithdrawable && (
            <NoticeBanner intent="info">
              <p className="text-sm font-bold text-slate-700">No withdrawable balance</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Add money to your wallet or wait for your investments to mature.
              </p>
            </NoticeBanner>
          )}

          {/* Submit error */}
          {submitError && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-sm text-red-700 leading-snug">{submitError}</p>
            </div>
          )}

          {/* ── Withdrawal history (toggleable) ──────────────────────────── */}
          {showHistory && (
            <Section title="Withdrawal History">
              <WithdrawalHistory />
            </Section>
          )}

          {/* ── Withdrawal form ────────────────────────────────────────────── */}
          {!showHistory && (
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">

              {/* ── Left: 3-step form (lg: 3/5) ─────────────────────────── */}
              <div className="lg:col-span-3 space-y-3 sm:space-y-4">

                {/* Step 1 — Source */}
                <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm space-y-3 sm:space-y-4">
                  <StepHeading step={1} title="Withdrawal Source" />
                  <SourceSelector
                    source={source}
                    onSourceChange={handleSourceChange}
                    selectedInvestment={selectedInvestment}
                    onInvestmentSelect={handleInvestmentSelect}
                    walletBalance={summary?.walletBalance ?? 0}
                    maturedInvestments={summary?.maturedInvestments ?? []}
                  />
                </div>

                {/* Step 2 — Amount */}
                <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm space-y-3 sm:space-y-4">
                  <StepHeading step={2} title="Withdrawal Amount" />
                  <AmountInput
                    value={amount}
                    onChange={(v) => { setAmount(v); setSubmitError(null); }}
                    maxAmount={maxAmount}
                    disabled={source === "INVESTMENT" && !selectedInvestment}
                    fee={fees?.fee ?? 0}
                    tax={fees?.tax ?? 0}
                    netAmount={fees?.netAmount}
                    processingTime={fees?.processingTime}
                  />
                </div>

                {/* Step 3 — Payout method */}
                <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm space-y-3 sm:space-y-4">
                  <StepHeading step={3} title="Payout Method" />
                  <PayoutMethod
                    method={payoutMethod}
                    onMethodChange={setPayoutMethod}
                    bankDetails={bankDetails}
                    onBankChange={setBankDetails}
                    upiDetails={upiDetails}
                    onUpiChange={setUpiDetails}
                  />
                </div>

                {/* Submit button — visible below steps on mobile, mirrored in right panel on lg */}
                <div className="lg:hidden">
                  <button
                    type="button"
                    onClick={handleSubmitClick}
                    disabled={!formValid || requestWithdrawal.isPending}
                    className="
                      w-full flex items-center justify-center gap-2.5
                      rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600
                      py-3.5 text-sm font-bold text-white shadow-md
                      hover:opacity-90 active:scale-[.98] transition-all
                      disabled:opacity-40 disabled:cursor-not-allowed
                      min-h-[52px]
                    "
                  >
                    <ArrowUpRight size={15} />
                    Request Withdrawal
                  </button>
                </div>
              </div>

              {/* ── Right: review panel (lg: 2/5) ────────────────────────── */}
              <div className="hidden lg:block lg:col-span-2 space-y-4">

                {/* Review card */}
                <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-4 sticky top-[73px]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <h3 className="text-sm font-extrabold text-slate-900">Review</h3>
                  </div>

                  <div className="space-y-0 divide-y divide-slate-50">
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-xs text-slate-500">Source</span>
                      <span className="text-xs font-semibold text-slate-800 text-right">
                        {source === "WALLET"
                          ? "Wallet"
                          : selectedInv ? selectedInv.packageName : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-xs text-slate-500">Amount</span>
                      <span className="text-xs font-bold text-slate-900 tabular-nums">
                        {numericAmount > 0 ? fmtWithdrawINR(numericAmount) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-xs text-slate-500">You Receive</span>
                      <span className="text-sm font-extrabold text-emerald-600 tabular-nums">
                        {numericAmount > 0
                          ? fmtWithdrawINR(fees?.netAmount ?? numericAmount)
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-xs text-slate-500">Method</span>
                      <span className="text-xs font-semibold text-slate-800">
                        {payoutMethod === "BANK" ? "Bank Account" : "UPI ID"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitClick}
                    disabled={!formValid || requestWithdrawal.isPending}
                    className="
                      w-full flex items-center justify-center gap-2.5
                      rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600
                      py-3.5 text-sm font-bold text-white shadow-md
                      hover:opacity-90 active:scale-[.98] transition-all
                      disabled:opacity-40 disabled:cursor-not-allowed
                    "
                  >
                    <ArrowUpRight size={15} />
                    Request Withdrawal
                  </button>

                  <p className="text-center text-[11px] text-slate-400 leading-relaxed">
                    You'll review the full breakdown before confirming.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom spacing for mobile nav */}
          <div className="h-2 sm:h-0" />
        </div>
      </div>

      {/* ── Confirmation dialog ────────────────────────────────────────────── */}
      {showConfirm && (
        <ConfirmationDialog
          data={confirmData}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          isSubmitting={requestWithdrawal.isPending}
        />
      )}
    </>
  );
}
