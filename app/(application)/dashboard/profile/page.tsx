"use client";

import { useEffect } from "react";
import Link          from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Edit3,
  FileCheck,
  Heart,
  HelpCircle,
  Lock,
  Mail,
  Phone,
  Receipt,
  Shield,
  ShieldOff,
  Smartphone,
  User,
  UserCircle,
  Wallet,
} from "lucide-react";

import { useUser }    from "@/api-client/user";
import { useProfile } from "@/api-client/profile";
import { formatDate, formatDateTime, formatINR } from "@/api-client/profile";
import ProfileHeader,     { ProfileHeaderSkeleton }     from "@/components/profile/ProfileHeader";
import ProfileStatsCards, { ProfileStatsCardsSkeleton } from "@/components/profile/ProfileStatsCards";
import { cn } from "@/lib/utils";

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-slate-100" />;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
  action,
}: {
  title:     string;
  icon:      React.ElementType;
  children:  React.ReactNode;
  action?:   React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
            <Icon size={14} className="text-slate-500" />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        </div>
        {action}
      </div>
      <Divider />
      <div className="px-5">{children}</div>
    </div>
  );
}

// ─── Info field row ───────────────────────────────────────────────────────────

function Field({
  label,
  value,
  missing,
  badge,
}: {
  label:   string;
  value:   string | null | undefined;
  missing?: boolean;
  badge?:  React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-50 last:border-0">
      <p className="text-xs font-medium text-slate-400 shrink-0 w-32">{label}</p>
      <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
        <p className={cn(
          "text-sm font-medium text-right truncate",
          missing || !value ? "italic text-slate-300" : "text-slate-700"
        )}>
          {value || "Not provided"}
        </p>
        {badge}
      </div>
    </div>
  );
}

// ─── Verified badge ───────────────────────────────────────────────────────────

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <BadgeCheck size={9} />
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      Unverified
    </span>
  );
}

// ─── Security row ─────────────────────────────────────────────────────────────

function SecurityRow({
  icon: Icon,
  label,
  value,
  status,
}: {
  icon:   React.ElementType;
  label:  string;
  value:  string;
  status: "active" | "inactive" | "info";
}) {
  const dotCls = {
    active:   "bg-emerald-400",
    inactive: "bg-slate-300",
    info:     "bg-blue-400",
  }[status];

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-slate-50 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
        <Icon size={14} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-700 truncate">{value}</p>
      </div>
      <div className={cn("h-2 w-2 shrink-0 rounded-full", dotCls)} />
    </div>
  );
}

// ─── Quick link row ───────────────────────────────────────────────────────────

interface QuickLinkProps {
  icon:  React.ElementType;
  label: string;
  sub:   string;
  href:  string;
  color?: "emerald" | "blue" | "violet" | "amber" | "slate";
}

const QL_ICON: Record<NonNullable<QuickLinkProps["color"]>, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue:    "bg-blue-50 text-blue-600",
  violet:  "bg-violet-50 text-violet-600",
  amber:   "bg-amber-50 text-amber-600",
  slate:   "bg-slate-50 text-slate-500",
};

function QuickLink({ icon: Icon, label, sub, href, color = "slate" }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 -mx-5 px-5 transition-colors duration-100"
    >
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        QL_ICON[color]
      )}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 leading-snug">{label}</p>
        <p className="text-xs text-slate-400 truncate">{sub}</p>
      </div>
      <ArrowRight
        size={14}
        className="shrink-0 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-100"
      />
    </Link>
  );
}

// ─── KYC status inline banner ─────────────────────────────────────────────────

const KYC_CFG: Record<string, { bg: string; text: string; sub: string; accent: string }> = {
  PENDING:       { bg: "border-amber-100 bg-amber-50",     text: "text-amber-800",   sub: "Complete your KYC to unlock investing.",             accent: "text-amber-600" },
  IN_REVIEW:     { bg: "border-blue-100 bg-blue-50",       text: "text-blue-800",    sub: "Documents under review — usually 1–2 business days.", accent: "text-blue-600"  },
  APPROVED:      { bg: "border-emerald-100 bg-emerald-50", text: "text-emerald-800", sub: "Your identity is fully verified.",                    accent: "text-emerald-600" },
  AUTO_APPROVED: { bg: "border-emerald-100 bg-emerald-50", text: "text-emerald-800", sub: "Your identity is fully verified.",                    accent: "text-emerald-600" },
  REJECTED:      { bg: "border-red-100 bg-red-50",         text: "text-red-800",     sub: "KYC rejected — please re-submit your documents.",     accent: "text-red-600"   },
};

function KycBanner({ status }: { status: string }) {
  const cfg       = KYC_CFG[status] ?? KYC_CFG.PENDING;
  const isApproved = ["APPROVED", "AUTO_APPROVED"].includes(status);
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-2xl border px-4 py-3",
      cfg.bg
    )}>
      {isApproved
        ? <BadgeCheck size={16} className="shrink-0 text-emerald-600" />
        : <FileCheck  size={16} className={cn("shrink-0", cfg.accent)} />
      }
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-semibold", cfg.text)}>
          KYC · {status.replace(/_/g, " ")}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{cfg.sub}</p>
      </div>
      {!isApproved && (
        <Link
          href="/dashboard/kyc"
          className="shrink-0 rounded-lg border border-current/20 bg-white/70 px-2.5 py-1 text-[11px] font-semibold hover:bg-white transition-colors"
        >
          {status === "REJECTED" ? "Re-submit" : "Complete"}
        </Link>
      )}
    </div>
  );
}

