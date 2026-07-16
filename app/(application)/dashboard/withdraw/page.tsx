"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, History, ArrowUpRight,
  CheckCircle2, AlertCircle, ShieldCheck, Loader2,
  ChevronRight, Banknote,
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
import { WithdrawInfoCard }   from "@/components/withdraw/WithdrawInfoCard";

// ─── Default form state ───────────────────────────────────────────────────────

const DEFAULT_BANK: BankDetails = {
  accountHolderName: "",
  bankName:          "",
  accountNumber:     "",
  confirmAccount:    "",
  ifscCode:          "",
};

const DEFAULT_UPI: UpiDetails = { upiId: "" };

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
      className="relative overflow-hidden flex items-start gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 sm:p-5 shadow-sm"
    >
      {/* Left accent bar */}
      <div className="absolute left-0 inset-y-0 w-1 rounded-l-full bg-gradient-to-b from-emerald-400 to-teal-500" />

      <div className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-md shadow-emerald-200">
        <CheckCircle2 size={18} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-emerald-800">
          Withdrawal Request Submitted
        </p>
        <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
          {fmtWithdrawINR(amount)} will be credited to your account within 1–2 business days.
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">
            Ref:
          </span>
          <span className="rounded-lg bg-emerald-100 px-2 py-0.5 font-mono text-[11px] text-emerald-700 truncate max-w-[220px]">
            {reference}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="relative overflow-hidden flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm"
    >
      <div className="absolute left-0 inset-y-0 w-1 rounded-l-full bg-red-400" />
      <div className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
        <AlertCircle size={15} className="text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-red-700">Request Failed</p>
        <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-red-300 hover:bg-red-100 hover:text-red-500 transition-colors"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── Pending notice ───────────────────────────────────────────────────────────

function PendingNotice({ count, amount }: { count: number; amount: number }) {
  return (
    <div className="relative overflow-hidden flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
      <div className="absolute left-0 inset-y-0 w-1 rounded-l-full bg-amber-400" />
      <div className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100">
        <RefreshCw size={13} className="text-amber-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-amber-800">Withdrawal Pending</p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          You have <strong>{count}</strong> pending withdrawal{count !== 1 ? "s" : ""} totalling{" "}
          <strong>{fmtWithdrawINR(amount)}</strong>. Submit another request only after the current one is processed.
        </p>
      </div>
    </div>
  );
}

// ─── Zero balance notice ──────────────────────────────────────────────────────

function ZeroBalanceNotice() {
  return (
    <div className="relative overflow-hidden flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="absolute left-0 inset-y-0 w-1 rounded-l-full bg-slate-300" />
      <div className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
        <Banknote size={15} className="text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-700">No Withdrawable Balance</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
          Add funds to your wallet or wait for your investments to mature before requesting a withdrawal.
        </p>
      </div>
    </div>
  );
}

// ─── Step heading ─────────────────────────────────────────────────────────────

