import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { SITE, OG_IMAGE } from "@/lib/seo";
import "./globals.css";

// ─── Fonts ───────────────────────────────────────────────────────────────────

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// ─── Viewport (separate export — Next.js 15+ requirement) ────────────────────

export const viewport: Viewport = {
  width:              "device-width",
  initialScale:       1,
  maximumScale:       5,
  userScalable:       true,
  themeColor:         [
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)",  color: "#059669" },
  ],
  colorScheme: "light dark",
};

// ─── Root metadata ────────────────────────────────────────────────────────────
// Page-level metadata overrides these defaults via Next.js metadata merging.

export const metadata: Metadata = {
  // metadataBase is required for absolute OG/Twitter image URLs
  metadataBase: new URL(SITE.url),

  title: {
    default:  `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "Arthmount", "investment platform India", "online investment", "daily returns",
    "wealth creation", "portfolio management", "secure investment", "passive income",
    "investment plans", "financial growth", "invest online India", "KYC verified investment",
  ],
  authors:         [{ name: SITE.fullName, url: SITE.url }],
  creator:         SITE.name,
  publisher:       SITE.name,
  generator:       "Next.js",
  applicationName: SITE.name,
  category:        "Finance",
  referrer:        "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },

  // ── Canonical & alternates ─────────────────────────────────────────────
  alternates: {
    canonical: SITE.url,
    languages: { "en-IN": SITE.url },
  },

  // ── Robots (default — public pages override per-page) ─────────────────
  robots: {
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
    title:       `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url:         SITE.url,
    siteName:    SITE.name,
    locale:      SITE.locale,
    type:        "website",
    images: [
      {
        url:    OG_IMAGE.url,
        width:  OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt:    OG_IMAGE.alt,
        type:   "image/png",
      },
    ],
  },

  // ── Twitter / X ───────────────────────────────────────────────────────
  twitter: {
    card:        "summary_large_image",
    title:       `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    site:        SITE.twitterHandle,
    creator:     SITE.twitterHandle,
    images:      [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }],
  },

  // ── Icons ─────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/favicon.ico",              sizes: "any"    },
      { url: "/icon.svg",                 type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png",   sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png",   sizes: "512x512", type: "image/png" },
    ],
    apple:    [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },

  // ── Manifest ──────────────────────────────────────────────────────────
  manifest: "/manifest.webmanifest",

  // ── Search engine verification tokens (from environment) ──────────────
  verification: {
    ...(SITE.googleVerification && { google: SITE.googleVerification }),
    ...(SITE.bingVerification   && { other:  { "msvalidate.01": [SITE.bingVerification] } }),
  },
};

// ─── Root Layout ─────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-IN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* QueryClientProvider at root so useUser works on every page,
            including the public landing page outside (application) group */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
