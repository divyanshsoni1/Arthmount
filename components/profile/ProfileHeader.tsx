"use client";

/**
 * ProfileHeader
 *
 * The large hero section at the top of the View Profile page.
 * Shows avatar, name, member-since, KYC badge, role pill, account status,
 * wallet balance, and a quick "Edit Profile" CTA.
 */

import Link           from "next/link";
import {
  BadgeCheck, CalendarDays, Clock, Crown,
  Edit3, ShieldAlert, ShieldCheck, ShieldX,
  Wallet,
} from "lucide-react";
import { cn }         from "@/lib/utils";
import type { ProfileData } from "@/api-client/profile";
import { formatDate, formatINR } from "@/api-client/profile";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function ProfileAvatar({ name, size = "lg" }: { name: string; size?: "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const gradients = [
    "from-emerald-400 to-emerald-600",
    "from-blue-400 to-blue-600",
    "from-violet-400 to-violet-600",
    "from-pink-400 to-rose-600",
    "from-amber-400 to-orange-500",
    "from-teal-400 to-cyan-600",
  ];
  const grad = gradients[name.charCodeAt(0) % gradients.length];
  const sz   = size === "lg"
    ? "h-20 w-20 text-2xl sm:h-24 sm:w-24 sm:text-3xl"
    : "h-14 w-14 text-lg";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        "bg-gradient-to-br text-white font-bold shadow-lg ring-4 ring-white",
        grad, sz
      )}
      aria-label={`Avatar for ${name}`}
    >
      {initials}
    </div>
  );
}

// ─── KYC badge ────────────────────────────────────────────────────────────────

const KYC_CONFIG: Record<string, {
  label: string;
  cls:   string;
  Icon:  React.ElementType;
}> = {
  PENDING:       { label: "KYC Pending",   cls: "bg-amber-100 text-amber-700 border-amber-200",     Icon: ShieldAlert },
  IN_REVIEW:     { label: "KYC In Review", cls: "bg-blue-100 text-blue-700 border-blue-200",         Icon: Clock       },
  APPROVED:      { label: "KYC Verified",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: ShieldCheck },
  AUTO_APPROVED: { label: "KYC Verified",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: ShieldCheck },
  REJECTED:      { label: "KYC Rejected",  cls: "bg-red-100 text-red-700 border-red-200",            Icon: ShieldX     },
};

function KycBadge({ status }: { status: string }) {
  const cfg = KYC_CONFIG[status] ?? KYC_CONFIG.PENDING;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5",
      "text-[11px] font-semibold",
      cfg.cls
    )}>
      <cfg.Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─── Role pill ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  USER:        "Investor",
  AGENT:       "Agent",
  ADMIN:       "Admin",
  SUPER_ADMIN: "Super Admin",
  SUPPORT:     "Support",
};

function RolePill({ role }: { role: string }) {
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5",
      "text-[11px] font-semibold border",
      isAdmin
        ? "bg-violet-100 text-violet-700 border-violet-200"
        : "bg-slate-100 text-slate-600 border-slate-200"
    )}>
      {isAdmin && <Crown size={10} />}
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ─── Account status ───────────────────────────────────────────────────────────

function AccountStatusBadge({ isFrozen }: { isFrozen: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5",
      "text-[11px] font-semibold",
      isFrozen
        ? "bg-red-100 text-red-700 border-red-200"
        : "bg-emerald-100 text-emerald-700 border-emerald-200"
    )}>
      <BadgeCheck size={11} />
      {isFrozen ? "Frozen" : "Active"}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ProfileHeaderProps {
  profile: ProfileData;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const walletBalance = parseFloat(profile.mainBalance);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      {/* Gradient band at top */}
      <div className="h-24 bg-gradient-to-r from-primary/90 via-primary to-emerald-600/80" />

      <div className="px-5 pb-6 sm:px-7">
        {/* Avatar row — overlaps the gradient band */}
        <div className="flex flex-wrap items-end justify-between gap-4 -mt-10">
          <div className="flex items-end gap-4">
            <ProfileAvatar name={profile.name} />
            <div className="mb-1 space-y-1">
              <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
                {profile.name}
              </h1>
              <div className="flex flex-wrap gap-1.5">
                <KycBadge status={profile.kycStatus} />
                <RolePill role={profile.role} />
                <AccountStatusBadge isFrozen={profile.isFrozen} />
              </div>
            </div>
          </div>

          {/* Edit CTA */}
          <Link
            href="/dashboard/profile/edit"
            className={cn(
              "flex items-center gap-2 rounded-xl border border-slate-200 bg-white",
              "px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm",
              "hover:bg-slate-50 hover:border-slate-300 transition-colors"
            )}
          >
            <Edit3 size={15} />
            Edit Profile
          </Link>
        </div>

        {/* Info grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Member since */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <CalendarDays size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Member Since
              </p>
              <p className="truncate text-sm font-semibold text-slate-800">
                {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>

          {/* Wallet balance */}
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <Wallet size={18} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
                Wallet Balance
              </p>
              <p className="truncate text-sm font-bold text-emerald-700">
                {formatINR(walletBalance)}
              </p>
            </div>
          </div>

          {/* User ID */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 sm:col-span-2 lg:col-span-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <BadgeCheck size={18} className="text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                User ID
              </p>
              <p className="truncate font-mono text-xs font-semibold text-slate-600 sm:text-sm">
                {profile.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

export function ProfileHeaderSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-slate-200 to-slate-300 animate-pulse" />
      <div className="px-5 pb-6 sm:px-7">
        <div className="flex flex-wrap items-end gap-4 -mt-10">
          <div className="h-24 w-24 rounded-full bg-slate-200 animate-pulse ring-4 ring-white" />
          <div className="mb-1 space-y-2">
            <div className="h-6 w-40 rounded-lg bg-slate-200 animate-pulse" />
            <div className="flex gap-1.5">
              <div className="h-5 w-24 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-slate-200 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
