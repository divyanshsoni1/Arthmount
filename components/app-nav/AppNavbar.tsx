"use client";

import { useState, useEffect, useRef } from "react";
import Link        from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, Bell, Wallet, Home, LayoutDashboard,
  TrendingUp, Receipt, ArrowDownCircle, ArrowUpCircle,
  FileCheck, BarChart3, FileText, Settings, LogOut,
  ChevronRight, HelpCircle, Star, Zap,
  CircleDollarSign, User,
} from "lucide-react";
import { useUser, useLogout } from "@/api-client/user";
import { useDashboard }       from "@/api-client/dashboard";
import { isAdminRole }        from "@/lib/routing";

// ─── Navigation structure ─────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { label: "Home",           href: "/dashboard",         icon: Home           },
      { label: "Portfolio",      href: "/dashboard",         icon: LayoutDashboard },
    ],
  },
  {
    label: "Invest",
    items: [
      { label: "Invest Now",     href: "/dashboard/invest",  icon: TrendingUp     },
      { label: "My Investments", href: "/dashboard/my-investments", icon: BarChart3 },
    ],
  },
  {
    label: "Wallet",
    items: [
      { label: "Wallet & Add Money",  href: "/dashboard/wallet",        icon: Wallet        },
      { label: "Withdraw Money",      href: "/dashboard/withdraw",      icon: ArrowUpCircle },
      { label: "Transaction History", href: "/dashboard/transactions",  icon: Receipt       },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "My Profile",       href: "/dashboard/profile",            icon: User           },
      { label: "KYC Verification", href: "/dashboard/kyc",                icon: FileCheck      },
      { label: "Profit Analytics", href: "/dashboard/profit-analytics",   icon: CircleDollarSign },
      { label: "Reports",          href: "/dashboard",                    icon: FileText       },
      { label: "Settings",         href: "/dashboard",                    icon: Settings       },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Help & FAQs",      href: "/dashboard", icon: HelpCircle },
      { label: "Referral Program", href: "/dashboard", icon: Star       },
    ],
  },
] as const;

// ─── KYC status pill ─────────────────────────────────────────────────────────

function KycPill({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    PENDING:       { cls: "bg-amber-100 text-amber-700",     label: "KYC Pending"   },
    IN_REVIEW:     { cls: "bg-blue-100 text-blue-700",       label: "KYC In Review" },
    APPROVED:      { cls: "bg-emerald-100 text-emerald-700", label: "KYC Verified"  },
    AUTO_APPROVED: { cls: "bg-emerald-100 text-emerald-700", label: "KYC Verified"  },
    REJECTED:      { cls: "bg-red-100 text-red-700",         label: "KYC Rejected"  },
  };
  const c = cfg[status] ?? cfg.PENDING;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.cls}`}>{c.label}</span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    "from-emerald-400 to-emerald-600",
    "from-blue-400 to-blue-600",
    "from-violet-400 to-violet-600",
    "from-pink-400 to-rose-600",
  ];
  const grad = colors[name.charCodeAt(0) % colors.length];
  const sz =
    size === "lg" ? "h-14 w-14 text-xl"
    : size === "md" ? "h-10 w-10 text-sm"
    : "h-8 w-8 text-xs";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${grad} text-white font-bold shadow-sm ${sz}`}
    >
      {initials}
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 mr-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
        <Zap size={13} className="text-white" aria-hidden="true" />
      </div>
      <span className="text-sm font-extrabold text-slate-900 tracking-tight hidden sm:block">
        Arthmount
      </span>
    </Link>
  );
}

// ─── Loading skeleton header ──────────────────────────────────────────────────
// Rendered while useUser() is in-flight. Matches the full header height so
// page layout does not shift. No interactive elements — prevents any flicker
// of authenticated controls.

function HeaderSkeleton() {
  return (
    <header
      aria-hidden="true"
      className="sticky top-0 z-30 flex h-14 items-center border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 shadow-sm"
    >
      {/* Placeholder for hamburger */}
      <div className="h-9 w-9 rounded-xl bg-slate-100 animate-pulse mr-3" />

      <Logo href="/" />

      <div className="flex-1" />

      {/* Placeholder for wallet pill */}
      <div className="hidden sm:block h-7 w-24 rounded-xl bg-slate-100 animate-pulse mr-2" />
      {/* Placeholder for bell */}
      <div className="h-9 w-9 rounded-xl bg-slate-100 animate-pulse mr-1" />
      {/* Placeholder for avatar */}
      <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse ml-1" />
    </header>
  );
}

// ─── Guest header (unauthenticated) ──────────────────────────────────────────
// Shown after the auth check resolves to no user (login page, register page,
// or expired session). Intentionally minimal — no sidebar, wallet, or bell.

function GuestHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 shadow-sm">
      <Logo href="/" />
      <div className="flex-1" />
    </header>
  );
}

// ─── Authenticated navbar ────────────────────────────────────────────────────

function AuthenticatedNavbar() {
  const pathname = usePathname();
  const { user } = useUser();
  // useDashboard is only called when we know the user is authenticated
  const { data } = useDashboard();
  const logout   = useLogout();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Escape key + scroll lock while drawer is open
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open]);

  // user is guaranteed non-null here (parent checks before rendering this)
  const userName      = user!.name;
  const walletBalance = data?.summary?.walletBalance ?? 0;
  const kycStatus     = (user as any)?.kycStatus ?? data?.summary?.user?.kycStatus ?? "PENDING";

  function fmtBalance(n: number) {
    if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
    if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
    return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }

  return (
    <>
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 shadow-sm">

        {/* Hamburger — authenticated only */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="app-drawer"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors mr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Menu size={20} />
        </button>

        <Logo />

        <div className="flex-1" />

        {/* Wallet balance pill — authenticated only, hidden on mobile (bottom nav handles it) */}
        <Link
          href="/dashboard/wallet"
          className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 hover:bg-emerald-100 transition-colors mr-2"
        >
          <Wallet size={13} className="text-emerald-600" aria-hidden="true" />
          <span className="text-xs font-bold text-emerald-700 tabular-nums">
            {fmtBalance(walletBalance)}
          </span>
        </Link>

        {/* Notification bell — authenticated only */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors mr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Bell size={18} />
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
          />
        </button>

        {/* Avatar — authenticated only */}
        <Link
          href="/dashboard/profile"
          aria-label="My profile"
          className="ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full"
        >
          <UserAvatar name={userName} />
        </Link>
      </header>

      {/* ── Backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Slide-out drawer ── */}
      <div
        id="app-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={[
          "fixed inset-y-0 left-0 z-50 w-[300px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600">
              <Zap size={14} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-none">Arthmount</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Investment Platform</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* User profile card */}
        <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-[#141720] to-slate-700 p-4 text-white">
          <Link
            href="/dashboard/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 group"
          >
            <UserAvatar name={userName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate group-hover:text-emerald-300 transition-colors">
                {userName}
              </p>
              <p className="text-[11px] text-white/50 truncate">{user!.email ?? "—"}</p>
              <div className="mt-1.5">
                <KycPill status={kycStatus} />
              </div>
            </div>
            <ChevronRight size={14} className="shrink-0 text-white/30 group-hover:text-white/60 transition-colors" />
          </Link>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <div>
              <p className="text-[10px] text-white/50">Wallet Balance</p>
              <p className="text-base font-extrabold tabular-nums">{fmtBalance(walletBalance)}</p>
            </div>
            <Link
              href="/dashboard/wallet"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-400 transition-colors"
            >
              <ArrowDownCircle size={12} aria-hidden="true" /> Add Money
            </Link>
          </div>
        </div>

        {/* Nav sections */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {NAV_SECTIONS.map((section) => {
            const USER_ONLY_ITEMS = new Set(["Profit Analytics", "Transaction History"]);
            const visibleItems = section.items.filter(({ label }) => {
              if (USER_ONLY_ITEMS.has(label)) return !isAdminRole(user!.role);
              return true;
            });
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.label}>
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map(({ label, href, icon: Icon }) => {
                    const active =
                      href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname === href || pathname.startsWith(href + "/");
                    return (
                      <Link
                        key={label}
                        href={href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={[
                          "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                          active
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                        ].join(" ")}
                      >
                        <span className="flex items-center gap-3">
                          <Icon
                            size={16}
                            aria-hidden="true"
                            className={active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}
                          />
                          {label}
                        </span>
                        {active && (
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="border-t border-slate-100 px-3 py-3 space-y-1">
          <Link
            href="/dashboard/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <User size={16} className="text-slate-400" aria-hidden="true" />
            My Profile
            <ChevronRight size={13} className="ml-auto text-slate-300" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => { setOpen(false); logout.mutate(); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} className="text-red-400" aria-hidden="true" />
            {logout.isPending ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
// Reads auth state once and delegates to the correct sub-component.
// This prevents any authenticated element ever being rendered for a guest,
// and prevents flicker by holding a stable skeleton during the loading phase.

export default function AppNavbar() {
  const { user, isLoading } = useUser();

  if (isLoading)  return <HeaderSkeleton />;
  if (!user)      return <GuestHeader />;
  return <AuthenticatedNavbar />;
}
