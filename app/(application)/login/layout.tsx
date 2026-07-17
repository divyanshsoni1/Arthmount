/**
 * Route-segment layout for /login.
 * Exports page-specific metadata alongside the noindex policy inherited from
 * the (application) group layout. The page itself is "use client" so metadata
 * must be declared here instead.
 */
import type { Metadata } from "next";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title:       `Sign In to Your Account | ${SITE.name}`,
  description: `Sign in to your Arthmount investment account. Access your portfolio, check daily profits, and manage your investments securely.`,
  robots:      { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
