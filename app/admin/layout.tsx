"use client";

import { useState } from "react";
import Link          from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, ChevronLeft, ClipboardList, FileCheck,
  LayoutDashboard, LogOut, Menu, Shield, Users, X,
} from "lucide-react";
import { useUser }   from "@/api-client/user";
import { useLogout } from "@/api-client/user";

const NAV = [
  { label: "Dashboard",   href: "/admin",            icon: LayoutDashboard },
  { label: "Users",       href: "/admin/users",       icon: Users           },
  { label: "KYC Requests", href: "/admin/kyc",        icon: FileCheck       },
  { label: "Analytics",   href: "/admin/analytics",   icon: BarChart3       },
  { label: "Audit Logs",  href: "/admin/audit-logs",  icon: ClipboardList   },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, isLoading } = useUser();
  const logout = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect non-admins immediately client-side (proxy handles it too)
  if (!isLoading && user && !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    router.replace("/dashboard");
    return null;
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-slate-200/60">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Shield size={16} className="text-white" />
        </div>
        <span className="text-base font-extrabold text-slate-900 tracking-tight">
          Arthmount <span className="text-primary text-xs font-semibold">Admin</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-primary text-white shadow-sm shadow-primary/25"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <Icon size={17} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-slate-200/60 px-3 py-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{user?.name ?? "Admin"}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          {logout.isPending ? "Signing out..." : "Logout"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-slate-200/60">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={[
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/60 transition-transform duration-200 lg:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}>
        <button
          type="button"
          className="absolute right-3 top-3.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200/60 bg-white px-4">
          <button
            type="button"
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>

          {/* Back to site (public homepage) */}
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft size={13} />
            Back to Site
          </Link>

          <div className="flex-1" />

          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
            Admin Panel
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
