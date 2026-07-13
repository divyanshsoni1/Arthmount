/**
 * Application route-group layout.
 * Renders the sticky top navigation bar for all user-facing pages.
 * QueryClientProvider lives in the root app/layout.tsx.
 */
import AppNavbar from "@/components/app-nav/AppNavbar";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppNavbar />
      <main>{children}</main>
    </div>
  );
}
