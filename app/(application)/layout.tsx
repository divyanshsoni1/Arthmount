/**
 * Application route-group layout.
 *
 * AppNavShell is a client component that reads the current pathname and
 * decides whether to render the sticky top nav + mobile bottom nav (for
 * authenticated dashboard routes) or pass children through untouched (for
 * auth routes that own their own full-screen layout).
 *
 * QueryClientProvider lives in the root app/layout.tsx.
 *
 * Metadata: All routes under (application) — dashboard, login, register,
 * forgot-password — are private and must NOT be indexed by search engines.
 * The noindex/nofollow robots directive is set here as a group default.
 * Individual auth pages may export their own metadata for title/description
 * while inheriting this noindex policy.
 */
import type { Metadata } from "next";
import AppNavShell from "@/components/app-nav/AppNavShell";

export const metadata: Metadata = {
  robots: {
    index:  false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppNavShell>{children}</AppNavShell>
    </div>
  );
}
