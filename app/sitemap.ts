/**
 * app/sitemap.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Auto-generated XML sitemap served at /sitemap.xml.
 *
 * Includes all public-facing pages with appropriate priority and change
 * frequency values. Future blog posts, investment product pages, and landing
 * pages can be added here once the data sources are available.
 */

import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/** Helper: build a sitemap entry with safe defaults */
function entry(
  path:          string,
  priority:      number = 0.7,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly",
  lastModified:  Date   = new Date(),
): MetadataRoute.Sitemap[number] {
  return {
    url:            `${SITE.url}${path}`,
    lastModified,
    changeFrequency,
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // ── Tier 1 — Homepage (highest priority) ──────────────────────────
    entry("/",                     1.0, "weekly",  now),

    // ── Tier 2 — Core product pages ───────────────────────────────────
    entry("/investment-plans",     0.9, "weekly",  now),
    entry("/how-it-works",         0.9, "monthly", now),

    // ── Tier 3 — Trust & conversion pages ─────────────────────────────
    entry("/about",                0.8, "monthly", now),
    entry("/faq",                  0.8, "weekly",  now),
    entry("/contact",              0.7, "monthly", now),

    // ── Tier 4 — Legal & support ──────────────────────────────────────
    entry("/privacy-policy",       0.5, "yearly",  now),
    entry("/terms-and-conditions", 0.5, "yearly",  now),
    entry("/support",              0.6, "monthly", now),

    // ── Future: Blog / content hub ────────────────────────────────────
    // When a blog is added, fetch posts from the database here and
    // dynamically generate entries. Example:
    //
    // ...posts.map((post) =>
    //   entry(`/blog/${post.slug}`, 0.7, "weekly", new Date(post.updatedAt))
    // ),
    //
    // ── Future: Investment plan detail pages ──────────────────────────
    // ...plans.map((plan) =>
    //   entry(`/investment-plans/${plan.slug}`, 0.85, "weekly", new Date(plan.updatedAt))
    // ),
  ];
}
