/**
 * lib/seo.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised SEO configuration and metadata factory for Arthmount.
 *
 * Usage:
 *   import { buildMetadata, SITE } from "@/lib/seo";
 *   export const metadata = buildMetadata({ title: "Page Title", ... });
 */

import type { Metadata } from "next";

// ─── Site-wide constants ─────────────────────────────────────────────────────

export const SITE = {
  name:        "Arthmount",
  fullName:    "Arthmount Investment Platform",
  tagline:     "Grow Your Wealth, Every Single Day",
  description: "Arthmount delivers daily returns on your investments through professionally managed trading plans — transparent, secure, and built for modern India.",
  url:         process.env.NEXT_PUBLIC_SITE_URL ?? "https://arthmount.com",
  locale:      "en_IN",
  twitterHandle: "@arthmount",
  email:       "support@arthmount.com",
  phone:       "+91 XXXXX XXXXX",
  // Search Console / analytics — set via environment variables so no code
  // changes are needed when IDs are updated.
  googleVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  bingVerification:   process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
  gaMeasurementId:    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  gtmId:              process.env.NEXT_PUBLIC_GTM_ID,
} as const;

// ─── OG image dimensions ─────────────────────────────────────────────────────

export const OG_IMAGE = {
  url:    `${SITE.url}/opengraph-image`,
  width:  1200,
  height: 630,
  alt:    `${SITE.name} — ${SITE.tagline}`,
} as const;

// ─── Default keyword set ─────────────────────────────────────────────────────

export const DEFAULT_KEYWORDS = [
  // Brand
  "Arthmount", "Arthmount investment", "Arthmount platform", "Arthmount wealth",
  // Primary
  "investment platform", "online investment", "investment plans", "smart investment",
  "secure investment", "digital investment", "wealth creation", "portfolio management",
  "passive income", "financial growth",
  // Secondary
  "best investment platform India", "invest online India", "safe investment plans",
  "investment opportunities", "long term investment", "investment returns",
  "online wealth management", "investment dashboard", "investment tracking",
  "portfolio analytics", "daily returns", "daily profit investment",
] as const;

// ─── Metadata factory ─────────────────────────────────────────────────────────

interface BuildMetadataOptions {
  /** Page title — will be appended with "| Arthmount" unless noSuffix=true */
  title: string;
  /** Meta description — aim for 120–160 characters */
  description?: string;
  /** Additional page-specific keywords merged with defaults */
  keywords?: string[];
  /** Canonical path relative to SITE.url, e.g. "/investment-plans" */
  canonicalPath?: string;
  /** Override OG image for this page */
  ogImage?: { url: string; width: number; height: number; alt: string };
  /** Set to true to suppress the " | Arthmount" suffix */
  noSuffix?: boolean;
  /** Prevent indexing — use for auth/dashboard/admin pages */
  noIndex?: boolean;
  /** Open Graph type — defaults to "website" */
  ogType?: "website" | "article" | "profile";
}

export function buildMetadata({
  title,
  description = SITE.description,
  keywords    = [],
  canonicalPath,
  ogImage     = OG_IMAGE,
  noSuffix    = false,
  noIndex     = false,
  ogType      = "website",
}: BuildMetadataOptions): Metadata {
  const fullTitle   = noSuffix ? title : `${title} | ${SITE.name}`;
  const canonical   = canonicalPath ? `${SITE.url}${canonicalPath}` : undefined;
  const allKeywords = [...new Set([...DEFAULT_KEYWORDS, ...keywords])];

  return {
    // ── Core ───────────────────────────────────────────────────────────────
    title:       fullTitle,
    description,
    keywords:    allKeywords,
    authors:     [{ name: SITE.fullName, url: SITE.url }],
    creator:     SITE.name,
    publisher:   SITE.name,
    generator:   "Next.js",
    category:    "Finance",
    applicationName: SITE.name,

    // ── Canonical & alternates ─────────────────────────────────────────────
    ...(canonical && {
      alternates: { canonical },
    }),

    // ── Robots ────────────────────────────────────────────────────────────
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index:  true,
          follow: true,
          googleBot: {
            index:               true,
            follow:              true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet":       -1,
          },
        },

    // ── Open Graph ────────────────────────────────────────────────────────
    openGraph: {
      title:       fullTitle,
      description,
      url:         canonical ?? SITE.url,
      siteName:    SITE.name,
      locale:      SITE.locale,
      type:        ogType,
      images: [
        {
          url:    ogImage.url,
          width:  ogImage.width,
          height: ogImage.height,
          alt:    ogImage.alt,
          type:   "image/png",
        },
      ],
    },

    // ── Twitter / X ───────────────────────────────────────────────────────
    twitter: {
      card:        "summary_large_image",
      title:       fullTitle,
      description,
      site:        SITE.twitterHandle,
      creator:     SITE.twitterHandle,
      images:      [{ url: ogImage.url, alt: ogImage.alt }],
    },

    // ── Verification tokens (read from env) ───────────────────────────────
    verification: {
      ...(SITE.googleVerification && { google: SITE.googleVerification }),
      ...(SITE.bingVerification   && { other: { "msvalidate.01": [SITE.bingVerification] } }),
    },
  };
}

// ─── Utility: absolute URL helper ────────────────────────────────────────────

export function absoluteUrl(path: string): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}
