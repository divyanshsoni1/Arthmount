"use client";

import { useEffect } from "react";
import Link          from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Edit3,
  FileCheck,
  HelpCircle,
  Mail,
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
import { formatDate, formatDateTime } from "@/api-client/profile";
import ProfileHeader, { ProfileHeaderSkeleton } from "@/components/profile/ProfileHeader";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanize(val: string | null | undefined): string | null {
  if (!val) return null;
  return val
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title:    string;
  icon:     React.ElementType;
  action?:  React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
            <Icon size={13} className="text-slate-500" />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        </div>
        {action}
      </div>
      <div className="h-px bg-slate-100" />
      <div className="px-4 sm:px-5">{children}</div>
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  badge,
}: {
  label:   string;
  value:   string | null | undefined;
  badge?:  React.ReactNode;
}) {
  const isEmpty = !value;
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
      <p className="text-xs font-medium text-slate-400 shrink-0 w-28">{label}</p>
      <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
        <p className={cn(
          "text-sm text-right truncate",
          isEmpty
            ? "italic text-slate-300 font-normal"
            : "font-medium text-slate-700"
        )}>
          {isEmpty ? "Not provided" : value}
        </p>
        {badge}
      </div>
    </div>
  );
}

// ─── Verified badge ───────────────────────────────────────────────────────────

function VerifiedPill({ verified }: { verified: boolean }) {
  return (
    <span className={cn(
      "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5",
      "text-[10px] font-semibold",
      verified
        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
        : "bg-amber-50 border-amber-100 text-amber-700"
    )}>
      {verified ? "Verified" : "Not set"}
    </span>
  );
}

// ─── Contact row (value + pill) ───────────────────────────────────────────────

function ContactRow({
  label,
  value,
  verified,
}: {
  label:    string;
  value:    string | null;
  verified: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
      <p className="text-xs font-medium text-slate-400 shrink-0 w-28">{label}</p>
      <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
        <p className={cn(
          "text-sm text-right truncate",
          !value
            ? "italic text-slate-300 font-normal"
            : "font-medium text-slate-700"
        )}>
          {value ?? "Not provided"}
        </p>
        <VerifiedPill verified={!!value} />
      </div>
    </div>
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
  const dot = { active: "bg-emerald-400", inactive: "bg-slate-300", info: "bg-blue-400" }[status];
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
        <Icon size={13} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-700 truncate">{value}</p>
      </div>
      <div className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
    </div>
  );
}

// ─── Quick link ───────────────────────────────────────────────────────────────

const QL_COLORS: Record<string, string> = {
  slate:   "bg-slate-100 text-slate-500",
  emerald: "bg-emerald-50 text-emerald-600",
  blue:    "bg-blue-50 text-blue-600",
  violet:  "bg-violet-50 text-violet-600",
  amber:   "bg-amber-50 text-amber-600",
};

function QuickLink({
  icon: Icon,
  label,
  sub,
  href,
  color = "slate",
}: {
  icon:   React.ElementType;
  label:  string;
  sub:    string;
  href:   string;
  color?: keyof typeof QL_COLORS;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 py-3 border-b border-slate-50 last:border-0 -mx-4 px-4 sm:-mx-5 sm:px-5 hover:bg-slate-50/70 transition-colors"
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", QL_COLORS[color])}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 truncate">{sub}</p>
      </div>
      <ArrowRight size={14} className="shrink-0 text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-400 transition-all" />
    </Link>
  );
}

// ─── KYC banner ───────────────────────────────────────────────────────────────

const KYC_BANNER: Record<string, { bg: string; text: string; sub: string }> = {
  PENDING:       { bg: "border-amber-100 bg-amber-50",     text: "text-amber-800",   sub: "Complete KYC to unlock investing." },
  IN_REVIEW:     { bg: "border-blue-100 bg-blue-50",       text: "text-blue-800",    sub: "Under review — usually 1–2 business days." },
  APPROVED:      { bg: "border-emerald-100 bg-emerald-50", text: "text-emerald-800", sub: "Your identity is fully verified." },
  AUTO_APPROVED: { bg: "border-emerald-100 bg-emerald-50", text: "text-emerald-800", sub: "Your identity is fully verified." },
  REJECTED:      { bg: "border-red-100 bg-red-50",         text: "text-red-800",     sub: "KYC rejected — please re-submit." },
};

