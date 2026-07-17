/**
 * app/manifest.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Web App Manifest served at /manifest.webmanifest.
 * Enables PWA install prompts, home-screen icons, and improves mobile SEO
 * signals (particularly on Android / Chrome).
 */

import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             SITE.fullName,
    short_name:       SITE.name,
    description:      SITE.description,
    start_url:        "/",
    display:          "standalone",
    background_color: "#ffffff",
    theme_color:      "#10b981",
    orientation:      "portrait-primary",
    scope:            "/",
    lang:             "en-IN",
    dir:              "ltr",
    categories:       ["finance", "investment", "business"],
    // icons — placeholder paths; replace with real assets once generated.
    // Next.js Manifest types only accept one purpose value per icon entry.
    // Duplicate entries (one "any", one "maskable") is the correct pattern.
    icons: [
      { src: "/icons/icon-72x72.png",   sizes: "72x72",   type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-96x96.png",   sizes: "96x96",   type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png", purpose: "maskable" },
      // 192, 384, 512 — both "any" (for standard display) and "maskable" (for adaptive icons)
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any"      },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "any"      },
      { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any"      },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      {
        src:         "/screenshots/desktop.png",
        sizes:       "1280x720",
        form_factor: "wide",
        type:        "image/png",
        label:       "Arthmount Investment Dashboard — Desktop",
      },
      {
        src:         "/screenshots/mobile.png",
        sizes:       "390x844",
        form_factor: "narrow",
        type:        "image/png",
        label:       "Arthmount Investment Dashboard — Mobile",
      },
    ],
    related_applications:        [],
    prefer_related_applications: false,
  };
}
