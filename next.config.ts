import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["js7wuqn7bhavwavrscbieham7u.srv.us"],

  // ── Security & SEO headers ───────────────────────────────────────────────
  async headers() {
    return [
      // ── Global security headers on all routes ─────────────────────────
      {
        source: "/(.*)",
        headers: [
          {
            key:   "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key:   "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key:   "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key:   "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key:   "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },

      // ── Block indexing of all API routes ──────────────────────────────
      {
        source: "/api/(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          {
            key:   "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },

      // ── Block indexing of admin routes ────────────────────────────────
      {
        source: "/admin/(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/admin",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },

      // ── Block indexing of dashboard & auth routes ─────────────────────
      {
        source: "/dashboard/(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/login(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/register(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/forgot-password(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },

      // ── Long-lived cache for static SEO assets ────────────────────────
      {
        source: "/sitemap.xml",
        headers: [
          {
            key:   "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          {
            key:   "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key:   "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },

  // ── Canonical trailing-slash policy (false = no trailing slash) ──────────
  trailingSlash: false,
};

export default nextConfig;