function KycBanner({ status }: { status: string }) {
  const cfg = KYC_BANNER[status] ?? KYC_BANNER.PENDING;
  const isApproved = ["APPROVED", "AUTO_APPROVED"].includes(status);
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3", cfg.bg)}>
      <FileCheck size={15} className={cn("shrink-0", cfg.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-semibold", cfg.text)}>
          KYC · {status.replace(/_/g, " ")}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{cfg.sub}</p>
      </div>
      {!isApproved && (
        <Link
          href="/dashboard/kyc"
          className="shrink-0 rounded-lg border border-current/20 bg-white/80 px-2.5 py-1 text-[11px] font-semibold hover:bg-white transition-colors"
        >
          {status === "REJECTED" ? "Re-submit" : "Complete"}
        </Link>
      )}
    </div>
  );
}

// ─── Edit action chip ─────────────────────────────────────────────────────────

function EditChip({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
    >
      <Edit3 size={10} />
      Edit
    </Link>
  );
}

// ─── Page skeleton ────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-5 space-y-4">
        <ProfileHeaderSkeleton />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router                           = useRouter();
  const { user, isLoading: authLoading } = useUser();
  const { data, isLoading, error }       = useProfile();

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
          <p className="mt-1.5 text-sm text-slate-500">Something went wrong. Please try again.</p>
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

  const { profile } = data;

  // Format phone for display
  const displayPhone = profile.phone
    ? `+91 ${profile.phone.slice(2, 7)} ${profile.phone.slice(7)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-sm font-bold text-slate-900">My Profile</h1>
          </div>
          <Link
            href="/dashboard/profile/edit"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Edit3 size={12} />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-3.5">

        {/* ── Profile hero card ── */}
        <ProfileHeader profile={profile} />

        {/* ── KYC status ── */}
        <KycBanner status={profile.kycStatus} />

        {/* ── Detail sections: 2-col on lg ── */}
        <div className="grid gap-3.5 lg:grid-cols-2">

          {/* Contact Information */}
          <SectionCard
            title="Contact Information"
            icon={Mail}
            action={<EditChip href="/dashboard/profile/edit" />}
          >
            <ContactRow
              label="Email address"
              value={profile.email}
              verified={!!profile.email}
            />
            <ContactRow
              label="Phone number"
              value={displayPhone}
              verified={!!profile.phone}
            />
          </SectionCard>

          {/* Personal Information */}
          <SectionCard
            title="Personal Information"
            icon={UserCircle}
            action={<EditChip href="/dashboard/profile/edit" />}
          >
            <InfoRow label="Full name"      value={profile.name} />
            <InfoRow
              label="Date of birth"
              value={profile.dob ? formatDate(profile.dob) : null}
            />
            <InfoRow label="Gender"         value={humanize(profile.gender)} />
            <InfoRow label="Marital status" value={humanize(profile.maritalStatus)} />
          </SectionCard>

          {/* Account Information */}
          <SectionCard title="Account Information" icon={User}>
            <InfoRow label="Member since"    value={formatDate(profile.createdAt)} />
            <InfoRow label="Last login"      value={formatDateTime(profile.lastLoginAt)} />
            <InfoRow
              label="Account status"
              value={profile.isFrozen ? "Frozen" : "Active"}
              badge={
                <span className={cn(
                  "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  profile.isFrozen
                    ? "bg-red-50 border-red-100 text-red-700"
                    : "bg-emerald-50 border-emerald-100 text-emerald-700"
                )}>
                  {profile.isFrozen ? "Frozen" : "Active"}
                </span>
              }
            />
            <InfoRow
              label="KYC status"
              value={humanize(profile.kycStatus)}
              badge={
                profile.kycVerified
                  ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Verified
                    </span>
                  )
                  : undefined
              }
            />
          </SectionCard>

          {/* Security */}
          <SectionCard title="Security" icon={Shield}>
            <SecurityRow
              icon={Smartphone}
              label="Last login"
              value={formatDateTime(profile.lastLoginAt)}
              status="info"
            />
            <SecurityRow
              icon={Shield}
              label="Two-factor auth"
              value={profile.twoFactorEnabled ? "Enabled" : "Not enabled"}
              status={profile.twoFactorEnabled ? "active" : "inactive"}
            />
          </SectionCard>

        </div>

        {/* ── Quick Actions ── */}
        <SectionCard title="Quick Actions" icon={CalendarDays}>
          <QuickLink
            icon={Edit3}
            label="Edit Profile"
            sub="Update name, email, phone or personal info"
            href="/dashboard/profile/edit"
            color="slate"
          />
          <QuickLink
            icon={FileCheck}
            label="KYC Verification"
            sub="Verify identity to unlock all features"
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
            sub="Track active and completed plans"
            href="/dashboard/my-investments"
            color="violet"
          />
          <QuickLink
            icon={HelpCircle}
            label="Help &amp; Support"
            sub="Get assistance from our team"
            href="/dashboard"
            color="amber"
          />
        </SectionCard>

        <div className="pb-4" />
      </div>
    </div>
  );
}
