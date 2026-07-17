/**
 * app/page.tsx  — Server Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Root landing page for Arthmount.
 *
 * This file is a Server Component so it can export `metadata` and inject
 * JSON-LD structured data. All interactive logic lives in LandingPageClient.
 */

import type { Metadata } from "next";
import { buildMetadata, SITE } from "@/lib/seo";
import {
  organizationJsonLd,
  websiteJsonLd,
  webPageJsonLd,
  faqPageJsonLd,
  howToJsonLd,
} from "@/lib/jsonld";
import LandingPageClient from "@/app/_home/LandingPageClient";
import { FAQ_ITEMS } from "@/app/_home/faq-data";

// ─── Page metadata ────────────────────────────────────────────────────────────

export const metadata: Metadata = buildMetadata({
  title:       "Arthmount — Grow Your Wealth, Every Single Day",
  description: "Arthmount delivers daily returns on your investments through professionally managed trading plans — transparent, secure, and built for modern India. Join 8,400+ investors today.",
  keywords: [
    "daily return investment India", "invest online and earn daily",
    "best investment platform India 2024", "KYC verified investment platform",
    "professional wealth management India", "secure online investment",
    "₹12 crore total invested", "investment plans India",
  ],
  canonicalPath: "/",
  noSuffix:      true,
});

// ─── JSON-LD structured data ──────────────────────────────────────────────────

const INVESTMENT_STEPS = [
  { name: "Create Account",        text: "Sign up with your email and complete your profile in under 2 minutes." },
  { name: "Complete KYC",          text: "Upload your Aadhaar & PAN card for a secure, KYC-verified investment profile." },
  { name: "Deposit & Choose Plan", text: "Add funds via UPI or Bank Transfer, then select your preferred investment plan." },
  { name: "Earn Daily",            text: "Watch daily profits credit to your Arthmount wallet automatically every trading day." },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      {/* ── Structured Data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            webPageJsonLd({
              title:       "Arthmount — Grow Your Wealth, Every Single Day",
              description: "India's trusted investment platform with daily returns, bank-grade security, and KYC-verified accounts.",
              path:        "/",
              breadcrumbs: [{ name: "Home", url: SITE.url }],
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            faqPageJsonLd(FAQ_ITEMS.map((f) => ({ question: f.q, answer: f.a }))),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd(INVESTMENT_STEPS)) }}
      />

      {/* ── Client page ── */}
      <LandingPageClient />
    </>
  );
}
