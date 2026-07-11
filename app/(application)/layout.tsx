/**
 * Application route-group layout.
 * QueryClientProvider is now at the root layout (app/layout.tsx) so it
 * covers all routes including the public landing page. Nothing extra needed here.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
