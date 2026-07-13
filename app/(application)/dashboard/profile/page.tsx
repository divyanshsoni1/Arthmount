"use client";

import { useEffect }    from "react";
import Link             from "next/link";
import { useRouter }    from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Edit3,
  FileCheck,
  HelpCircle,
  Lock,
  Mail,
  Phone,
  Receipt,
  Shield,
  ShieldOff,
  Smartphone,
  Wallet,
  Zap,
} from "lucide-react";

import { useUser }      from "@/api-client/user";
import { useProfile }   from "@/api-client/profile";
import { formatDate, formatDateTime, formatINR } from "@/api-client/profile";
import ProfileHeader,    { ProfileHeaderSkeleton }    from "@/components/profile/ProfileHeader";
import ProfileStatsCards, { ProfileStatsCardsSkeleton } from "@/components/profile/ProfileStatsCards";
import { cn }           from "@/lib/utils";

// ─── Quick-action card ────────────────────────────────────────────────────────

interface QuickActionProps {
  icon:    React.ElementType;
  label:   string;
  sub:     string;
  href:    string;
  accent?: "green" | "blue" | "violet" | "amber" | "default";
}

const QA_ACCENT = {
  green:   "border-emerald-100 bg-emerald-50 hover:border-emerald-200 hover:bg-emerald-100",
  blue:    "border-blue-100 bg-blue-50 hover:border-blue-200 hover:bg-blue-100",
  violet:  "border-violet-100 bg-violet-50 hover:border-violet-200 hover:bg-violet-100",
  amber:   "border-amber-100 bg-amber-50 hover:border-amber-200 hover:bg-amber-100",
  default: "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50",
} as const;

const QA_ICON_ACCENT = {
  green:   "bg-emerald-100 text-emerald-600",
  blue:    "bg-blue-100 text-blue-600",
  violet:  "bg-violet-100 text-violet-600",
  amber:   "bg-amber-100 text-amber-600",
  default: "bg-slate-100 text-slate-500",
} as const;

