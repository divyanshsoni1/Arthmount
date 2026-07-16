"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  TrendingUp,
  Wallet,
  User,
  LayoutDashboard,
  BarChart3,
  Users,
  Package,
} from "lucide-react";
import { useUser } from "@/api-client/user";
import { isAdminRole } from "@/lib/routing";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Match any route that starts with this prefix (for nested routes). */
  matchPrefix?: string;
}

// ─── Route configs ────────────────────────────────────────────────────────────

const USER_NAV: NavItem[] = [
  { label: "Home",      href: "/dashboard",         icon: Home,       matchPrefix: undefined },
  { label: "Invest",    href: "/dashboard/invest",   icon: TrendingUp, matchPrefix: "/dashboard/invest" },
  { label: "Wallet",    href: "/dashboard/wallet",   icon: Wallet,     matchPrefix: "/dashboard/wallet" },
  { label: "Profile",   href: "/dashboard/profile",  icon: User,       matchPrefix: "/dashboard/profile" },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin",              icon: LayoutDashboard, matchPrefix: undefined },
  { label: "Analytics", href: "/admin/analytics",    icon: BarChart3,       matchPrefix: "/admin/analytics" },
  { label: "Users",     href: "/admin/users",        icon: Users,           matchPrefix: "/admin/users" },
  { label: "Packages",  href: "/admin/packages",     icon: Package,         matchPrefix: "/admin/packages" },
];

// ─── Helper — determine active item ──────────────────────────────────────────

function isActive(item: NavItem, pathname: string): boolean {
  // Items without a prefix (e.g. "Home", "Dashboard") must be exact matches
  // so that nested routes don't accidentally highlight them.
  if (!item.matchPrefix) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.matchPrefix + "/");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, isLoading } = useUser();

  // Never render for unauthenticated users or while loading
  if (isLoading || !user) return null;

  const items = isAdminRole(user.role) ? ADMIN_NAV : USER_NAV;

  return (
    <nav
      aria-label="Mobile navigation"
      className={[
        // Only visible on mobile; hidden on sm+ where the sidebar/top-nav is sufficient
        "sm:hidden",
        // Fixed to the bottom, above everything except modals/toasts (z-40)
        "fixed bottom-0 inset-x-0 z-40",
        // Background + border
        "bg-white/95 backdrop-blur-md",
        "border-t border-slate-200/80",
        // Shadow to lift it visually above page content
        "shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.08)]",
        // Safe-area inset for iPhone home indicator
        "pb-[env(safe-area-inset-bottom)]",
      ].join(" ")}
    >
      <ul className="flex items-stretch justify-around h-16">
        {items.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex flex-1 flex-col items-center justify-center gap-1",
                  "min-h-[44px]",           // WCAG touch target
                  "transition-colors duration-150 select-none outline-none",
                  "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset",
                  active
                    ? "text-emerald-600"
                    : "text-slate-400 hover:text-slate-600 active:text-slate-700",
                ].join(" ")}
              >
                {/* Active pill indicator at the top */}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-emerald-500 transition-all duration-200"
                  />
                )}

                {/* Icon */}
                <span
                  className={[
                    "flex items-center justify-center rounded-xl transition-all duration-200",
                    active
                      ? "bg-emerald-50 scale-110 p-1.5"
                      : "p-1.5",
                  ].join(" ")}
                >
                  <Icon
                    size={active ? 20 : 22}
                    strokeWidth={active ? 2.5 : 1.8}
                    aria-hidden="true"
                  />
                </span>

                {/* Label */}
                <span
                  className={[
                    "text-[10px] font-semibold leading-none tracking-tight",
                    "transition-all duration-150",
                    active ? "opacity-100" : "opacity-70",
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
