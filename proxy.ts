/**
 * Next.js 16 proxy — route protection with role-based routing.
 *
 * Single source of truth for all frontend route guards.
 * Backend APIs carry their own requireSession / requireAdmin guards in
 * addition to this layer.
 *
 * Decision tree (in order):
 *   1. Unauthenticated → protected route  : redirect to /login?next=<path>
 *   2. Authenticated   → auth-only route  : redirect to role dashboard
 *   3. Authenticated admin → user-only    : redirect to /admin
 *   4. Authenticated user  → admin route  : redirect to /dashboard
 *   5. Everything else                    : pass through with cache headers
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken }        from "@/lib/jwt";
import { getDashboardRoute, isAdminRole } from "@/lib/routing";

const SESSION_COOKIE = "arthmount_session";

// ─── Route classifications ────────────────────────────────────────────────────

/** Any authenticated session required. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/portfolio",
  "/settings",
  "/transactions",
  "/profile",
  "/wallet",
  "/kyc",
];

/** Admin-only — non-admins are bounced to /dashboard. */
const ADMIN_PREFIXES = ["/admin"];

/**
 * Guest-only — authenticated users are bounced to their dashboard.
 * Includes /login/otp so a logged-in user who navigates there directly
 * is redirected rather than shown the OTP form.
 */
const AUTH_ONLY_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
];

/** User-only — admins are bounced to /admin. */
const USER_ONLY_PREFIXES = ["/dashboard"];

// ─── Shared no-store header helper ───────────────────────────────────────────

function noStore(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

// ─── Proxy ───────────────────────────────────────────────────────────────────

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
      // Expired or tampered token — treat as unauthenticated.
      isAuthenticated = false;
    }
  }

  // ── 1. Unauthenticated → protected route ────────────────────────────────────
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    // Delete the stale cookie so the browser doesn't keep sending it.
    if (token) res.cookies.delete(SESSION_COOKIE);
    return noStore(res);
  }

  if (isAuthenticated) {
    const isAdmin = isAdminRole(userRole);

    // ── 2. Authenticated → guest-only page ─────────────────────────────────
    if (isAuthOnly) {
      return noStore(
        NextResponse.redirect(new URL(getDashboardRoute(userRole), req.url))
      );
    }

    // ── 3. Admin → user-only page ──────────────────────────────────────────
    if (isUserOnly && isAdmin) {
      return noStore(NextResponse.redirect(new URL("/admin", req.url)));
    }

    // ── 4. Non-admin → admin page ──────────────────────────────────────────
    if (isAdminRoute && !isAdmin) {
      return noStore(NextResponse.redirect(new URL("/dashboard", req.url)));
    }
  }

  // ── 5. Pass through — add no-store to protected responses ─────────────────
  const res = NextResponse.next();
  if (isProtected && isAuthenticated) {
    noStore(res);
  }
  return res;
}

export const config = {
  matcher: [
    /*
     * Match every path except:
     *   - _next/static  (compiled assets)
     *   - _next/image   (image optimisation)
     *   - favicon.ico
     *   - api/          (Route Handlers handle their own auth)
     *   - common static file extensions
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
