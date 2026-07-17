import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, SITE } from "@/lib/seo";
import { organizationJsonLd, webPageJsonLd } from "@/lib/jsonld";
import { Breadcrumb } from "@/components/breadcrumb/Breadcrumb";
import { SiteFooter } from "@/components/site-footer/SiteFooter";
import { PublicNavbar } from "@/components/navbar/PublicNavbar";

export const metadata: Metadata = buildMetadata({
  title:       "About Arthmount — India's Trusted Investment Platform",
  description: "Learn about Arthmount's mission, values, and how we help thousands of Indian investors grow their wealth daily through professionally managed investment plans.",
  keywords:    ["about Arthmount", "Arthmount company", "investment platform India", "who is Arthmount", "Arthmount mission"],
  canonicalPath: "/about",
});

const STATS = [
  { val: "₹12Cr+",  label: "Total Invested"      },
  { val: "8,400+",  label: "Active Investors"     },
  { val: "2024",    label: "Founded"              },
  { val: "100%",    label: "KYC Verified"         },
] as const;

const VALUES = [
  {
    icon: "🔒",
    title: "Security First",
    desc: "Every transaction is encrypted. Every account is KYC-verified. Your investment security is non-negotiable.",
  },
  {
    icon: "🔍",
    title: "Full Transparency",
    desc: "Daily profit statements, real-time dashboards, and clear plan terms — no hidden fees, no surprises.",
  },
  {
    icon: "📈",
    title: "Consistent Returns",
    desc: "Our experienced trading team follows disciplined strategies to deliver reliable daily returns to every investor.",
  },
  {
    icon: "🤝",
    title: "Investor Trust",
    desc: "We've built our platform around what investors need most: clear communication, timely withdrawals, and responsive support.",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            webPageJsonLd({
              title:       "About Arthmount — India's Trusted Investment Platform",
              description: "Learn about Arthmount's mission to help Indian investors grow their wealth through daily returns.",
              path:        "/about",
              breadcrumbs: [
                { name: "Home",  url: SITE.url },
                { name: "About", url: `${SITE.url}/about` },
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
                  { label: "Home",  href: "/" },
                  { label: "About", href: "/about" },
                ]}
                className="mb-6"
              />
              <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">
                Our Story
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight mb-5">
                Built to Make Smart Investing{" "}
                <span className="text-emerald-600">Accessible to All</span>
              </h1>
              <p className="text-lg text-slate-500 leading-[1.75] max-w-2xl">
                Arthmount was founded with a single goal: give everyday Indian investors access to the
                kind of consistent, professionally managed returns that were once reserved for the
                privileged few. We combine expert trading with technology to deliver daily profits
                directly to your wallet.
              </p>
            </div>
          </section>

          {/* ── Stats ── */}
          <section className="px-[5%] py-14 bg-white border-b border-slate-100" aria-label="Platform statistics">
            <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-black text-emerald-600 mb-1">{stat.val}</div>
                  <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Mission ── */}
          <section className="px-[5%] py-20 bg-slate-50 border-b border-slate-100">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-extrabold text-slate-900 mb-5">Our Mission</h2>
              <p className="text-[1.05rem] text-slate-600 leading-[1.8] mb-5">
                At Arthmount, we believe wealth creation should not be a luxury. Our mission is to
                democratise access to professional investment management for every Indian — whether you
                are a student investing your first ₹5,000 or a business owner deploying a larger corpus.
              </p>
              <p className="text-[1.05rem] text-slate-600 leading-[1.8]">
                We pool investor capital and deploy it through disciplined trading strategies across
                Indian equities, commodities, and fixed income instruments. Every trading day, profits
                are calculated and credited directly to each investor's Arthmount wallet — with full
                transparency through our real-time dashboard.
              </p>
            </div>
          </section>

          {/* ── Values ── */}
          <section className="px-[5%] py-20 bg-white border-b border-slate-100">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-extrabold text-slate-900 mb-12">What We Stand For</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {VALUES.map((v) => (
                  <div
                    key={v.title}
                    className="flex gap-5 p-6 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-[0_4px_20px_rgba(16,183,127,0.07)] transition-all duration-200"
                  >
                    <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-2xl shrink-0" aria-hidden="true">
                      {v.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1.5">{v.title}</h3>
                      <p className="text-sm text-slate-500 leading-[1.65]">{v.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="px-[5%] py-20 bg-emerald-600 text-white text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-extrabold mb-4">Ready to Grow Your Wealth?</h2>
              <p className="text-lg text-emerald-100 mb-8 leading-[1.7]">
                Join thousands of investors already earning daily returns on Arthmount.
                Start with as little as ₹5,000 — no prior investing experience needed.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-white text-emerald-700 font-semibold px-8 py-3.5 text-base hover:bg-emerald-50 transition-colors shadow-lg"
                >
                  Start Investing Today
                </Link>
                <Link
                  href="/investment-plans"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-400 text-white font-semibold px-8 py-3.5 text-base hover:bg-emerald-700 transition-colors"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
