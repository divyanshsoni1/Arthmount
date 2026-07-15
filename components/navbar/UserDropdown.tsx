"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  FileCheck,
  LayoutDashboard,
  LogOut,
  Receipt,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  User,
  Bell,
} from "lucide-react";

import type { AuthUser } from "@/api-client/user";
import { useLogout }    from "@/api-client/user";
import { UserAvatar }   from "./UserAvatar";
import { getDashboardRoute, isAdminRole } from "@/lib/routing";

// User-role menu items — Transaction History is only in this list (not admin)
const USER_MENU_ITEMS = [
  { label: "Profile",             href: "/dashboard/profile",       icon: User            },
  { label: "Invest Now",          href: "/dashboard/invest",        icon: TrendingUp      },
  { label: "My Investments",      href: "/dashboard/my-investments", icon: LayoutDashboard },
  { label: "Withdraw Money",      href: "/dashboard/withdraw",      icon: ArrowUpRight    },
  { label: "Transaction History", href: "/dashboard/transactions",  icon: Receipt         },
  { label: "KYC Verification",    href: "/dashboard/kyc",           icon: FileCheck       },
  { label: "Wallet",              href: "/dashboard/wallet",        icon: Wallet          },
] as const;

// Admin-role menu items
const ADMIN_MENU_ITEMS = [
  { label: "Dashboard",   href: "/admin",       icon: LayoutDashboard },
  { label: "Users",       href: "/admin/users", icon: FileCheck       },
  { label: "KYC Requests",href: "/admin/kyc",   icon: FileCheck       },
  { label: "Analytics",   href: "/admin/analytics", icon: TrendingUp  },
] as const;

interface UserDropdownProps {
  user: AuthUser;
}

/**
 * Circular avatar button that opens a styled dropdown menu.
 *
 * Accessibility:
 *  - button: aria-haspopup="menu" + aria-expanded
 *  - menu: role="menu" + aria-labelledby
 *  - items: role="menuitem"
 *  - ESC closes and returns focus to the trigger
 *  - click-outside closes
 *  - Arrow Up / Down navigates items; Tab closes
 *
 * Animation: opacity + scale + translateY — GPU-friendly, no extra library.
 */
export function UserDropdown({ user }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerId       = useId();
  const menuId          = useId();
  const triggerRef      = useRef<HTMLButtonElement>(null);
  const menuRef         = useRef<HTMLDivElement>(null);

  const logout = useLogout();

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const onPointer = (e: PointerEvent) => {
      if (
        menuRef.current    && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Arrow-key navigation between menu items
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]");
    if (!items?.length) return;

    const focused = document.activeElement as HTMLElement;
    const idx     = Array.from(items).indexOf(focused);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }, []);

  // Focus first item when menu opens
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>("[role=menuitem]");
    const id = setTimeout(() => first?.focus(), 30);
    return () => clearTimeout(id);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);
  const MENU_ITEMS = isAdminRole(user.role) ? ADMIN_MENU_ITEMS : USER_MENU_ITEMS;

  const handleLogout = () => {
    close();
    logout.mutate();
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Open profile menu"
        className={[
          "cursor-pointer rounded-full transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-primary focus-visible:ring-offset-2",
          open ? "ring-2 ring-primary ring-offset-2" : "",
        ].join(" ")}
      >
        <UserAvatar name={user.name} size={36} />
      </button>

      {/* Dropdown panel */}
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-labelledby={triggerId}
        onKeyDown={handleMenuKeyDown}
        className={[
          "absolute right-0 top-[calc(100%+10px)] z-50",
          "w-72 origin-top-right",
          "rounded-2xl border border-white/20",
          "bg-white/95 backdrop-blur-xl",
          "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.18),0_4px_16px_-4px_rgba(0,0,0,0.1)]",
          "transition-all duration-200 ease-out",
          open
            ? "pointer-events-auto scale-100 opacity-100 translate-y-0"
            : "pointer-events-none scale-95 opacity-0 -translate-y-1",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4">
          <UserAvatar name={user.name} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user.name || "User"}
            </p>
            {user.email && (
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            )}
            <span className="mt-0.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {user.role}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-slate-100" />

        {/* Menu items */}
        <div className="p-2">
          {MENU_ITEMS.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={close}
              className={[
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
                "text-sm font-medium text-slate-700 outline-none",
                "transition-colors duration-100",
                "hover:bg-emerald-50 hover:text-emerald-700",
                "focus-visible:bg-emerald-50 focus-visible:text-emerald-700",
              ].join(" ")}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 transition-colors">
                <Icon size={15} strokeWidth={2} />
              </span>
              {label}
            </Link>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-slate-100" />

        {/* Logout */}
        <div className="p-2">
          <button
            type="button"
            role="menuitem"
            tabIndex={open ? 0 : -1}
            onClick={handleLogout}
            disabled={logout.isPending}
            className={[
              "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
              "text-sm font-medium text-red-600 outline-none",
              "transition-colors duration-100",
              "hover:bg-red-50 focus-visible:bg-red-50",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
              <LogOut size={15} strokeWidth={2} />
            </span>
            {logout.isPending ? "Signing out..." : "Logout"}
          </button>
        </div>

        <div className="h-1" />
      </div>
    </div>
  );
}
