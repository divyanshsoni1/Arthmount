/**
 * app/admin/layout.tsx  — Server Component wrapper
 * ─────────────────────────────────────────────────────────────────────────────
 * Exports noindex metadata for the entire /admin route segment, then renders
 * the "use client" AdminLayoutClient shell.
 *
 * The actual admin UI (sidebar, breadcrumbs, auth guard) lives in
 * components/admin/AdminLayoutClient.tsx so that the client component
 * boundary is respected while this file stays a Server Component.
 */

import type { Metadata } from "next";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";

export const metadata: Metadata = {
  title:  "Admin Console",
  robots: {
    index:  false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
