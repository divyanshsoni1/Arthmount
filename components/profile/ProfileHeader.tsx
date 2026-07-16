"use client";

/**
 * ProfileHeader — redesigned mobile-first profile hero card.
 *
 * Mobile  : avatar centred, info stacked vertically, badges wrap naturally.
 * Desktop : avatar + name/badges on the left, metadata grid on the right.
 *
 * Features
 * ─────────
 * • Initials avatar with deterministic gradient
 * • Copy-to-clipboard for the User ID (graceful fallback)
 * • KYC / Role / Account-status badges
 * • Member-since chip
 * • "Edit Profile" CTA
 * • Accessible: aria-labels, focus-visible rings
 */

import { useState, useCallback } from "react";
import Link         from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  CheckCheck,
  Clock,
  Copy,
  Crown,
  Edit3,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  UserRound,
} from "lucide-react";
import { cn }                from "@/lib/utils";
import type { ProfileData }  from "@/api-client/profile";
import { formatDate }        from "@/api-client/profile";

// ─── Avatar ───────────────────────────────────────────────────────────────────

const GRADIENTS = [
  "from-emerald-400 to-teal-600",
  "from-blue-400 to-indigo-600",
  "from-violet-400 to-purple-600",
  "from-pink-400 to-rose-600",
  "from-amber-400 to-orange-500",
  "from-cyan-400 to-sky-600",
];

function ProfileAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const grad = GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];

  return (
    <div
      aria-label={`Avatar for ${name}`}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        "ring-4 ring-white shadow-lg",
        // mobile: 72 px, sm+: 88 px
        "h-[72px] w-[72px] text-2xl sm:h-[88px] sm:w-[88px] sm:text-3xl",
        "bg-gradient-to-br",
        grad
      )}
    >
      {initials}
    </div>
  );
}

// ─── KYC badge ────────────────────────────────────────────────────────────────

const KYC_MAP: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  PENDING:       { label: "KYC Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200",     Icon: ShieldAlert },
  IN_REVIEW:     { label: "KYC In Review", cls: "bg-blue-50 text-blue-700 border-blue-200",         Icon: Clock       },
  APPROVED:      { label: "KYC Verified",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: ShieldCheck },
  AUTO_APPROVED: { label: "KYC Verified",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: ShieldCheck },
  REJECTED:      { label: "KYC Rejected",  cls: "bg-red-50 text-red-700 border-red-200",            Icon: ShieldX     },
};

function KycBadge({ status }: { status: string }) {
  const cfg = KYC_MAP[status] ?? KYC_MAP.PENDING;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5",
      "text-[11px] font-semibold leading-none",
      cfg.cls
    )}>
      <cfg.Icon size={10} className="shrink-0" />
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
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5",
      "text-[11px] font-semibold leading-none",
      isAdmin
        ? "bg-violet-50 text-violet-700 border-violet-200"
        : "bg-slate-100 text-slate-600 border-slate-200"
    )}>
      {isAdmin && <Crown size={9} className="shrink-0" />}
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ─── Account status badge ─────────────────────────────────────────────────────

function AccountStatusBadge({ isFrozen }: { isFrozen: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5",
      "text-[11px] font-semibold leading-none",
      isFrozen
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200"
    )}>
      <BadgeCheck size={10} className="shrink-0" />
      {isFrozen ? "Frozen" : "Active"}
    </span>
  );
}

// ─── Copy user ID ─────────────────────────────────────────────────────────────

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(id);
      } else {
        // Fallback for older browsers / restricted contexts
        const el = document.createElement("textarea");
        el.value = id;
        el.style.position = "fixed";
        el.style.opacity  = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently ignore clipboard errors
    }
  }, [id]);

  const truncated = `${id.slice(0, 8)}…${id.slice(-6)}`;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-mono text-xs text-slate-500 truncate" title={id}>
        {truncated}
      </span>
      <button
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy user ID"}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md p-1",
          "text-slate-400 transition-colors",
          "hover:bg-slate-100 hover:text-slate-600",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          copied && "text-emerald-600"
        )}
      >
        {copied
          ? <CheckCheck size={13} />
          : <Copy size={13} />
        }
      </button>
    </div>
  );
}

// ─── Metadata chip ────────────────────────────────────────────────────────────

function MetaChip({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon:    React.ElementType;
  label:   string;
  value:   React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-xl border px-3 py-2.5",
      accent
        ? "border-slate-200/80 bg-slate-50"
        : "border-slate-200/80 bg-slate-50"
    )}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
        <Icon size={14} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <div className="mt-0.5 text-[13px] font-semibold text-slate-700 leading-tight">
          {value}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface ProfileHeaderProps {
  profile: ProfileData;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)] overflow-hidden">

      {/* ── Top section: avatar + name + badges ── */}
      <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        {/* Mobile: centred column / Desktop: side-by-side row */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">

          {/* Left: avatar + name */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <ProfileAvatar name={profile.name} />

            <div className="text-center sm:text-left">
              <h1 className="text-lg font-bold text-slate-900 leading-snug sm:text-xl">
                {profile.name}
              </h1>

              {/* Badges row — wraps on very small screens */}
              <div className="mt-1.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                <AccountStatusBadge isFrozen={profile.isFrozen} />
                <KycBadge status={profile.kycStatus} />
                <RolePill role={profile.role} />
              </div>
            </div>
          </div>

          {/* Right: Edit CTA */}
          <Link
            href="/dashboard/profile/edit"
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white",
              "px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm",
              "hover:bg-slate-50 hover:border-slate-300 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            )}
          >
            <Edit3 size={13} />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-slate-100 mx-5 sm:mx-6" />

      {/* ── Metadata grid ── */}
      <div className="grid grid-cols-1 gap-2.5 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {/* Member since */}
        <MetaChip
          icon={CalendarDays}
          label="Member Since"
          value={formatDate(profile.createdAt)}
        />

        {/* User ID with copy */}
        <MetaChip
          icon={UserRound}
          label="User ID"
          value={<CopyableId id={profile.id} />}
        />

        {/* KYC status detail */}
        <MetaChip
          icon={ShieldCheck}
          label="KYC Status"
          value={profile.kycStatus.replace(/_/g, " ")}
        />
      </div>

    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ProfileHeaderSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="h-[72px] w-[72px] rounded-full bg-slate-200 animate-pulse sm:h-[88px] sm:w-[88px]" />
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <div className="h-5 w-36 rounded bg-slate-200 animate-pulse" />
            <div className="flex gap-1.5">
              {[60, 72, 52].map((w, i) => (
                <div key={i} className={`h-5 w-[${w}px] rounded-full bg-slate-200 animate-pulse`} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="h-px bg-slate-100 mx-5 sm:mx-6" />
      <div className="grid grid-cols-1 gap-2.5 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3 sm:px-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
