/**
 * lib/jsonld.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable JSON-LD structured data generators for Arthmount.
 *
 * Usage (in a Server Component or page):
 *   import { organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";
 *
 *   <script
 *     type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
 *   />
 */

import { SITE } from "@/lib/seo";

// ─── Organisation ─────────────────────────────────────────────────────────────

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type":    "FinancialService",
    "@id":      `${SITE.url}/#organization`,
    name:       SITE.fullName,
    alternateName: SITE.name,
    url:        SITE.url,
    logo: {
      "@type":       "ImageObject",
      url:           `${SITE.url}/icons/icon-512x512.png`,
      width:         512,
      height:        512,
      caption:       SITE.name,
    },
    description: SITE.description,
    foundingDate: "2024",
    areaServed:  { "@type": "Country", name: "India" },
    serviceType: [
      "Investment Platform",
      "Wealth Management",
      "Portfolio Management",
      "Financial Services",
    ],
    contactPoint: {
      "@type":             "ContactPoint",
      email:               SITE.email,
      telephone:           SITE.phone,
      contactType:         "customer support",
      availableLanguage:   ["English", "Hindi"],
      hoursAvailable:      "Mo-Sa 09:00-19:00",
      areaServed:          "IN",
    },
    sameAs: [
      // Add official social profiles here when available
      // "https://twitter.com/arthmount",
      // "https://www.linkedin.com/company/arthmount",
    ],
  };
}

// ─── Website (enables sitelinks search box) ───────────────────────────────────

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type":    "WebSite",
    "@id":      `${SITE.url}/#website`,
    url:        SITE.url,
    name:       SITE.name,
    description: SITE.description,
    publisher:  { "@id": `${SITE.url}/#organization` },
    potentialAction: {
      "@type":       "SearchAction",
      target: {
        "@type":     "EntryPoint",
        urlTemplate: `${SITE.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "en-IN",
  };
}

// ─── WebPage ──────────────────────────────────────────────────────────────────

interface WebPageJsonLdOptions {
  title:       string;
  description: string;
  path:        string;
  datePublished?: string;
  dateModified?:  string;
  breadcrumbs?:   Array<{ name: string; url: string }>;
}

export function webPageJsonLd({
  title,
  description,
  path,
  datePublished = "2024-01-01",
  dateModified  = new Date().toISOString().split("T")[0],
  breadcrumbs,
}: WebPageJsonLdOptions) {
  const url = `${SITE.url}${path}`;
  return {
    "@context":     "https://schema.org",
    "@type":        "WebPage",
    "@id":          `${url}#webpage`,
    url,
    name:           title,
    description,
    isPartOf:       { "@id": `${SITE.url}/#website` },
    about:          { "@id": `${SITE.url}/#organization` },
    datePublished,
    dateModified,
    inLanguage:     "en-IN",
    breadcrumb:     breadcrumbs ? breadcrumbListJsonLd(breadcrumbs) : undefined,
    publisher:      { "@id": `${SITE.url}/#organization` },
  };
}

// ─── BreadcrumbList ───────────────────────────────────────────────────────────

export function breadcrumbListJsonLd(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context":   "https://schema.org",
    "@type":      "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type":   "ListItem",
      position:  index + 1,
      name:      item.name,
      item:      item.url,
    })),
  };
}

// ─── FAQPage ──────────────────────────────────────────────────────────────────

export function faqPageJsonLd(
  items: Array<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type":    "FAQPage",
    mainEntity: items.map((item) => ({
      "@type":        "Question",
      name:           item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text:    item.answer,
      },
    })),
  };
}

// ─── Investment product (for investment plan pages) ───────────────────────────

interface InvestmentPlanJsonLdOptions {
  name:        string;
  description: string;
  url:         string;
  minInvestment?: string;
  returnRate?:    string;
  tenure?:        string;
}

export function investmentPlanJsonLd({
  name,
  description,
  url,
  minInvestment,
  returnRate,
  tenure,
}: InvestmentPlanJsonLdOptions) {
  return {
    "@context":   "https://schema.org",
    "@type":      "FinancialProduct",
    "@id":        url,
    name,
    description,
    url,
    provider:     { "@id": `${SITE.url}/#organization` },
    feesAndCommissionsSpecification: "No hidden fees. Returns credited daily.",
    ...(minInvestment && {
      offers: {
        "@type":         "Offer",
        priceCurrency:   "INR",
        price:           minInvestment,
        priceSpecification: {
          "@type":        "PriceSpecification",
          priceCurrency: "INR",
          minPrice:      minInvestment,
        },
      },
    }),
    ...(returnRate && {
      annualPercentageRate: returnRate,
    }),
    ...(tenure && {
      duration: tenure,
    }),
    areaServed:  { "@type": "Country", name: "India" },
    inLanguage:  "en-IN",
  };
}

// ─── How-to / Process (for "How It Works" page) ───────────────────────────────

export function howToJsonLd(
  steps: Array<{ name: string; text: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type":    "HowTo",
    name:       "How to Start Investing on Arthmount",
    description: "Start earning daily returns in 4 simple steps on Arthmount — India's trusted investment platform.",
    totalTime:  "PT5M",
    step:       steps.map((step, index) => ({
      "@type":  "HowToStep",
      position: index + 1,
      name:     step.name,
      text:     step.text,
      url:      `${SITE.url}/how-it-works#step-${index + 1}`,
    })),
    tool: [{
      "@type": "HowToTool",
      name:    "Arthmount Account",
    }],
  };
}

// ─── Local Business (future-ready) ───────────────────────────────────────────

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type":    ["FinancialService", "LocalBusiness"],
    "@id":      `${SITE.url}/#localbusiness`,
    name:       SITE.fullName,
    url:        SITE.url,
    email:      SITE.email,
    telephone:  SITE.phone,
    description: SITE.description,
    currenciesAccepted: "INR",
    paymentAccepted:    "UPI, Bank Transfer, NEFT, IMPS",
    openingHours:       "Mo-Sa 09:00-19:00",
    areaServed:  { "@type": "Country", name: "India" },
    sameAs:      [],
  };
}

// ─── Review / Testimonial (future-ready) ─────────────────────────────────────

export function aggregateRatingJsonLd(ratingValue: number, reviewCount: number) {
  return {
    "@context":     "https://schema.org",
    "@type":        "AggregateRating",
    ratingValue,
    reviewCount,
    bestRating:     5,
    worstRating:    1,
    itemReviewed:   { "@id": `${SITE.url}/#organization` },
  };
}
