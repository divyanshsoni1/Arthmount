"use client";

import Link from "next/link";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileCheck,
  UploadCloud,
} from "lucide-react";
import type { KycRecord, KycStatus } from "@/api-client/kyc";
import { useKycStatus } from "@/api-client/kyc";

// ─── Status config ────────────────────────────────────────────────────────────

interface StatusConfig {
  label:       string;
  description: string;
  icon:        React.ElementType;
  badgeCls:    string;
  cardCls:     string;
  actionLabel: string | null;
  actionHref:  string | null;
  actionCls:   string;
}

const STATUS_CONFIG: Record<KycStatus | "NOT_SUBMITTED", StatusConfig> = {
  NOT_SUBMITTED: {
    label:       "Not Submitted",
    description: "Complete KYC verification to unlock full investment features.",
    icon:        UploadCloud,
    badgeCls:    "bg-slate-100 text-slate-600",
    cardCls:     "border-slate-200 bg-white",
    actionLabel: "Upload KYC",
    actionHref:  "/dashboard/kyc",
    actionCls:   "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  PENDING: {
    label:       "Draft",
    description: "You have started but not yet submitted your KYC documents.",
    icon:        FileCheck,
    badgeCls:    "bg-amber-100 text-amber-700",
    cardCls:     "border-amber-100 bg-amber-50/30",
    actionLabel: "Continue KYC",
    actionHref:  "/dashboard/kyc",
    actionCls:   "bg-amber-600 hover:bg-amber-700 text-white",
  },
  IN_REVIEW: {
    label:       "Under Review",
    description: "Your documents have been submitted. Our team will verify within 24–48 hours.",
    icon:        Clock,
    badgeCls:    "bg-blue-100 text-blue-700",
    cardCls:     "border-blue-100 bg-blue-50/30",
    actionLabel: null,
    actionHref:  null,
    actionCls:   "",
  },
  APPROVED: {
    label:       "Verified",
    description: "Your KYC is verified. You have full access to all investment features.",
    icon:        BadgeCheck,
    badgeCls:    "bg-emerald-100 text-emerald-700",
    cardCls:     "border-emerald-100 bg-emerald-50/30",
    actionLabel: null,
    actionHref:  null,
    actionCls:   "",
  },
  AUTO_APPROVED: {
    label:       "Verified",
    description: "Your KYC has been automatically verified.",
    icon:        BadgeCheck,
    badgeCls:    "bg-emerald-100 text-emerald-700",
    cardCls:     "border-emerald-100 bg-emerald-50/30",
    actionLabel: null,
    actionHref:  null,
    actionCls:   "",
  },
  REJECTED: {
    label:       "Rejected",
    description: "Your KYC was rejected. Please re-upload your documents.",
    icon:        AlertCircle,
    badgeCls:    "bg-red-100 text-red-700",
    cardCls:     "border-red-100 bg-red-50/30",
    actionLabel: "Re-upload Documents",
    actionHref:  "/dashboard/kyc",
    actionCls:   "bg-red-600 hover:bg-red-700 text-white",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface KYCStatusCardProps {
  /** Pass an already-fetched record to avoid an extra fetch. */
  record?: KycRecord | null;
}

export function KYCStatusCard({ record: propRecord }: KYCStatusCardProps = {}) {
  const { data: fetchedRecord, isLoading } = useKycStatus();
  const record = propRecord !== undefined ? propRecord : fetchedRecord;

  if (isLoading && propRecord === undefined) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-5 animate-pulse">
        <div className="h-4 w-32 rounded bg-slate-100 mb-3" />
        <div className="h-3 w-48 rounded bg-slate-100 mb-4" />
        <div className="h-9 w-28 rounded-lg bg-slate-100" />
      </div>
    );
  }

  const statusKey: KycStatus | "NOT_SUBMITTED" = record?.status ?? "NOT_SUBMITTED";
  const cfg = STATUS_CONFIG[statusKey];
  const Icon = cfg.icon;

  return (
    <div className={[
      "rounded-2xl border p-5 transition-all",
      cfg.cardCls,
    ].join(" ")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100">
            <Icon size={20} className="text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5">
              KYC Status
            </p>
            <div className="flex items-center gap-2">
              <span className={[
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                cfg.badgeCls,
              ].join(" ")}>
                {cfg.label}
              </span>
              {statusKey === "APPROVED" || statusKey === "AUTO_APPROVED" ? (
                <CheckCircle2 size={15} className="text-emerald-500" />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        {cfg.description}
      </p>

      {/* Rejection reason */}
      {statusKey === "REJECTED" && record?.rejectionReason && (
        <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span className="font-semibold">Reason: </span>
          {record.rejectionReason}
        </div>
      )}

      {cfg.actionLabel && cfg.actionHref && (
        <Link
          href={cfg.actionHref}
          className={[
            "mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            cfg.actionCls,
          ].join(" ")}
        >
          {cfg.actionLabel}
        </Link>
      )}
    </div>
  );
}
