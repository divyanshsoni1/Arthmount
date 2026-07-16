"use client";

/**
 * KycRequired — Investment access gate
 *
 * Rendered on the invest page when the user's KYC is not yet APPROVED.
 * Shows a clear, actionable message explaining what they need to do.
 * Never blocks wallet top-up or transaction viewing — only investment actions.
 */

import Link from "next/link";
import {
  BadgeCheck, CheckCircle2, Clock,
  FileText, Lock, RefreshCw, ShieldX,
} from "lucide-react";
import type { KycStatus } from "@/api-client/kyc";

// ─── Status-specific config ───────────────────────────────────────────────────

interface StatusConfig {
  icon:        React.ElementType;
  iconBg:      string;
  iconColor:   string;
  badge:       string;
  badgeText:   string;
  heading:     string;
  description: string;
  ctaLabel:    string;
  ctaHref:     string;
}

function getConfig(status: KycStatus | null | undefined): StatusConfig {
  switch (status) {
    case "PENDING":
    case "IN_REVIEW":
      return {
        icon:        Clock,
        iconBg:      "bg-blue-100",
        iconColor:   "text-blue-500",
        badge:       "bg-blue-100 text-blue-700",
        badgeText:   "KYC Under Review",
        heading:     "Verification In Progress",
        description: "Your KYC documents are currently being reviewed by our team. Investment access will be unlocked once verification is complete (usually within 24–48 hours).",
        ctaLabel:    "View KYC Status",
        ctaHref:     "/dashboard/kyc",
      };
    case "REJECTED":
      return {
        icon:        ShieldX,
        iconBg:      "bg-red-100",
        iconColor:   "text-red-500",
        badge:       "bg-red-100 text-red-700",
        badgeText:   "KYC Rejected",
        heading:     "Verification Failed",
        description: "Your KYC was rejected. Please review the rejection reason, correct your documents, and resubmit to unlock investment access.",
        ctaLabel:    "Update KYC",
        ctaHref:     "/dashboard/kyc",
      };
    default:
      // NOT_STARTED / INCOMPLETE / null / undefined
      return {
        icon:        Lock,
        iconBg:      "bg-slate-100",
        iconColor:   "text-slate-500",
        badge:       "bg-amber-100 text-amber-700",
        badgeText:   "KYC Required",
        heading:     "Identity Verification Required",
        description: "Complete your KYC to unlock investments. Verification protects you and ensures regulatory compliance for all investment activities.",
        ctaLabel:    "Complete KYC",
        ctaHref:     "/dashboard/kyc",
      };
  }
}

// ─── Benefits list ────────────────────────────────────────────────────────────

const BENEFITS = [
  { icon: CheckCircle2, text: "Secure, regulated investments" },
  { icon: CheckCircle2, text: "Faster withdrawals"            },
  { icon: CheckCircle2, text: "Investor protection"           },
  { icon: CheckCircle2, text: "Regulatory compliance"         },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface KycRequiredProps {
  kycStatus?: KycStatus | null;
  /** If true shows a compact inline banner instead of the full gate page */
  compact?: boolean;
}

export function KycRequired({ kycStatus, compact = false }: KycRequiredProps) {
  const cfg = getConfig(kycStatus);
  const Icon = cfg.icon;

  // ── Compact variant — inline banner inside an existing page ──────────────
  if (compact) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 mt-0.5">
          <Icon size={15} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">
            {kycStatus === "PENDING" || kycStatus === "IN_REVIEW"
              ? "KYC verification in progress"
              : kycStatus === "REJECTED"
                ? "KYC rejected — please resubmit"
                : "Complete KYC to invest"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {cfg.description}
          </p>
        </div>
        <Link
          href={cfg.ctaHref}
          className="shrink-0 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40"
        >
          {cfg.ctaLabel}
        </Link>
      </div>
    );
  }

  // ── Full gate page ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] py-10 px-6 text-center">
      {/* Icon */}
      <div className={`flex h-20 w-20 items-center justify-center rounded-full ${cfg.iconBg} mb-5`}>
        <Icon size={40} className={cfg.iconColor} />
      </div>

      {/* Badge */}
      <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold mb-4 ${cfg.badge}`}>
        {cfg.badgeText}
      </div>

      {/* Heading + description */}
      <h2 className="text-xl font-extrabold text-foreground mb-3 max-w-sm">
        {cfg.heading}
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-7">
        {cfg.description}
      </p>

      {/* Benefits — shown only for the not-started state */}
      {!kycStatus && (
        <div className="w-full max-w-xs rounded-2xl border border-border bg-card px-5 py-4 mb-7 text-left space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Benefits of KYC
          </p>
          {BENEFITS.map(({ icon: BIcon, text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <BIcon size={14} className="text-primary shrink-0" />
              <span className="text-sm text-foreground font-medium">{text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Primary CTA */}
      <Link
        href={cfg.ctaHref}
        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {kycStatus === "PENDING" || kycStatus === "IN_REVIEW"
          ? <><Clock size={15} /> {cfg.ctaLabel}</>
          : kycStatus === "REJECTED"
            ? <><RefreshCw size={15} /> {cfg.ctaLabel}</>
            : <><FileText size={15} /> {cfg.ctaLabel}</>
        }
      </Link>

      {/* Secondary note */}
      <p className="mt-4 text-xs text-muted-foreground">
        You can still{" "}
        <Link href="/dashboard/wallet" className="underline font-medium hover:text-foreground transition-colors">
          add money to your wallet
        </Link>{" "}
        and{" "}
        <Link href="/dashboard/transactions" className="underline font-medium hover:text-foreground transition-colors">
          view transactions
        </Link>{" "}
        without KYC.
      </p>
    </div>
  );
}
