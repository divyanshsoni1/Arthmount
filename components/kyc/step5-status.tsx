"use client";

/**
 * Step 5 — KYC Status
 *
 * Renders one of three states returned from the server:
 *   PENDING / IN_REVIEW  → yellow "Under Review"
 *   APPROVED             → green "KYC Approved"
 *   REJECTED             → red   "KYC Rejected" with reason + Reapply button
 *
 * Also used as the "already submitted" screen when the user navigates back
 * to /dashboard/kyc while a record already exists (AlreadyReviewed replacement).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck, Calendar, CheckCircle2,
  Clock, FileText, Loader2, RefreshCw,
  ShieldX, XCircle, ZoomIn,
} from "lucide-react";

import type { KycRecord } from "@/api-client/kyc";
import { BTN_OUTLINE, BTN_PRIMARY, BTN_DANGER } from "./kyc-shared";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

// ─── Document thumbnail strip (from server URLs) ──────────────────────────────

function DocStrip({ kyc }: { kyc: KycRecord }) {
  const docs = [
    { label: "Aadhaar Front", url: kyc.aadhaarFrontUrl },
    { label: "Aadhaar Back",  url: kyc.aadhaarBackUrl  },
    { label: "PAN Front",     url: kyc.panFrontUrl     },
    { label: "PAN Back",      url: kyc.panBackUrl      },
    { label: "Selfie",        url: kyc.selfieUrl       },
  ].filter((d) => !!d.url);

  if (docs.length === 0) return null;

  return (
    <div className="w-full mb-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 text-left">
        Submitted Documents
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {docs.map(({ label, url }) => (
          <div key={label} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
            <img
              src={url!}
              alt={label}
              className="w-full h-20 object-cover"
              loading="lazy"
            />
            <p className="text-[10px] text-slate-500 text-center py-1 px-1 truncate">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Timeline entry ───────────────────────────────────────────────────────────

function TimelineRow({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon:        React.ElementType;
  label:       string;
  value:       string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon size={13} className="shrink-0" />
        {label}
      </div>
      <p className={`text-xs font-semibold ${valueClass ?? "text-slate-800"}`}>{value}</p>
    </div>
  );
}

// ─── Pending state ────────────────────────────────────────────────────────────

function PendingView({ kyc }: { kyc: KycRecord }) {
  return (
    <>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 mb-5 mx-auto">
        <div className="relative">
          <Clock size={40} className="text-blue-500" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
          </span>
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 mb-3">
        🟡 Pending Verification
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">KYC Under Review</h2>
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
        Your KYC has been submitted successfully and is currently under review by our verification team.
      </p>

      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-slate-50 divide-y divide-slate-100 mb-6 mx-auto text-left">
        <TimelineRow icon={Calendar} label="Submitted on"       value={fmtDate(kyc.createdAt)} />
        <TimelineRow icon={Clock}    label="Est. review time"   value="24–48 hours"            />
        <TimelineRow icon={FileText} label="Documents received" value="5 / 5" valueClass="text-emerald-700" />
      </div>

      {/* Animated progress */}
      <div className="w-full max-w-sm mx-auto mb-6">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>Verification in progress…</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse" style={{ width: "60%" }} />
        </div>
      </div>
    </>
  );
}

// ─── Approved state ───────────────────────────────────────────────────────────

function ApprovedView({ kyc }: { kyc: KycRecord }) {
  return (
    <>
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 mb-5 mx-auto">
        <BadgeCheck size={52} className="text-emerald-600" />
        {/* Subtle ring */}
        <div className="absolute inset-0 rounded-full border-4 border-emerald-200" />
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 mb-3">
        🟢 KYC Approved
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">Identity Verified!</h2>
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
        Congratulations! Your identity has been successfully verified. You now have full access to all investment features on Arthmount.
      </p>

      <div className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-emerald-50/60 divide-y divide-emerald-100 mb-6 mx-auto text-left">
        {kyc.aadhaarNumber && (
          <TimelineRow icon={CheckCircle2} label="Aadhaar"      value={`****${kyc.aadhaarNumber.slice(-4)}`} valueClass="text-slate-700 font-mono" />
        )}
        {kyc.panNumber && (
          <TimelineRow icon={CheckCircle2} label="PAN"          value={kyc.panNumber} valueClass="text-slate-700 font-mono" />
        )}
        <TimelineRow icon={Calendar}     label="Verified on"   value={fmtDate(kyc.verifiedAt)} valueClass="text-emerald-700" />
      </div>
    </>
  );
}

