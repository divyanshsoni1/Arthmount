"use client";

import { useState, useEffect } from "react";
import Link            from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, Bell, CalendarDays, ChevronLeft, ChevronRight, ClipboardList,
  FileCheck, LayoutDashboard, LogOut, Menu, Shield,
  Users, X, TrendingUp, Settings, Search, Activity,
  CircleDot, Package,
} from "lucide-react";
import { useUser, useLogout } from "@/api-client/user";

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard",    href: "/admin",            icon: LayoutDashboard, exact: true  },
      { label: "Analytics",    href: "/admin/analytics",  icon: BarChart3,       exact: false },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Users",        href: "/admin/users",      icon: Users,       exact: false },
      { label: "KYC Requests", href: "/admin/kyc",        icon: FileCheck,   exact: false },
      { label: "Packages",          href: "/admin/packages",         icon: Package,      exact: false },
      { label: "Trading Calendar",  href: "/admin/trading-calendar", icon: CalendarDays, exact: false },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Audit Logs",   href: "/admin/audit-logs", icon: ClipboardList, exact: false },
    ],
  },
] as const;

// ─── Sidebar content (shared between desktop + mobile) ───────────────────────

function SidebarContent({
  collapsed,
  onClose,
}: {
  collapsed: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const logout   = useLogout();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`flex h-16 items-center border-b border-slate-800/60 px-4 ${collapsed ? "justify-center" : "gap-3"}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-900/40">
          <Shield size={17} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-white tracking-tight leading-none">Arthmount</p>
            <p className="text-[10px] font-semibold text-emerald-400 mt-0.5 tracking-widest uppercase">Admin Console</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon, exact }) => {
                const active = exact
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    title={collapsed ? label : undefined}
                    className={[
                      "group flex items-center rounded-xl transition-all duration-150",
                      collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-3 px-3 py-2.5",
                      active
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                    ].join(" ")}
                  >
                    <Icon size={17} className={`shrink-0 transition-colors ${active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                    {!collapsed && (
                      <span className="text-sm font-medium">{label}</span>
                    )}
                    {!collapsed && active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-slate-800/60 p-3 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name ?? "Admin"}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.role?.replace("_", " ")}</p>
            </div>
            <CircleDot size={10} className="shrink-0 text-emerald-400" />
          </div>
        )}
        <button
          type="button"
          onClick={() => logout.mutate()}
          title={collapsed ? "Logout" : undefined}
          className={[
            "flex w-full items-center rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors",
            collapsed ? "h-10 w-10 justify-center mx-auto" : "gap-3 px-3 py-2.5",
          ].join(" ")}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && (logout.isPending ? "Signing out…" : "Logout")}
        </button>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, isLoading } = useUser();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Role guard (proxy handles it server-side; this is a belt-and-suspenders)
  if (!isLoading && user && !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    router.replace("/dashboard");
    return null;
  }

  // Breadcrumb segments
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [{ label: "Admin", href: "/admin" }];
  let acc = "/admin";
  for (const seg of segments) {
    acc += `/${seg}`;
    const isId = /^[0-9a-f-]{20,}$/i.test(seg);
    crumbs.push({ label: isId ? "Detail" : seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), href: acc });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117]">

      {/* ── Desktop sidebar ── */}
      <aside
        className={[
          "hidden lg:flex flex-col bg-[#141720] border-r border-slate-800/60 transition-all duration-200 shrink-0",
          collapsed ? "w-[60px]" : "w-[220px]",
        ].join(" ")}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* ── Mobile overlay + drawer ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={[
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#141720] border-r border-slate-800/60 transition-transform duration-200 lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}>
        <button
          type="button"
          className="absolute right-3 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
          onClick={() => setMobileOpen(false)}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <SidebarContent collapsed={false} onClose={() => setMobileOpen(false)} />
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-[#f8fafc]">

        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white px-4 shadow-sm">

          {/* Mobile hamburger */}
          <button
            type="button"
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={17} />
          </button>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Breadcrumbs */}
          <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <span className="text-slate-300">/</span>}
                {i === crumbs.length - 1
                  ? <span className="font-semibold text-slate-700 truncate">{c.label}</span>
                  : <Link href={c.href} className="hover:text-slate-700 transition-colors truncate">{c.label}</Link>
                }
              </span>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Search hint */}
          <div className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 cursor-default select-none">
            <Search size={13} />
            <span>Quick search…</span>
            <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400">⌘K</span>
          </div>

          {/* Notifications */}
          <button type="button" className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* Activity indicator */}
          <div className="hidden sm:flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5">
            <Activity size={12} className="text-emerald-500" />
            <span className="text-[11px] font-semibold text-emerald-700">Live</span>
          </div>

          {/* Admin badge */}
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <TrendingUp size={12} />
            Back to App
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
