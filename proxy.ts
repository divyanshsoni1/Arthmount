/**
 * Next.js proxy — route protection.
 *
 * Uses the Web Crypto-based verifySessionToken from lib/jwt.ts
 * (no external JWT library required — runs natively in the edge runtime).
 *
 * Renamed from middleware.ts → proxy.ts as required by Next.js 16.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/jwt";

const SESSION_COOKIE = "arthmount_session";

// ─── Route definitions ────────────────────────────────────────────────────────

/** Prefixes that require a valid session. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/portfolio",
  "/settings",
  "/transactions",
  "/profile",
];

/** Prefixes that should redirect to /dashboard when already logged in. */
const AUTH_ONLY_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
];

// ─── Proxy ────────────────────────────────────────────────────────────────────

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p));

  let isAuthenticated = false;

  if (token) {
    try {
      await verifySessionToken(token);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Unauthenticated user hitting a protected route → redirect to /login
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);

    const response = NextResponse.redirect(loginUrl);
    // Clear an expired / invalid cookie so the browser doesn't keep sending it
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  // Authenticated user hitting a login/register page → redirect to /dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     *   _next/static, _next/image — static assets served by Next.js
     *   favicon.ico               — browser default request
     *   /api/*                    — API routes handle their own auth
     *   *.svg|png|jpg…            — public image assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
