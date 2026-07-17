/**
 * components/breadcrumb/Breadcrumb.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SEO-friendly breadcrumb navigation component.
 *
 * - Renders a <nav aria-label="Breadcrumb"> with semantic <ol> markup.
 * - Accepts an optional JSON-LD script injection for BreadcrumbList schema.
 * - Used on all public static pages (/about, /faq, /investment-plans, etc.).
 *
 * Usage:
 *   <Breadcrumb
 *     items={[
 *       { label: "Home",             href: "/" },
 *       { label: "Investment Plans", href: "/investment-plans" },
 *     ]}
 *   />
 */

import Link from "next/link";
import { SITE } from "@/lib/seo";
import { breadcrumbListJsonLd } from "@/lib/jsonld";

export interface BreadcrumbItem {
  label: string;
  href:  string;
}

interface BreadcrumbProps {
  items:         BreadcrumbItem[];
  /** Inject JSON-LD BreadcrumbList structured data (default: true) */
  withJsonLd?:   boolean;
  className?:    string;
}

export function Breadcrumb({
  items,
  withJsonLd = true,
  className  = "",
}: BreadcrumbProps) {
  const jsonLdItems = items.map((item) => ({
    name: item.label,
    url:  item.href.startsWith("http") ? item.href : `${SITE.url}${item.href}`,
  }));

  return (
    <>
      {withJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd(jsonLdItems)) }}
        />
      )}

      <nav aria-label="Breadcrumb" className={className}>
        <ol
          className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500"
          role="list"
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-1.5">
                {index > 0 && (
                  <svg
                    className="w-3 h-3 text-slate-300 shrink-0"
                    viewBox="0 0 6 10"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 9l4-4-4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {isLast ? (
                  <span
                    className="font-medium text-slate-700"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-emerald-600 transition-colors duration-150"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
