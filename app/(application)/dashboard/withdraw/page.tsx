"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, History, ArrowUpRight,
  Info, ShieldCheck, CheckCircle2, AlertCircle,
} from "lucide-react";

import { useUser }           from "@/api-client/user";
import { useQueryClient }    from "@tanstack/react-query";
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
import { SourceSelector }      from "@/components/withdraw/SourceSelector";
import { AmountInput }         from "@/components/withdraw/AmountInput";
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
    <div className="flex items-start gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500">
        <CheckCircle2 size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-emerald-800">Withdrawal Request Submitted</p>
        <p className="text-xs text-emerald-700 mt-0.5">
          {fmtWithdrawINR(amount)} will be credited to your account within 1–2 business days.
        </p>
        <p className="mt-1.5 font-mono text-[11px] text-emerald-600">
          Reference: <strong>{reference}</strong>
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-emerald-400 hover:text-emerald-600 transition-colors text-lg leading-none mt-0.5"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

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
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);
  const [successRef,   setSuccessRef]   = useState<string | null>(null);
  const [successAmt,   setSuccessAmt]   = useState<string>("");
  const [submitError,  setSubmitError]  = useState<string | null>(null);

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

  // ── Locked investments (ACTIVE, not yet matured) ──────────────────────────
  // We get all investments via summary; service already filters. Pass to SourceSelector.
  // (The summary only includes matured; for locked we use the lockedCount/lockedAmount fields.)
  // We skip fetching a separate list and show a generic message when lockedCount > 0.

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
          // Scroll to top
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

  return (
    <>
      <div className="min-h-screen bg-slate-50">

        {/* ── Sticky top bar ────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/dashboard"
                aria-label="Back to dashboard"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft size={16} />
              </Link>
              <div className="min-w-0">
                <h1 className="text-base font-extrabold text-slate-900 leading-none flex items-center gap-2">
                  <ArrowUpRight size={15} className="text-emerald-500" />
                  Withdraw Money
                </h1>
                <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                  Securely transfer funds to your bank account or UPI ID
                </p>
              </div>
            </div>
            {/* Right */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
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
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                aria-label="Refresh balances"
              >
                <RefreshCw size={13} className={(isRefetching || summaryLoading) ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Page content ──────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">

          {/* ── Success banner ─────────────────────────────────────────────── */}
          {successRef && (
            <SuccessBanner
              reference={successRef}
              amount={successAmt}
              onDismiss={() => setSuccessRef(null)}
            />
          )}

          {/* ── Summary cards ──────────────────────────────────────────────── */}
          {summaryLoading
            ? <SummaryCardsSkeleton />
            : <WithdrawSummaryCards summary={summary} loading={summaryLoading} />
          }

          {/* ── Pending withdrawal notice ──────────────────────────────────── */}
          {!summaryLoading && (summary?.pendingCount ?? 0) > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Info size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-800">
                You have <strong>{summary!.pendingCount}</strong> pending withdrawal
                {summary!.pendingCount !== 1 ? "s" : ""} totalling{" "}
                <strong>{fmtWithdrawINR(summary!.pendingAmount)}</strong>.
                You can submit another request only after the current one is processed.
              </p>
            </div>
          )}

          {/* ── No withdrawable balance notice ───────────────────────────────*/}
          {!summaryLoading && (summary?.totalWithdrawable ?? 0) === 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-700">No withdrawable balance</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add money to your wallet or wait for your investments to mature before withdrawing.
                </p>
              </div>
            </div>
          )}

          {/* ── Withdrawal history (toggleable) ───────────────────────────── */}
          {showHistory && (
            <Section title="Withdrawal History">
              <WithdrawalHistory />
            </Section>
          )}

          {/* ── Withdraw form ──────────────────────────────────────────────── */}
          {!showHistory && (
            <div className="grid gap-6 lg:grid-cols-5">

              {/* Left col — form steps (lg: 3/5) */}
              <div className="lg:col-span-3 space-y-6">

                {/* Step 1 — Source */}
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-extrabold text-white">1</span>
                    <h2 className="text-sm font-extrabold text-slate-900">Withdrawal Source</h2>
                  </div>
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
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-extrabold text-white">2</span>
                    <h2 className="text-sm font-extrabold text-slate-900">Withdrawal Amount</h2>
                  </div>
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
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-extrabold text-white">3</span>
                    <h2 className="text-sm font-extrabold text-slate-900">Payout Method</h2>
                  </div>
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

              {/* Right col — review panel (lg: 2/5) */}
              <div className="lg:col-span-2 space-y-4">

                {/* Review card */}
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4 lg:sticky lg:top-24">
                  <h2 className="text-sm font-extrabold text-slate-900">Review & Submit</h2>

                  <div className="divide-y divide-slate-50 rounded-2xl border border-slate-100 overflow-hidden text-sm">
                    <div className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-slate-500">Source</span>
                      <span className="font-semibold text-slate-800">
                        {source === "WALLET" ? "Wallet" : selectedInv?.packageName ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-slate-500">Amount</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {numericAmount > 0 ? fmtWithdrawINR(numericAmount) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-slate-500">Fee</span>
                      <span className="font-semibold text-emerald-600">
                        {(fees?.fee ?? 0) === 0 ? "FREE" : fmtWithdrawINR(fees?.fee ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-slate-500">You Receive</span>
                      <span className="font-extrabold text-emerald-600 tabular-nums">
                        {numericAmount > 0 ? fmtWithdrawINR(fees?.netAmount ?? numericAmount) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-slate-500">To</span>
                      <span className="font-semibold text-slate-800 text-right">
                        {payoutMethod === "UPI"
                          ? (upiDetails.upiId || "—")
                          : bankDetails.accountNumber
                            ? `••••${bankDetails.accountNumber.slice(-4)}`
                            : "—"
                        }
                      </span>
                    </div>
                  </div>

                  {/* Error */}
                  {submitError && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
                      <AlertCircle size={13} className="mt-0.5 shrink-0 text-red-500" />
                      <p className="text-xs text-red-700">{submitError}</p>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={handleSubmitClick}
                    disabled={!formValid || requestWithdrawal.isPending || (summary?.pendingCount ?? 0) > 0}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-extrabold text-white shadow-md shadow-emerald-600/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    <ArrowUpRight size={16} />
                    Withdraw Now
                  </button>

                  {/* Trust badges */}
                  <div className="flex flex-col gap-1.5">
                    {[
                      "Bank-grade 256-bit encryption",
                      "Funds debited only after admin approval",
                      "Idempotent — no duplicate withdrawals",
                    ].map((t) => (
                      <div key={t} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <ShieldCheck size={10} className="text-emerald-400 shrink-0" />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Info footer ─────────────────────────────────────────────────── */}
          {!showHistory && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <Info size={15} className="mt-0.5 shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Withdrawals are processed within <strong>1–2 business days</strong>.
                Investment withdrawals are only available <strong>after the lock-in tenure has completed</strong>.
                Minimum withdrawal is <strong>₹10</strong>. Contact support if your request is not processed within 3 days.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation dialog ────────────────────────────────────────────── */}
      {showConfirm && (
        <ConfirmationDialog
          data={confirmData}
          onConfirm={handleConfirm}
          onCancel={() => !requestWithdrawal.isPending && setShowConfirm(false)}
          isSubmitting={requestWithdrawal.isPending}
        />
      )}
    </>
  );
}
