"use client";

import { useState, useCallback, useRef } from "react";
import {
  X, Wallet, CreditCard, ChevronRight, AlertTriangle,
  CheckCircle, Loader2, Lock, ArrowLeft,
  TrendingUp, ShieldCheck,
} from "lucide-react";
import type { ActivePackage, InvestmentRecord } from "@/api-client/invest";
import {
  formatINR, estimateMaturityValue, formatDate,
  useInvestFromWallet, useCreateInvestOrder, useVerifyInvestPayment,
  extractInvestError,
} from "@/api-client/invest";
import { useWalletBalance }                from "@/api-client/wallet";
import { openRazorpayCheckout }            from "@/lib/razorpay/client";
import type { RazorpaySuccessResponse }    from "@/lib/razorpay/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = "WALLET" | "DIRECT";
type Step = "CHOOSE_METHOD" | "CONFIRM" | "PROCESSING" | "SUCCESS" | "ERROR";

interface InvestmentFlowModalProps {
  pkg:       ActivePackage;
  onClose:   () => void;
  onSuccess: (investment: InvestmentRecord) => void;
}

// ─── Amount input step ────────────────────────────────────────────────────────

function AmountStep({
  pkg,
  amount,
  setAmount,
  walletBalance,
  method,
}: {
  pkg:           ActivePackage;
  amount:        string;
  setAmount:     (v: string) => void;
  walletBalance: number;
  method:        PaymentMethod;
}) {
  const parsed = parseFloat(amount) || 0;
  const { totalReturn, maturityValue } = estimateMaturityValue(
    parsed > 0 ? parsed : pkg.minAmount,
    pkg.dailyReturnRate,
    pkg.tenureDays
  );
  const lockEndDate   = new Date(Date.now() + pkg.tenureDays * 86_400_000);
  const isAmountValid = parsed >= pkg.minAmount && parsed <= pkg.maxAmount;
  const isWalletOk    = method !== "WALLET" || walletBalance >= parsed;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setAmount(v);
  };

  return (
    <div className="space-y-4">
      {/* Package summary pill */}
      <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
          <TrendingUp size={15} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{pkg.name}</p>
          <p className="text-[11px] text-slate-400">
            {pkg.dailyReturnRate}%/day · {pkg.tenureDays} days lock-in
          </p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <p className="text-xs font-bold text-emerald-600">
            {(pkg.dailyReturnRate * pkg.tenureDays).toFixed(1)}% total
          </p>
          <p className="text-[10px] text-slate-400">est. return</p>
        </div>
      </div>

      {/* Wallet balance indicator */}
      {method === "WALLET" && (
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
          isWalletOk ? "border-emerald-100 bg-emerald-50" : "border-red-100 bg-red-50"
        }`}>
          <div className="flex items-center gap-2">
            <Wallet size={14} className={isWalletOk ? "text-emerald-600" : "text-red-500"} />
            <span className="text-xs font-semibold text-slate-600">Available Balance</span>
          </div>
          <span className={`text-sm font-bold tabular-nums ${isWalletOk ? "text-emerald-700" : "text-red-600"}`}>
            {formatINR(walletBalance)}
          </span>
        </div>
      )}

      {/* Amount input */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Investment Amount</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">₹</span>
          <input
            type="number"
            value={amount}
            onChange={handleChange}
            min={pkg.minAmount}
            max={pkg.maxAmount}
            placeholder={`Min ${formatINR(pkg.minAmount)}`}
            className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 py-3 text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            autoFocus
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[11px] text-slate-400">
            Min: {formatINR(pkg.minAmount)} · Max: {formatINR(pkg.maxAmount)}
          </p>
          {parsed > 0 && !isAmountValid && (
            <p className="text-[11px] text-red-500">
              {parsed < pkg.minAmount ? "Below minimum" : "Above maximum"}
            </p>
          )}
        </div>
        {/* Quick amounts */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {[pkg.minAmount, pkg.minAmount * 2, pkg.minAmount * 5]
            .filter((v) => v <= pkg.maxAmount)
            .map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {formatINR(v)}
              </button>
            ))}
        </div>
      </div>

      {/* Return preview */}
      {parsed >= pkg.minAmount && parsed <= pkg.maxAmount && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-center">
            <p className="text-[10px] text-slate-400 font-medium">You Invest</p>
            <p className="text-sm font-extrabold text-slate-800 tabular-nums">{formatINR(parsed)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5 text-center">
            <p className="text-[10px] text-emerald-600 font-medium">Est. Return</p>
            <p className="text-sm font-extrabold text-emerald-700 tabular-nums">+{formatINR(totalReturn)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-2.5 text-center">
            <p className="text-[10px] text-blue-600 font-medium">Matures On</p>
            <p className="text-[11px] font-bold text-blue-700">{formatDate(lockEndDate.toISOString())}</p>
          </div>
        </div>
      )}

      {/* Unused vars appeased */}
      {maturityValue === maturityValue && null}
    </div>
  );
}

// ─── Confirm step ─────────────────────────────────────────────────────────────

function ConfirmStep({
  pkg,
  amount,
  method,
  walletBalance,
}: {
  pkg:           ActivePackage;
  amount:        number;
  method:        PaymentMethod;
  walletBalance: number;
}) {
  const remainingBalance = walletBalance - amount;
  const { totalReturn, maturityValue } = estimateMaturityValue(
    amount,
    pkg.dailyReturnRate,
    pkg.tenureDays
  );
  const lockEndDate = new Date(Date.now() + pkg.tenureDays * 86_400_000);

  const rows: { label: string; value: string; bold?: boolean; green?: boolean; blue?: boolean; dim?: boolean }[] = [
    { label: "Investment Plan",   value: pkg.name                                                    },
    { label: "Investment Amount", value: formatINR(amount),             bold:  true                  },
    { label: "Daily Return Rate", value: `${pkg.dailyReturnRate}% / day`                             },
    { label: "Tenure",            value: `${pkg.tenureDays} days`                                    },
    { label: "Estimated Return",  value: `+${formatINR(totalReturn)}`,  green: true                  },
    { label: "Maturity Value",    value: formatINR(maturityValue),       blue:  true                  },
    { label: "Lock-in Ends",      value: formatDate(lockEndDate.toISOString())                       },
    { label: "Payment Method",    value: method === "WALLET" ? "Wallet Balance" : "Online Payment"  },
    ...(method === "WALLET"
      ? [
          { label: "Wallet Before", value: formatINR(walletBalance) },
          { label: "Wallet After",  value: formatINR(Math.max(0, remainingBalance)), dim: remainingBalance < 0 },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden divide-y divide-slate-100">
        {rows.map(({ label, value, bold, green, blue, dim }) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-slate-500">{label}</span>
            <span className={`text-xs font-semibold tabular-nums ${
              green ? "text-emerald-600" :
              blue  ? "text-blue-600"   :
              dim   ? "text-red-500"    :
              bold  ? "text-slate-900"  : "text-slate-700"
            }`}>{value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50 p-3">
        <Lock size={13} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Capital will be <strong>locked for {pkg.tenureDays} days</strong>. No withdrawals,
          cancellations, or transfers during this period.
        </p>
      </div>

      <p className="text-[11px] text-slate-400 text-center leading-relaxed">
        By confirming, you agree to the investment terms and acknowledge the risk disclosure.
      </p>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function InvestmentFlowModal({ pkg, onClose, onSuccess }: InvestmentFlowModalProps) {
  const [step,   setStep]   = useState<Step>("CHOOSE_METHOD");
  const [method, setMethod] = useState<PaymentMethod>("WALLET");
  const [amount, setAmount] = useState<string>(String(pkg.minAmount));
  const [error,  setError]  = useState<string>("");
  const isSubmitting        = useRef(false);

  const { data: walletData }    = useWalletBalance();
  const walletBalance           = parseFloat(walletData?.mainBalance ?? "0");
  const walletInvest            = useInvestFromWallet();
  const createOrder             = useCreateInvestOrder();
  const verifyPayment           = useVerifyInvestPayment();
  const parsedAmount            = parseFloat(amount) || 0;
  const isAmountValid           = parsedAmount >= pkg.minAmount && parsedAmount <= pkg.maxAmount;

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToConfirm = useCallback(() => {
    if (!isAmountValid) return;
    if (method === "WALLET" && walletBalance < parsedAmount) {
      setError("Insufficient wallet balance. Please add funds first.");
      return;
    }
    setError("");
    setStep("CONFIRM");
  }, [isAmountValid, method, walletBalance, parsedAmount]);

  const goBack = useCallback(() => {
    setError("");
    setStep("CHOOSE_METHOD");
  }, []);

  // ── Wallet invest ────────────────────────────────────────────────────────────

  const handleWalletInvest = useCallback(async () => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setStep("PROCESSING");
    setError("");

    try {
      const inv = await walletInvest.mutateAsync({
        packageId: pkg.id,
        amount:    parsedAmount,
      });
      setStep("SUCCESS");
      onSuccess(inv);
    } catch (err) {
      setError(extractInvestError(err));
      setStep("ERROR");
    } finally {
      isSubmitting.current = false;
    }
  }, [walletInvest, pkg.id, parsedAmount, onSuccess]);

  // ── Direct payment ───────────────────────────────────────────────────────────

  const handleDirectPayment = useCallback(async () => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setStep("PROCESSING");
    setError("");

    try {
      const order = await createOrder.mutateAsync({
        packageId: pkg.id,
        amount:    parsedAmount,
      });

      await new Promise<void>((resolve, reject) => {
        openRazorpayCheckout({
          key:         order.keyId,
          amount:      order.amount,
          currency:    order.currency,
          name:        "Arthmount",
          description: `Investment in ${pkg.name}`,
          order_id:    order.orderId,
          theme:       { color: "#10b981" },
          modal:       { ondismiss: () => reject(new Error("Payment was cancelled.")) },
          handler: async (response: RazorpaySuccessResponse) => {
            try {
              const inv = await verifyPayment.mutateAsync({
                packageId:         pkg.id,
                amount:            parsedAmount,
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              setStep("SUCCESS");
              onSuccess(inv);
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        }).catch(reject);
      });
    } catch (err) {
      setError(extractInvestError(err));
      setStep("ERROR");
    } finally {
      isSubmitting.current = false;
    }
  }, [createOrder, verifyPayment, pkg, parsedAmount, onSuccess]);

  // ── Confirm dispatcher ───────────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    if (method === "WALLET") handleWalletInvest();
    else                     handleDirectPayment();
  }, [method, handleWalletInvest, handleDirectPayment]);

  // ── Title map ─────────────────────────────────────────────────────────────────

  const titles: Record<Step, string> = {
    CHOOSE_METHOD: "Invest Now",
    CONFIRM:       "Confirm Investment",
    PROCESSING:    "Processing…",
    SUCCESS:       "Investment Successful!",
    ERROR:         "Investment Failed",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step === "PROCESSING" ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          {step === "CONFIRM" && (
            <button
              type="button"
              onClick={goBack}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <h2 className="flex-1 text-base font-bold text-slate-900">{titles[step]}</h2>
          {step !== "PROCESSING" && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-5">

          {/* ── CHOOSE_METHOD ─────────────────────────────────────────────── */}
          {step === "CHOOSE_METHOD" && (
            <div className="space-y-5">
              <AmountStep
                pkg={pkg}
                amount={amount}
                setAmount={setAmount}
                walletBalance={walletBalance}
                method={method}
              />

              {/* Payment method selector */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Payment Method
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["WALLET", "DIRECT"] as PaymentMethod[]).map((m) => {
                    const Icon     = m === "WALLET" ? Wallet : CreditCard;
                    const label    = m === "WALLET" ? "Wallet Balance" : "Online Payment";
                    const sublabel = m === "WALLET"
                      ? `Avail: ${formatINR(walletBalance)}`
                      : "UPI / Card / NetBanking";
                    const selected = method === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`flex flex-col items-start gap-1.5 rounded-xl border-2 px-3 py-3 text-left transition-all ${
                          selected
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                          selected ? "bg-emerald-500" : "bg-slate-100"
                        }`}>
                          <Icon size={13} className={selected ? "text-white" : "text-slate-500"} />
                        </div>
                        <p className={`text-xs font-bold leading-tight ${selected ? "text-emerald-700" : "text-slate-700"}`}>
                          {label}
                        </p>
                        <p className="text-[10px] text-slate-400">{sublabel}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-red-500" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={goToConfirm}
                disabled={!isAmountValid || (method === "WALLET" && walletBalance < parsedAmount)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* ── CONFIRM ───────────────────────────────────────────────────── */}
          {step === "CONFIRM" && (
            <div className="space-y-4">
              <ConfirmStep
                pkg={pkg}
                amount={parsedAmount}
                method={method}
                walletBalance={walletBalance}
              />
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <ShieldCheck size={15} />
                {method === "WALLET" ? "Confirm & Invest" : "Proceed to Payment"}
              </button>
            </div>
          )}

          {/* ── PROCESSING ────────────────────────────────────────────────── */}
          {step === "PROCESSING" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-emerald-100" />
                <Loader2 size={32} className="absolute inset-0 m-auto animate-spin text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">Processing your investment…</p>
                <p className="text-xs text-slate-400 mt-1">Please do not close this window.</p>
              </div>
            </div>
          )}

          {/* ── SUCCESS ───────────────────────────────────────────────────── */}
          {step === "SUCCESS" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Investment Confirmed!</p>
                <p className="text-sm text-slate-500 mt-1">
                  Your investment in <strong>{pkg.name}</strong> is now active.
                  Returns will be credited weekly to your wallet.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* ── ERROR ─────────────────────────────────────────────────────── */}
          {step === "ERROR" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Investment Failed</p>
                <p className="text-sm text-slate-500 mt-1">{error || "Something went wrong. Please try again."}</p>
              </div>
              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => { setStep("CHOOSE_METHOD"); setError(""); }}
                  className="flex-1 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