// ─── Rejected state ───────────────────────────────────────────────────────────

function RejectedView({
  kyc,
  onReapply,
}: {
  kyc:       KycRecord;
  onReapply: () => void;
}) {
  return (
    <>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-5 mx-auto">
        <ShieldX size={44} className="text-red-500" />
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 mb-3">
        🔴 KYC Rejected
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">KYC Was Rejected</h2>
      <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
        Your KYC submission was rejected. Please review the reason below, correct the issue, and reapply with updated documents.
      </p>

      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-slate-50 divide-y divide-slate-100 mb-5 mx-auto text-left">
        <TimelineRow icon={Calendar} label="Submitted on" value={fmtDate(kyc.createdAt)} />
        <TimelineRow icon={XCircle}  label="Rejected on"  value={fmtDate(kyc.rejectedAt)} valueClass="text-red-600" />
      </div>

      {/* Rejection reason — prominently displayed */}
      {kyc.rejectionReason ? (
        <div className="w-full max-w-sm rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4 mb-5 mx-auto text-left">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={15} className="text-red-500 shrink-0" />
            <p className="text-xs font-bold uppercase tracking-widest text-red-600">
              Rejection Reason
            </p>
          </div>
          <p className="text-sm text-red-800 leading-relaxed font-medium">
            {kyc.rejectionReason}
          </p>
          <p className="text-xs text-red-500 mt-2">
            Please correct the issue above and submit your KYC again.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 px-4 py-3 mb-5 mx-auto text-xs text-red-600 text-center">
          Please contact support for the rejection reason.
        </div>
      )}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Step5Props {
  kyc:       KycRecord;
  onReapply: () => void;
}

export function Step5Status({ kyc, onReapply }: Step5Props) {
  const isApproved = kyc.status === "APPROVED" || kyc.status === "AUTO_APPROVED";
  const isRejected = kyc.status === "REJECTED";
  const isPending  = !isApproved && !isRejected;

  return (
    <div className="flex flex-col items-center text-center py-2">

      {isPending  && <PendingView  kyc={kyc} />}
      {isApproved && <ApprovedView kyc={kyc} />}
      {isRejected && <RejectedView kyc={kyc} onReapply={onReapply} />}

      {/* Document strip */}
      <DocStrip kyc={kyc} />

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
        {isRejected && (
          <button
            type="button"
            onClick={onReapply}
            className={`${BTN_PRIMARY} w-full justify-center`}
          >
            <RefreshCw size={15} /> Reapply for KYC
          </button>
        )}
        <Link
          href="/dashboard"
          className={`${isApproved ? BTN_PRIMARY : BTN_OUTLINE} w-full justify-center no-underline`}
        >
          {isApproved ? "Go to Dashboard" : isPending ? "Back to Dashboard" : "Go to Dashboard"}
        </Link>
      </div>
    </div>
  );
}

// ─── AlreadyReviewed ─────────────────────────────────────────────────────────
// Shown when the user navigates to /dashboard/kyc but already has an
// APPROVED or IN_REVIEW record — replaces the (previously missing) component.

export function AlreadyReviewed({
  status,
}: {
  status: "APPROVED" | "AUTO_APPROVED" | "IN_REVIEW";
}) {
  const isApproved = status === "APPROVED" || status === "AUTO_APPROVED";

  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className={[
        "flex h-20 w-20 items-center justify-center rounded-full mb-5",
        isApproved ? "bg-emerald-100" : "bg-blue-100",
      ].join(" ")}>
        {isApproved
          ? <BadgeCheck size={44} className="text-emerald-600" />
          : <Clock size={44} className="text-blue-500" />
        }
      </div>

      <div className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold mb-3",
        isApproved ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700",
      ].join(" ")}>
        {isApproved ? "🟢 KYC Approved" : "🟡 Under Review"}
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">
        {isApproved ? "Identity Verified" : "KYC Under Review"}
      </h2>
      <p className="text-sm text-slate-500 max-w-xs mx-auto mb-8 leading-relaxed">
        {isApproved
          ? "Your KYC is fully verified. You have access to all investment features."
          : "Your documents are currently being reviewed. Our team verifies within 24–48 hours."}
      </p>

      <Link href="/dashboard" className={`${BTN_PRIMARY} no-underline`}>
        Go to Dashboard
      </Link>
    </div>
  );
}
