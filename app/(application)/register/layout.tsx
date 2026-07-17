/**
 * Route-segment layout for /register.
 * Exports page-specific metadata. The page itself is "use client" so metadata
 * must be declared here.
 */
import type { Metadata } from "next";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title:       `Create Your Investment Account | ${SITE.name}`,
  description: `Join Arthmount and start earning daily returns on your investments. Sign up in under 2 minutes, complete KYC, and begin your investment journey today.`,
  robots:      { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
