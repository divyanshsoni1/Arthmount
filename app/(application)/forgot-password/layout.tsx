/**
 * Route-segment layout for /forgot-password.
 * Exports page-specific metadata. The page itself is "use client" so metadata
 * must be declared here.
 */
import type { Metadata } from "next";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title:       `Reset Your Password | ${SITE.name}`,
  description: `Forgot your Arthmount account password? Reset it securely using your registered phone number or email address.`,
  robots:      { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
