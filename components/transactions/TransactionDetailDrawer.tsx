/**
 * TransactionDetailDrawer — full-detail slide-over drawer with timeline.
 * Opens from the right on desktop, slides up from bottom on mobile.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Copy, CheckCircle2, Circle, Clock,
  Banknote, CreditCard, ReceiptText, ArrowRightLeft,
  TrendingUp, Building2, Smartphone,
} from "lucide-react";
import {
  type TransactionRecord,
  TXN_TYPE_LABELS,
  fmtTxnINR,
  fmtTxnDateTime,
  fmtTxnDateTimeSecond,
  deriveStatus,
} from "@/api-client/transactions";
import { TransactionIcon }        from "./TransactionIcon";
import { TransactionStatusBadge } from "./TransactionStatusBadge";

// ─── Copy-to-clipboard button ─────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard not available */ }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 text-slate-300 hover:text-emerald-500 transition-colors"
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied
        ? <CheckCircle2 size={12} className="text-emerald-500" />
        : <Copy size={12} />
      }
    </button>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function Row({ label, value, mono, copyable }: {
  label:     string;
  value:     string | null | undefined;
  mono?:     boolean;
  copyable?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 shrink-0 mt-0.5 w-36">{label}</span>
      <span className={`text-xs text-right font-medium text-slate-800 flex items-center gap-1 ${mono ? "font-mono" : ""}`}>
        {value}
        {copyable && <CopyButton text={value} />}
      </span>
    </div>
  );
}

function SectionHead({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-1">
      <Icon size={13} className="text-slate-400" />
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
    </div>
  );
}

// ─── Timeline ────────────────────────────────────────────────────────────────