// ─── Page skeleton ────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-36 rounded bg-slate-200 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <ProfileHeaderSkeleton />
        <ProfileStatsCardsSkeleton />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router                           = useRouter();
  const { user, isLoading: authLoading } = useUser();
  const { data, isLoading, error }       = useProfile();

  // Auth guard — no business logic change
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/dashboard/profile");
    }
  }, [user, authLoading, router]);

  if (authLoading || (!data && isLoading)) return <PageSkeleton />;
  if (!user) return null;

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <ShieldOff size={22} className="text-red-500" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Could not load profile</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Something went wrong. Please try again.
          </p>
          <button
            onClick={() => router.refresh()}
            className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { profile, stats } = data;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-none">My Profile</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Manage your personal information and account details.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/profile/edit"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          >
            <Edit3 size={12} />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 py-5 space-y-4">

        {/* Profile hero — reusing the existing ProfileHeader component */}
        <ProfileHeader profile={profile} />

        {/* KYC status */}
        <KycBanner status={profile.kycStatus} />

        {/* Financial stats — reusing existing ProfileStatsCards */}
        <ProfileStatsCards profile={profile} stats={stats} />

        {/* ── Detail sections ───────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Contact information */}
          <Section title="Contact Information" icon={Mail}>
            <Field
              label="Email address"
              value={profile.email}
              missing={!profile.email}
              badge={<VerifiedBadge verified={!!profile.email} />}
            />
            <Field
              label="Phone number"
              value={
                profile.phone
                  ? `+91 ${profile.phone.slice(0, 5)} ${profile.phone.slice(5)}`
                  : null
              }
              missing={!profile.phone}
              badge={<VerifiedBadge verified={!!profile.phone} />}
            />
          </Section>

          {/* Personal information */}
          <Section title="Personal Information" icon={UserCircle}>
            <Field label="Full name"      value={profile.name} />
            <Field
              label="Date of birth"
              value={profile.dob ? formatDate(profile.dob) : null}
              missing={!profile.dob}
            />
            <Field
              label="Gender"
              value={
                profile.gender
                  ? profile.gender.charAt(0) + profile.gender.slice(1).toLowerCase().replace(/_/g, " ")
                  : null
              }
              missing={!profile.gender}
            />
            <Field
              label="Marital status"
              value={
                profile.maritalStatus
                  ? profile.maritalStatus.charAt(0) + profile.maritalStatus.slice(1).toLowerCase()
                  : null
              }
              missing={!profile.maritalStatus}
            />
          </Section>

          {/* Account information */}
          <Section title="Account Information" icon={User}>
            <Field
              label="Member since"
              value={formatDate(profile.createdAt)}
            />
            <Field
              label="Last login"
              value={formatDateTime(profile.lastLoginAt)}
            />
            <Field
              label="Account status"
              value={profile.isFrozen ? "Frozen" : "Active"}
              badge={
                <span className={cn(
                  "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                  profile.isFrozen
                    ? "bg-red-50 border-red-100 text-red-700"
                    : "bg-emerald-50 border-emerald-100 text-emerald-700"
                )}>
                  {profile.isFrozen ? "Frozen" : "Active"}
                </span>
              }
            />
            <Field
              label="KYC status"
              value={profile.kycStatus.replace(/_/g, " ")}
              badge={
                profile.kycVerified
                  ? <VerifiedBadge verified />
                  : undefined
              }
            />
          </Section>

          {/* Security */}
          <Section title="Security" icon={Shield}>
            <SecurityRow
              icon={Smartphone}
              label="Last login"
              value={formatDateTime(profile.lastLoginAt)}
              status="info"
            />
            <SecurityRow
              icon={Lock}
              label="Password"
              value="Protected"
              status="inactive"
            />
            <SecurityRow
              icon={Shield}
              label="Two-factor authentication"
              value={profile.twoFactorEnabled ? "Enabled" : "Not enabled"}
              status={profile.twoFactorEnabled ? "active" : "inactive"}
            />
          </Section>

        </div>

        {/* ── Quick actions ─────────────────────────────────────────────── */}
        <Section title="Quick Actions" icon={CalendarDays}>
          <QuickLink
            icon={Edit3}
            label="Edit Profile"
            sub="Update your name, email, or phone"
            href="/dashboard/profile/edit"
            color="slate"
          />
          <QuickLink
            icon={FileCheck}
            label="KYC Verification"
            sub="Verify your identity to unlock all features"
            href="/dashboard/kyc"
            color="blue"
          />
          <QuickLink
            icon={Wallet}
            label="Wallet"
            sub="Add money and manage your balance"
            href="/dashboard/wallet"
            color="emerald"
          />
          <QuickLink
            icon={Receipt}
            label="Transaction History"
            sub="View all deposits and withdrawals"
            href="/dashboard/transactions"
            color="slate"
          />
          <QuickLink
            icon={BarChart3}
            label="My Investments"
            sub="Track all your active and completed plans"
            href="/dashboard/my-investments"
            color="violet"
          />
          <QuickLink
            icon={HelpCircle}
            label="Help & Support"
            sub="Get assistance from our team"
            href="/dashboard"
            color="amber"
          />
        </Section>

        {/* Footer spacer */}
        <div className="pb-4" />
      </div>
    </div>
  );
}
