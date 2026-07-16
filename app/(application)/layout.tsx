/**
 * Application route-group layout.
 *
 * AppNavShell is a client component that reads the current pathname and
 * decides whether to render the sticky top nav + mobile bottom nav (for
 * authenticated dashboard routes) or pass children through untouched (for
 * auth routes that own their own full-screen layout).
 *
 * QueryClientProvider lives in the root app/layout.tsx.
 */
import AppNavShell from "@/components/app-nav/AppNavShell";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppNavShell>{children}</AppNavShell>
    </div>
  );
}
