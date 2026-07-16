"use client";

/**
 * AppNavShell
 *
 * Conditionally renders the top AppNavbar and mobile MobileBottomNav based on
 * the current route. Auth pages (login, register, forgot-password, OTP) use
 * their own full-screen AuthLayout and should not receive any app navigation.
 *
 * This is a client component so it can read the current pathname.
 */

import { usePathname } from "next/navigation";
import AppNavbar       from "@/components/app-nav/AppNavbar";
import MobileBottomNav from "@/components/app-nav/MobileBottomNav";

// Routes that render their own full-screen layout — suppress app nav entirely.
const AUTH_PREFIXES = ["/login", "/register", "/forgot-password"];

function isAuthRoute(pathname: string): boolean {
  return AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

interface AppNavShellProps {
  children: React.ReactNode;
}

export default function AppNavShell({ children }: AppNavShellProps) {
  const pathname = usePathname();
  const auth     = isAuthRoute(pathname);

  if (auth) {
    // Auth pages own their entire layout — render children with no wrapper
    // padding or nav elements so AuthLayout fills the viewport cleanly.
    return <>{children}</>;
  }

  return (
    <>
      <AppNavbar />

      {/*
       * pb-[calc(4rem+env(safe-area-inset-bottom))] reserves space for the
       * fixed MobileBottomNav bar so content is never hidden beneath it.
       * sm:pb-0 removes the padding on tablet/desktop where the bottom nav
       * is hidden.
       */}
      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
        {children}
      </main>

      <MobileBottomNav />
    </>
  );
}