function QuickAction({ icon: Icon, label, sub, href, accent = "default" }: QuickActionProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3.5 rounded-2xl border px-4 py-3.5",
        "transition-all duration-150 group",
        QA_ACCENT[accent]
      )}
    >
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
        QA_ICON_ACCENT[accent]
      )}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">
          {label}
        </p>
        <p className="text-xs text-slate-500 truncate">{sub}</p>
      </div>
      <ArrowLeft size={14} className="shrink-0 rotate-180 text-slate-300 group-hover:text-slate-500 transition-colors" />
    </Link>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  verified,
  missing,
}: {
  icon:      React.ElementType;
  label:     string;
  value:     string | null | undefined;
  verified?: boolean;
  missing?:  boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-slate-100 last:border-0">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className={cn(
          "mt-0.5 text-sm font-medium break-all",
          missing ? "italic text-slate-300" : "text-slate-700"
        )}>
          {value || "Not provided"}
        </p>
      </div>
      {verified !== undefined && (
        <div className="mt-0.5 shrink-0">
          {verified ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <BadgeCheck size={10} /> Verified
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              Unverified
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title:    string;
  icon:     React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon size={16} className="text-primary" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      <div className="px-5 sm:px-6">{children}</div>
    </div>
  );
}

// ─── Security item ────────────────────────────────────────────────────────────

function SecurityItem({
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
  const dot = {
    active:   "bg-emerald-500",
    inactive: "bg-slate-300",
    info:     "bg-blue-400",
  }[status];

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-700 truncate">{value}</p>
      </div>
      <div className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
    </div>
  );
}

// ─── KYC status banner ────────────────────────────────────────────────────────

const KYC_BANNER: Record<string, { bg: string; text: string; sub: string }> = {
  PENDING:       { bg: "border-amber-200 bg-amber-50",     text: "text-amber-800",   sub: "Complete your KYC to unlock all features." },
  IN_REVIEW:     { bg: "border-blue-200 bg-blue-50",       text: "text-blue-800",    sub: "Your documents are under review. Usually takes 1–2 business days." },
  APPROVED:      { bg: "border-emerald-200 bg-emerald-50", text: "text-emerald-800", sub: "Your identity has been fully verified." },
  AUTO_APPROVED: { bg: "border-emerald-200 bg-emerald-50", text: "text-emerald-800", sub: "Your identity has been fully verified." },
  REJECTED:      { bg: "border-red-200 bg-red-50",         text: "text-red-800",     sub: "Your KYC was rejected. Please re-submit your documents." },
};

function KycBanner({ status }: { status: string }) {
  const cfg = KYC_BANNER[status] ?? KYC_BANNER.PENDING;
  const isVerified = ["APPROVED", "AUTO_APPROVED"].includes(status);
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3.5", cfg.bg)}>
      <div className="mt-0.5">
        {isVerified
          ? <BadgeCheck size={18} className="text-emerald-600" />
          : <FileCheck size={18} className="text-amber-600" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-bold", cfg.text)}>KYC Status: {status.replace("_", " ")}</p>
        <p className="text-xs text-slate-500 mt-0.5">{cfg.sub}</p>
      </div>
      {!isVerified && (
        <Link
          href="/dashboard/kyc"
          className="shrink-0 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          {status === "REJECTED" ? "Re-submit" : "Complete"}
        </Link>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router                      = useRouter();
  const { user, isLoading: authLoading } = useUser();
  const { data, isLoading, error }  = useProfile();

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/dashboard/profile");
    }
  }, [user, authLoading, router]);

  if (authLoading || (!data && isLoading)) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Top bar skeleton */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-32 rounded bg-slate-200 animate-pulse" />
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
          <ProfileHeaderSkeleton />
          <ProfileStatsCardsSkeleton />
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center max-w-sm mx-4 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <ShieldOff size={24} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Could not load profile</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Something went wrong fetching your profile. Please try again.
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

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">My Profile</h1>
            <p className="text-xs text-slate-500 mt-0.5">View and manage your account</p>
          </div>
        </div>
        <Link
          href="/dashboard/profile/edit"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Edit3 size={13} />
          Edit
        </Link>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">

        {/* Profile hero */}
        <ProfileHeader profile={profile} />

        {/* KYC banner */}
        <KycBanner status={profile.kycStatus} />

        {/* Stats cards */}
        <ProfileStatsCards profile={profile} stats={stats} />

        {/* Two-column detail grid */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Contact information */}
          <SectionCard title="Contact Information" icon={Mail}>
            <InfoRow
              icon={Mail}
              label="Email Address"
              value={profile.email}
              verified={!!profile.email}
              missing={!profile.email}
            />
            <InfoRow
              icon={Phone}
              label="Phone Number"
              value={profile.phone
                ? `+${profile.phone.slice(0, 2)} ${profile.phone.slice(2, 7)} ${profile.phone.slice(7)}`
                : null
              }
              verified={!!profile.phone}
              missing={!profile.phone}
            />
          </SectionCard>

          {/* Personal information */}
          <SectionCard title="Personal Information" icon={BadgeCheck}>
            <InfoRow
              icon={BadgeCheck}
              label="Full Name"
              value={profile.name}
            />
            <InfoRow
              icon={BarChart3}
              label="Date of Birth"
              value={profile.dob ? formatDate(profile.dob) : null}
              missing={!profile.dob}
            />
            <InfoRow
              icon={BadgeCheck}
              label="Gender"
              value={profile.gender
                ? profile.gender.replace("_", " ")
                : null
              }
              missing={!profile.gender}
            />
            <InfoRow
              icon={BadgeCheck}
              label="Marital Status"
              value={profile.maritalStatus ?? null}
              missing={!profile.maritalStatus}
            />
          </SectionCard>

          {/* Security */}
          <SectionCard title="Security" icon={Shield}>
            <SecurityItem
              icon={Smartphone}
              label="Last Login"
              value={formatDateTime(profile.lastLoginAt)}
              status="info"
            />
            <SecurityItem
              icon={Lock}
              label="Password"
              value="Last changed — not yet tracked"
              status="inactive"
            />
            <SecurityItem
              icon={Shield}
              label="Two-Factor Authentication"
              value={profile.twoFactorEnabled ? "Enabled" : "Disabled"}
              status={profile.twoFactorEnabled ? "active" : "inactive"}
            />
            <SecurityItem
              icon={Smartphone}
              label="Linked Devices"
              value="Coming soon"
              status="inactive"
            />
          </SectionCard>

          {/* Quick actions */}
          <SectionCard title="Quick Actions" icon={Zap}>
            <div className="space-y-2.5 py-3">
              <QuickAction
                icon={Edit3}
                label="Edit Profile"
                sub="Update name, email, or phone"
                href="/dashboard/profile/edit"
                accent="default"
              />
              <QuickAction
                icon={FileCheck}
                label="KYC Verification"
                sub="Verify your identity"
                href="/dashboard/kyc"
                accent="blue"
              />
              <QuickAction
                icon={Wallet}
                label="Wallet"
                sub="Add money &amp; manage balance"
                href="/dashboard/wallet"
                accent="green"
              />
              <QuickAction
                icon={Receipt}
                label="Transaction History"
                sub="View all deposits &amp; withdrawals"
                href="/dashboard/wallet"
                accent="default"
              />
              <QuickAction
                icon={BarChart3}
                label="Investment History"
                sub="Track all your investments"
                href="/dashboard"
                accent="violet"
              />
              <QuickAction
                icon={HelpCircle}
                label="Help &amp; Support"
                sub="Get assistance from our team"
                href="/dashboard"
                accent="amber"
              />
            </div>
          </SectionCard>

        </div>
      </div>
    </div>
  );
}