interface TimelineStep {
  label:     string;
  ts:        string | null;
  done:      boolean;
  current?:  boolean;
}

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="mt-1 space-y-0">
      {steps.map((step, idx) => (
        <div key={idx} className="flex gap-3">
          {/* Connector */}
          <div className="flex flex-col items-center">
            <div className={`
              flex h-6 w-6 items-center justify-center rounded-full border-2 shrink-0
              ${step.done
                ? "border-emerald-400 bg-emerald-50"
                : step.current
                  ? "border-blue-400 bg-blue-50 animate-pulse"
                  : "border-slate-200 bg-slate-50"
              }
            `}>
              {step.done
                ? <CheckCircle2 size={12} className="text-emerald-500" />
                : step.current
                  ? <Clock size={10} className="text-blue-500" />
                  : <Circle size={10} className="text-slate-300" />
              }
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-px flex-1 my-0.5 min-h-[20px] ${step.done ? "bg-emerald-200" : "bg-slate-100"}`} />
            )}
          </div>
          {/* Label */}
          <div className="pb-4">
            <p className={`text-xs font-semibold leading-tight ${step.done ? "text-slate-800" : "text-slate-400"}`}>
              {step.label}
            </p>
            {step.ts && (
              <p className="text-[11px] text-slate-400 mt-0.5">{fmtTxnDateTimeSecond(step.ts)}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Build timeline steps from transaction ────────────────────────────────────

function buildTimeline(txn: TransactionRecord): TimelineStep[] {
  const status = deriveStatus(txn);

  if (txn.deposit) {
    const d      = txn.deposit;
    const failed = ["FAILED", "REJECTED", "CANCELLED"].includes(d.status);
    const done   = d.status === "SUCCESS";
    return [
      { label: "Deposit Initiated",    ts: d.depositedAt,  done: true                         },
      { label: "Payment Processing",   ts: done ? d.depositedAt : null, done: done || failed, current: d.status === "PROCESSING" },
      { label: "Payment Verified",     ts: done ? txn.createdAt : null, done,                  current: false                    },
      { label: failed ? "Failed / Rejected" : "Wallet Credited", ts: done ? txn.createdAt : null, done, current: false           },
    ];
  }

  if (txn.withdrawal) {
    const w    = txn.withdrawal;
    const done = w.status === "COMPLETED";
    return [
      { label: "Withdrawal Requested", ts: w.requestedAt,             done: true                                                },
      { label: "Under Review",         ts: w.approvedAt ?? null,      done: !!w.approvedAt,   current: w.status === "PENDING"  },
      { label: "Approved",             ts: w.approvedAt ?? null,      done: !!w.approvedAt,   current: w.status === "APPROVED" },
      { label: "Processing Transfer",  ts: w.processedAt ?? null,     done: !!w.processedAt,  current: w.status === "PROCESSING" },
      { label: "Transfer Completed",   ts: done ? w.processedAt : null, done,                 current: false                   },
    ];
  }

  if (txn.investment) {
    const i    = txn.investment;
    const done = ["MATURED", "WITHDRAWN"].includes(i.status);
    return [
      { label: "Investment Created",  ts: i.investedAt,  done: true                             },
      { label: "Funds Locked",        ts: i.investedAt,  done: true                             },
      { label: "Earning Returns",     ts: null,          done: i.status !== "ACTIVE", current: i.status === "ACTIVE" },
      { label: done ? "Matured" : "Awaiting Maturity", ts: done ? i.maturityDate : null, done,  current: false },
    ];
  }

  // Generic for PROFIT / COMMISSION / BONUS
  return [
    { label: "Transaction Created", ts: txn.createdAt, done: true },
    { label: status === "COMPLETED" ? "Credited to Wallet" : "Pending Credit", ts: txn.createdAt, done: status === "COMPLETED", current: status !== "COMPLETED" },
  ];
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

interface Props {
  txn:     TransactionRecord | null;
  onClose: () => void;
}

export function TransactionDetailDrawer({ txn, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (txn) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [txn]);

  if (!txn) return null;

  const status    = deriveStatus(txn);
  const typeLabel = TXN_TYPE_LABELS[txn.transactionType] ?? txn.transactionType;
  const isCredit  = txn.entryType === "CREDIT";
  const timeline  = buildTimeline(txn);

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Transaction details: ${typeLabel}`}
        className="
          fixed inset-y-0 right-0 z-50 flex flex-col
          w-full max-w-md
          bg-white shadow-2xl
          animate-in slide-in-from-right duration-300
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <TransactionIcon type={txn.transactionType} entryType={txn.entryType} size="md" />
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">{typeLabel}</p>
              <p className="text-[11px] text-slate-400">{fmtTxnDateTime(txn.createdAt)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="
              flex h-8 w-8 items-center justify-center rounded-full
              border border-slate-200 text-slate-500
              hover:bg-slate-50 transition-colors
            "
            aria-label="Close details"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {/* Amount hero */}
          <div className="mt-5 mb-4 text-center">
            <p className={`text-3xl font-extrabold tabular-nums ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
              {isCredit ? "+" : "−"}{fmtTxnINR(txn.amount)}
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <TransactionStatusBadge status={status} size="md" />
            </div>
            {txn.description && (
              <p className="mt-2 text-xs text-slate-400 px-4 leading-relaxed">{txn.description}</p>
            )}
          </div>

          {/* ── General info ──────────────────────────────────────────── */}
          <SectionHead title="General Information" icon={ReceiptText} />
          <Row label="Transaction ID"   value={txn.id}                    mono copyable />
          <Row label="Type"             value={typeLabel}                               />
          <Row label="Entry"            value={isCredit ? "Credit (+)" : "Debit (−)"}  />
          <Row label="Created At"       value={fmtTxnDateTimeSecond(txn.createdAt)}     />
          {txn.externalTransactionId && (
            <Row label="External Ref"   value={txn.externalTransactionId} mono copyable />
          )}

          {/* ── Amount details ─────────────────────────────────────────── */}
          <SectionHead title="Amount Details" icon={Banknote} />
          <Row label="Transaction Amt"  value={fmtTxnINR(txn.amount)}                  />
          {txn.withdrawal && (
            <>
              <Row label="Processing Fee"  value={fmtTxnINR(txn.withdrawal.fee)} />
              <Row label="Tax"             value={fmtTxnINR(txn.withdrawal.tax)} />
              <Row label="Net Amount"      value={fmtTxnINR(txn.withdrawal.netAmount)} />
            </>
          )}
          <Row label="Balance Before"   value={fmtTxnINR(txn.balanceBefore)}           />
          <Row label="Balance After"    value={fmtTxnINR(txn.balanceAfter)}            />

          {/* ── Deposit details ────────────────────────────────────────── */}
          {txn.deposit && (
            <>
              <SectionHead title="Payment Details" icon={CreditCard} />
              <Row label="Payment Method"    value={txn.deposit.method.replace(/_/g, " ")} />
              <Row label="Deposit Status"    value={txn.deposit.status}                    />
              <Row label="Transaction Ref"   value={txn.deposit.transactionReference} mono copyable />
              <Row label="Gateway Order ID"  value={txn.deposit.gatewayOrderId}       mono copyable />
              <Row label="Payment ID"        value={txn.deposit.gatewayPaymentId}     mono copyable />
              <Row label="Gateway Txn ID"    value={txn.deposit.gatewayTransactionId} mono copyable />
              <Row label="Deposited At"      value={fmtTxnDateTime(txn.deposit.depositedAt)} />
              {txn.deposit.rejectionReason && (
                <Row label="Rejection Reason"  value={txn.deposit.rejectionReason}         />
              )}
            </>
          )}

          {/* ── Withdrawal details ─────────────────────────────────────── */}
          {txn.withdrawal && (
            <>
              <SectionHead title="Withdrawal Details" icon={txn.withdrawal.method === "UPI" ? Smartphone : Building2} />
              <Row label="Method"            value={txn.withdrawal.method}                 />
              <Row label="Status"            value={txn.withdrawal.status}                 />
              {txn.withdrawal.method === "BANK" ? (
                <>
                  <Row label="Account Holder"  value={txn.withdrawal.accountHolderName}   />
                  <Row label="Bank"            value={txn.withdrawal.bankName}             />
                  <Row label="Account No."     value={txn.withdrawal.accountNumberMasked}  />
                  <Row label="IFSC"            value={txn.withdrawal.ifscCode}             />
                </>
              ) : (
                <Row label="UPI ID"            value={txn.withdrawal.upiIdMasked}          />
              )}
              <Row label="Reference"         value={txn.withdrawal.transactionReference} mono copyable />
              <Row label="Requested At"      value={fmtTxnDateTime(txn.withdrawal.requestedAt)} />
              <Row label="Approved At"       value={fmtTxnDateTime(txn.withdrawal.approvedAt)}  />
              <Row label="Processed At"      value={fmtTxnDateTime(txn.withdrawal.processedAt)} />
              {txn.withdrawal.rejectionReason && (
                <Row label="Rejection Reason"  value={txn.withdrawal.rejectionReason}     />
              )}
            </>
          )}

          {/* ── Investment details ─────────────────────────────────────── */}
          {txn.investment && (
            <>
              <SectionHead title="Investment Details" icon={TrendingUp} />
              <Row label="Package"           value={txn.investment.packageName}            />
              <Row label="Package Code"      value={txn.investment.packageCode} mono       />
              <Row label="Principal"         value={fmtTxnINR(txn.investment.principalAmount)} />
              <Row label="Daily Return"      value={`${txn.investment.dailyReturnRate}% / day`} />
              <Row label="Tenure"            value={`${txn.investment.tenureDays} days`}   />
              <Row label="Progress"          value={`${txn.investment.completedDays} / ${txn.investment.tenureDays} days`} />
              <Row label="Total Profit"      value={fmtTxnINR(txn.investment.totalProfitEarned)} />
              <Row label="Status"            value={txn.investment.status}                 />
              <Row label="Invested At"       value={fmtTxnDateTime(txn.investment.investedAt)} />
              <Row label="Maturity Date"     value={fmtTxnDateTime(txn.investment.maturityDate)} />
            </>
          )}

          {/* ── Source / destination ───────────────────────────────────── */}
          <SectionHead title="Source & Destination" icon={ArrowRightLeft} />
          <Row label="Reference Type"  value={txn.referenceType.replace(/_/g, " ")} />
          <Row label="Reference ID"    value={txn.referenceId} mono copyable />

          {/* ── Timeline ───────────────────────────────────────────────── */}
          <SectionHead title="Timeline" icon={Clock} />
          <Timeline steps={timeline} />
        </div>
      </div>
    </>
  );
}
