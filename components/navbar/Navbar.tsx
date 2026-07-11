"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserDropdown } from "./UserDropdown";
import { useUser } from "@/api-client/user";

// Nav links — identical on desktop and mobile
const NAV_LINKS = [
  { label: "Features",     href: "#features" },
  { label: "How It Works", href: "#how"      },
  { label: "Download",     href: "#download" },
  { label: "FAQ",          href: "#faq"      },
  { label: "Contact",      href: "#contact"  },
] as const;

// Skeleton shown while the session fetch is in-flight (prevents layout shift)
function AvatarSkeleton() {
  return (
    <span
      className="inline-block h-9 w-9 animate-pulse rounded-full bg-slate-200"
      aria-hidden="true"
    />
  );
}

/**
 * Desktop-only right-side auth controls.
 *
 * States:
 *   loading       -> skeleton
 *   authenticated -> UserDropdown (avatar + dropdown)
 *   guest         -> Login + Start Investing buttons
 */
function DesktopAuthControls() {
  const { user, isLoading } = useUser();

  if (isLoading) return <AvatarSkeleton />;
  if (user)      return <UserDropdown user={user} />;

  return (
    <div className="flex gap-3">
      <Button
       nativeButton={false}
        size="lg"
        variant="outline"
        className="border-slate-200 text-slate-500 hover:text-slate-900 hover:border-emerald-600 rounded-[10px] font-semibold px-5"
        render={<Link href="/login" />}
      >
        Login
      </Button>
      <Button
       nativeButton={false}
        size="lg"
        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)] hover:shadow-[0_12px_36px_rgba(5,150,105,0.28)] hover:-translate-y-0.5 transition-all rounded-[10px] font-semibold px-5"
        render={<Link href="/register" />}
      >
        Start Investing
      </Button>
    </div>
  );
}

/**
 * Mobile-only avatar slot — sits in the top navbar bar,
 * directly to the left of the hamburger button.
 *
 * Renders ONLY when the user is authenticated (or loading).
 * Guests see nothing here — their CTAs live inside the hamburger menu.
 */
function MobileAvatarSlot() {
  const { user, isLoading } = useUser();

  // Guest: render nothing — keeps the navbar bar clean
  if (!isLoading && !user) return null;

  // Loading: skeleton so there's no layout shift when session resolves
  if (isLoading) return <AvatarSkeleton />;

  // Authenticated: full UserDropdown — dropdown opens below the avatar
  return <UserDropdown user={user!} />;
}

/**
 * Content rendered inside the mobile hamburger panel below the nav links.
 * Only shown for guests — authenticated users access their actions via the
 * profile avatar dropdown that sits in the navbar bar.
 */
function MobileMenuActions({ onClose }: { onClose: () => void }) {
  const { user, isLoading } = useUser();

  // Still loading or authenticated — render nothing
  if (isLoading || user) return null;

  // Guest CTAs
  return (
    <div className="flex flex-col gap-3 pt-4">
      <Button
       nativeButton={false}
        size="lg"
        variant="outline"
        className="w-full justify-center"
        render={<Link href="/login" onClick={onClose} />}
      >
        Login
      </Button>
      <Button
        size="lg"
         nativeButton={false}
        className="w-full justify-center bg-emerald-600 hover:bg-emerald-700"
        render={<Link href="/register" onClick={onClose} />}
      >
        Start Investing
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------------

interface NavbarProps {
  /** Active section ID driven by scroll, passed in from the page. */
  activeSection?: string;
}

export function Navbar({ activeSection = "" }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[5%] h-18 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <Link
        href="#home"
        className="text-2xl font-extrabold text-emerald-600 tracking-tight"
      >
        Arth<span className="text-slate-900">mount</span>
      </Link>

      {/* Desktop nav links — hidden on mobile */}
      <ul className="hidden md:flex items-center gap-8" role="list">
        {NAV_LINKS.map(({ label, href }) => {
          const sectionId = href.substring(1);
          return (
            <li key={href}>
              <Link
                href={href}
                className={[
                  "text-[0.9rem] font-medium transition-colors hover:text-slate-900",
                  activeSection === sectionId ? "text-slate-900" : "text-slate-500",
                ].join(" ")}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop auth controls — hidden on mobile */}
      <div className="hidden md:flex items-center">
        <DesktopAuthControls />
      </div>

      {/*
        Mobile right cluster: [avatar?] [hamburger]
        - Avatar only appears when authenticated (MobileAvatarSlot returns null for guests)
        - Both items stay in the top bar at all times
      */}
      <div className="flex items-center gap-2 md:hidden">
        <MobileAvatarSlot />

        <Button
          size="icon-lg"
          variant="ghost"
          className="cursor-pointer"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={30} />}
        </Button>
      </div>

      {/* Mobile hamburger panel */}
      <div
        id="mobile-menu"
        className={[
          "absolute top-18 left-0 right-0",
          "bg-white border-b border-slate-200 shadow-lg",
          "px-[5%] pb-5 pt-4 flex flex-col gap-1 md:hidden",
          "transition-all duration-200 ease-out origin-top",
          mobileOpen
            ? "pointer-events-auto scale-y-100 opacity-100"
            : "pointer-events-none scale-y-95 opacity-0",
        ].join(" ")}
        aria-hidden={!mobileOpen}
      >
        {/* Nav links — always visible */}
        {NAV_LINKS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="text-slate-600 font-medium py-2.5 border-b border-slate-100 hover:text-slate-900 transition-colors"
            onClick={closeMobile}
          >
            {label}
          </Link>
        ))}

        {/* Auth-aware actions below the nav links */}
        <MobileMenuActions onClose={closeMobile} />
      </div>
    </nav>
  );
}
