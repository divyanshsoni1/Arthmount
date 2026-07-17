import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, SITE } from "@/lib/seo";
import { webPageJsonLd } from "@/lib/jsonld";
import { Breadcrumb } from "@/components/breadcrumb/Breadcrumb";
import { SiteFooter } from "@/components/site-footer/SiteFooter";
import { PublicNavbar } from "@/components/navbar/PublicNavbar";

export const metadata: Metadata = buildMetadata({
  title:       "Support Centre — Arthmount Investment Platform",
  description: "Find help and support resources for your Arthmount investment account. Browse our guides, FAQ, and contact our team for personalised assistance.",
  keywords:    ["Arthmount support", "investment help India", "Arthmount help centre", "investor support"],
  canonicalPath: "/support",
});

const TOPICS = [
  {
    icon:  "🆕",
    title: "Getting Started",
    desc:  "New to Arthmount? Learn how to create your account, complete KYC, and place your first investment.",
    href:  "/how-it-works",
    cta:   "Read Guide",
  },
  {
    icon:  "💰",
    title: "Investment Plans",
    desc:  "Compare all available investment plans, understand daily returns, and choose the right plan for your goals.",
    href:  "/investment-plans",
    cta:   "View Plans",
  },
  {
    icon:  "❓",
    title: "FAQ",
    desc:  "Find answers to the most common questions about accounts, KYC, returns, withdrawals, and security.",
    href:  "/faq",
    cta:   "Browse FAQ",
  },
  {
    icon:  "📞",
    title: "Contact Support",
    desc:  "Need direct help? Reach our support team via email, phone, or WhatsApp during business hours.",
    href:  "/contact",
    cta:   "Contact Us",
  },
] as const;

export default function SupportPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            webPageJsonLd({
              title:       "Support Centre — Arthmount",
              description: "Help and support resources for Arthmount investors.",
              path:        "/support",
              breadcrumbs: [
                { name: "Home",    url: SITE.url },
                { name: "Support", url: `${SITE.url}/support` },
              ],
            }),
          ),
        }}
      />

      <div className="min-h-screen bg-white text-slate-900">
        <PublicNavbar />

        <main className="pt-24">
          {/* ── Hero ── */}
          <section className="px-[5%] py-16 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
            <div className="max-w-4xl mx-auto">
              <Breadcrumb
                items={[
                  { label: "Home",    href: "/" },
                  { label: "Support", href: "/support" },
                ]}
                className="mb-6"
              />
              <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">
                Help Centre
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight mb-5">
                How Can We{" "}
                <span className="text-emerald-600">Help You?</span>
              </h1>
              <p className="text-lg text-slate-500 leading-[1.75] max-w-2xl">
                Browse our guides and resources, or reach out to our team directly.
                We&apos;re here to help you make the most of your Arthmount investment.
              </p>
            </div>
          </section>

          {/* ── Topics ── */}
          <section className="px-[5%] py-20 bg-white">
            <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-7">
              {TOPICS.map((topic) => (
                <div
                  key={topic.title}
                  className="flex flex-col gap-4 p-7 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-[0_8px_32px_rgba(16,183,127,0.08)] transition-all duration-200"
                >
                  <div className="text-3xl" aria-hidden="true">{topic.icon}</div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 mb-2">{topic.title}</h2>
                    <p className="text-sm text-slate-500 leading-[1.7]">{topic.desc}</p>
                  </div>
                  <Link
                    href={topic.href}
                    className="inline-flex items-center text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors mt-auto"
                  >
                    {topic.cta} →
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* ── Contact strip ── */}
          <section className="px-[5%] py-14 bg-emerald-600 text-white text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-extrabold mb-2">Still need help?</h2>
              <p className="text-emerald-100 mb-6">
                Our support team is available Monday – Saturday, 9 AM – 7 PM IST.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl bg-white text-emerald-700 font-semibold px-7 py-3.5 text-base hover:bg-emerald-50 transition-colors shadow-lg"
              >
                Contact Support
              </Link>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