function StepHeading({
  step,
  title,
  description,
}: {
  step:         number;
  title:        string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-200">
        <span className="text-[11px] font-extrabold text-white leading-none">{step}</span>
      </div>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-sm font-extrabold text-slate-900 leading-none">{title}</h2>
        {description && (
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Review row ───────────────────────────────────────────────────────────────

function ReviewRow({
  label,
  value,
  highlight,
  large,
}: {
  label:      string;
  value:      string;
  highlight?: boolean;
  large?:     boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span
        className={`text-right tabular-nums ml-2 truncate ${
          large
            ? "text-base font-extrabold text-emerald-600"
            : highlight
            ? "text-xs font-bold text-emerald-600"
            : "text-xs font-semibold text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
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

  // ── Derived UI states ──────────────────────────────────────────────────────
  const hasPending     = !summaryLoading && (summary?.pendingCount    ?? 0) > 0;
  const noWithdrawable = !summaryLoading && (summary?.totalWithdrawable ?? 0) === 0;

  // ── Loading / unauth guard ─────────────────────────────────────────────────
  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-xs text-slate-400 font-medium">Loading…</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <>
      <div className="min-h-screen bg-slate-50">

        {/* ── Sticky top bar ────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">

            {/* Left: back + title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/dashboard"
                aria-label="Back to dashboard"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <ArrowLeft size={16} />
              </Link>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-none flex items-center gap-2">
                  <ArrowUpRight size={14} className="text-emerald-500 shrink-0" />
                  <span className="truncate">Withdraw Funds</span>
                </h1>
                <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                  Securely transfer to your bank account or UPI ID
                </p>
              </div>
            </div>

            {/* Right: history toggle + refresh */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                aria-pressed={showHistory}
                className={`
                  flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold
                  transition-all duration-200 min-h-[36px]
                  ${showHistory
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }
                `}
              >
                <History size={13} />
                <span className="hidden sm:inline">
                  {showHistory ? "Hide History" : "History"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefetching || summaryLoading}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 transition-all min-h-[36px]"
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

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-8 pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                Withdraw Funds
              </h2>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed max-w-lg">
                Transfer your available balance securely to your registered bank account or UPI ID.
              </p>
            </div>
            {/* Security badge — desktop only */}
            <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 shrink-0">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">256-bit Encrypted</span>
            </div>
          </div>
        </div>

        {/* ── Page content ──────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">

          {/* ── Alerts ──────────────────────────────────────────────────────── */}
          {successRef && (
            <SuccessBanner
              reference={successRef}
              amount={successAmt}
              onDismiss={() => setSuccessRef(null)}
            />
          )}
          {submitError && (
            <ErrorBanner
              message={submitError}
              onDismiss={() => setSubmitError(null)}
            />
          )}

          {/* ── Summary cards ────────────────────────────────────────────────── */}
          {summaryLoading
            ? <SummaryCardsSkeleton />
            : <WithdrawSummaryCards summary={summary} loading={summaryLoading} />
          }

          {/* ── Status notices ────────────────────────────────────────────────── */}
          {hasPending && (
            <PendingNotice
              count={summary!.pendingCount}
              amount={summary!.pendingAmount}
            />
          )}
          {noWithdrawable && <ZeroBalanceNotice />}

          {/* ── Withdrawal history (toggleable) ──────────────────────────── */}
          {showHistory && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2">
                  Withdrawal History
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <WithdrawalHistory />
            </div>
          )}

          {/* ── Withdrawal form ───────────────────────────────────────────── */}
          {!showHistory && (
            <div className="grid gap-5 sm:gap-6 lg:grid-cols-5 xl:grid-cols-3">

              {/* ── Left column: 3-step form ─────────────────────────────── */}
              <div className="lg:col-span-3 xl:col-span-2 space-y-4">

                {/* Step 1 — Source */}
                <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-50">
                    <StepHeading
                      step={1}
                      title="Withdrawal Source"
                      description="Choose where to withdraw from — wallet or a matured investment"
                    />
                  </div>
                  <div className="px-5 sm:px-6 py-4 sm:py-5">
                    <SourceSelector
                      source={source}
                      onSourceChange={handleSourceChange}
                      selectedInvestment={selectedInvestment}
                      onInvestmentSelect={handleInvestmentSelect}
                      walletBalance={summary?.walletBalance ?? 0}
                      maturedInvestments={summary?.maturedInvestments ?? []}
                    />
                  </div>
                </div>

                {/* Step 2 — Amount */}
                <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-50">
                    <StepHeading
                      step={2}
                      title="Withdrawal Amount"
                      description="Enter the amount you wish to withdraw"
                    />
                  </div>
                  <div className="px-5 sm:px-6 py-4 sm:py-5">
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
                </div>

                {/* Step 3 — Payout method */}
                <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-50">
                    <StepHeading
                      step={3}
                      title="Payout Method"
                      description="Select your preferred bank account or UPI ID"
                    />
                  </div>
                  <div className="px-5 sm:px-6 py-4 sm:py-5">
                    <PayoutMethod
                      method={payoutMethod}
                      onMethodChange={setPayoutMethod}
                      bankDetails={bankDetails}
                      onBankChange={setBankDetails}
                      upiDetails={upiDetails}
                      onUpiChange={setUpiDetails}
                    />
                  </div>
                </div>

                {/* Submit button — mobile only (mirrored in right panel on lg+) */}
                <div className="lg:hidden">
                  <button
                    type="button"
                    onClick={handleSubmitClick}
                    disabled={!formValid || requestWithdrawal.isPending}
                    className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:opacity-90 active:scale-[.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none min-h-[52px]"
                  >
                    {requestWithdrawal.isPending ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <ArrowUpRight size={15} />
                        Request Withdrawal
                        <ChevronRight size={14} className="opacity-70" />
                      </>
                    )}
                  </button>
                  {!formValid && (
                    <p className="mt-2 text-center text-[11px] text-slate-400">
                      Complete all steps above to continue
                    </p>
                  )}
                </div>
              </div>

              {/* ── Right column: review panel + info card ────────────────── */}
              <div className="hidden lg:flex xl:col-span-1 lg:col-span-2 flex-col gap-4">

                {/* Review / summary card — sticky */}
                <div className="sticky top-[73px] space-y-4">

                  {/* Review card */}
                  <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    {/* Card header */}
                    <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-4 border-b border-slate-50">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50">
                          <ShieldCheck size={13} className="text-emerald-600" />
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900">Review Summary</h3>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Preview
                      </span>
                    </div>

                    {/* Review rows */}
                    <div className="px-5 py-1 divide-y divide-slate-50">
                      <ReviewRow
                        label="Source"
                        value={
                          source === "WALLET"
                            ? "Wallet Balance"
                            : selectedInv ? selectedInv.packageName : "—"
                        }
                      />
                      <ReviewRow
                        label="Amount"
                        value={numericAmount > 0 ? fmtWithdrawINR(numericAmount) : "—"}
                      />
                      <ReviewRow
                        label="Processing Fee"
                        value={
                          numericAmount > 0
                            ? (fees?.fee ?? 0) === 0 ? "FREE" : `− ${fmtWithdrawINR(fees?.fee ?? 0)}`
                            : "—"
                        }
                      />
                      <ReviewRow
                        label="Tax (TDS)"
                        value={
                          numericAmount > 0
                            ? (fees?.tax ?? 0) === 0 ? "₹0.00" : `− ${fmtWithdrawINR(fees?.tax ?? 0)}`
                            : "—"
                        }
                      />
                      <ReviewRow
                        label="Method"
                        value={payoutMethod === "BANK" ? "Bank Account" : "UPI ID"}
                      />
                    </div>

                    {/* You receive highlight */}
                    <div className="mx-4 mb-4 mt-1 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 px-4 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-slate-700">You Receive</span>
                        <span className="text-xl font-extrabold text-emerald-600 tabular-nums">
                          {numericAmount > 0
                            ? fmtWithdrawINR(fees?.netAmount ?? numericAmount)
                            : "—"}
                        </span>
                      </div>
                      {numericAmount > 0 && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          Estimated · {fees?.processingTime ?? "1–2 business days"}
                        </p>
                      )}
                    </div>

                    {/* Submit button */}
                    <div className="px-4 pb-5">
                      <button
                        type="button"
                        onClick={handleSubmitClick}
                        disabled={!formValid || requestWithdrawal.isPending}
                        className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:opacity-90 active:scale-[.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        {requestWithdrawal.isPending ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Processing…
                          </>
                        ) : (
                          <>
                            <ArrowUpRight size={14} />
                            Request Withdrawal
                          </>
                        )}
                      </button>
                      {formValid ? (
                        <p className="mt-2 text-center text-[11px] text-slate-400 leading-relaxed">
                          You'll review the full breakdown before confirming.
                        </p>
                      ) : (
                        <p className="mt-2 text-center text-[11px] text-slate-400 leading-relaxed">
                          Complete all steps on the left to continue.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Info card */}
                  <WithdrawInfoCard />
                </div>
              </div>
            </div>
          )}

          {/* Info card — shown below form on mobile/tablet */}
          {!showHistory && (
            <div className="lg:hidden">
              <WithdrawInfoCard />
            </div>
          )}

          {/* Bottom spacing for mobile nav */}
          <div className="h-4 sm:h-2" />
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
