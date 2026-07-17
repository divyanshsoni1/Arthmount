import type { Metadata } from "next";
import { buildMetadata, SITE } from "@/lib/seo";
import { webPageJsonLd, localBusinessJsonLd } from "@/lib/jsonld";
import { Breadcrumb } from "@/components/breadcrumb/Breadcrumb";
import { SiteFooter } from "@/components/site-footer/SiteFooter";
import { PublicNavbar } from "@/components/navbar/PublicNavbar";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title:       "Contact Arthmount — Investor Support",
  description: "Get in touch with the Arthmount support team. Reach us via email, phone, or WhatsApp. We are available Monday to Saturday, 9 AM – 7 PM IST.",
  keywords: [
    "Arthmount contact", "Arthmount support", "Arthmount email",
    "investment platform support India", "Arthmount customer service",
    "Arthmount helpdesk", "investor support India",
  ],
  canonicalPath: "/contact",
});

const CHANNELS = [
  {
    icon:    "📧",
    title:   "Email Support",
    value:   "support@arthmount.com",
    detail:  "For account queries, KYC issues, and general support. We reply within one business day.",
    action:  { label: "Send Email", href: "mailto:support@arthmount.com" },
  },
  {
    icon:    "📞",
    title:   "Phone Support",
    value:   "+91 XXXXX XXXXX",
    detail:  "Speak directly with a support representative for urgent investment matters.",
    action:  null,
  },
  {
    icon:    "💬",
    title:   "WhatsApp",
    value:   "Available on WhatsApp",
    detail:  "Quick queries and real-time assistance via WhatsApp during support hours.",
    action:  null,
  },
  {
    icon:    "🕐",
    title:   "Support Hours",
    value:   "Mon – Sat, 9 AM – 7 PM IST",
    detail:  "Our team is available 6 days a week. Queries outside hours are addressed the next business day.",
    action:  null,
  },
] as const;

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            webPageJsonLd({
              title:       "Contact Arthmount — Investor Support",
              description: "Get in touch with Arthmount's support team via email, phone, or WhatsApp.",
              path:        "/contact",
              breadcrumbs: [
                { name: "Home",    url: SITE.url },
                { name: "Contact", url: `${SITE.url}/contact` },
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
                  { label: "Contact", href: "/contact" },
                ]}
                className="mb-6"
              />
              <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">
                Get In Touch
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight mb-5">
                We&apos;re Here to{" "}
                <span className="text-emerald-600">Help You Invest</span>
              </h1>
              <p className="text-lg text-slate-500 leading-[1.75] max-w-2xl">
                Whether you have a question about your investment, need help with KYC, or want to
                learn more about our plans — our team is ready to assist.
              </p>
            </div>
          </section>

          {/* ── Contact Channels ── */}
          <section className="px-[5%] py-20 bg-white">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-10">Support Channels</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {CHANNELS.map((ch) => (
                  <div
                    key={ch.title}
                    className="flex flex-col gap-4 p-6 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-[0_4px_20px_rgba(16,183,127,0.07)] transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        aria-hidden="true"
                      >
                        {ch.icon}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{ch.title}</div>
                        <div className="text-sm text-emerald-700 font-semibold">{ch.value}</div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 leading-[1.65]">{ch.detail}</p>
                    {ch.action && (
                      <a
                        href={ch.action.href}
                        className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 text-sm transition-colors self-start"
                      >
                        {ch.action.label}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Quick Links ── */}
          <section className="px-[5%] py-16 bg-slate-50 border-t border-slate-100">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-extrabold text-slate-900 mb-6">Quick Self-Service</h2>
              <p className="text-slate-500 mb-8 text-sm">
                Many common questions are already answered in our help resources:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { title: "FAQ",              href: "/faq",              desc: "Answers to the most common investor questions." },
                  { title: "How It Works",     href: "/how-it-works",     desc: "Step-by-step guide to start investing." },
                  { title: "Investment Plans", href: "/investment-plans", desc: "Compare all available investment plans." },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-200 hover:shadow-[0_4px_20px_rgba(16,183,127,0.07)] transition-all duration-200"
                  >
                    <div className="font-bold text-slate-900 mb-1.5">{item.title}</div>
                    <div className="text-xs text-slate-500">{item.desc}</div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
