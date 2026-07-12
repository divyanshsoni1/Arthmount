/**
 * Next.js proxy — route protection with role-based routing.
 *
 * Single source of truth for all frontend route guards.
 * Backend APIs have their own requireAdmin guards in addition to this.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken }        from "@/lib/jwt";
import { getDashboardRoute, isAdminRole } from "@/lib/routing";

const SESSION_COOKIE = "arthmount_session";

// Routes that require ANY valid session
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/portfolio",
  "/settings",
  "/transactions",
  "/profile",
];

// Routes only for admins — non-admins are redirected to /dashboard
const ADMIN_PREFIXES = ["/admin"];

// Routes only for unauthenticated users — authenticated users are redirected to their dashboard
const AUTH_ONLY_PREFIXES = ["/login", "/register", "/forgot-password"];

// Routes only for regular users — admins are redirected to /admin
const USER_ONLY_PREFIXES = ["/dashboard"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  const isProtected  = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthOnly   = AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const isUserOnly   = USER_ONLY_PREFIXES.some((p) => pathname.startsWith(p));

  let isAuthenticated = false;
  let userRole        = "";

  if (token) {
    try {
      const payload   = await verifySessionToken(token);
      isAuthenticated = true;
      userRole        = payload.role;
    } catch {
      isAuthenticated = false;
    }
  }

  // Unauthenticated → redirect to /login with return URL
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (isAuthenticated) {
    const isAdmin = isAdminRole(userRole);

    // Admin trying to access a user-only route → redirect to /admin
    if (isUserOnly && isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Non-admin trying to access an admin route → redirect to /dashboard
    if (isAdminRoute && !isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Authenticated user hitting a login/register page → redirect to their dashboard
    if (isAuthOnly) {
      return NextResponse.redirect(new URL(getDashboardRoute(userRole), req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
