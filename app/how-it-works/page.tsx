import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, SITE } from "@/lib/seo";
import { howToJsonLd, webPageJsonLd } from "@/lib/jsonld";
import { Breadcrumb } from "@/components/breadcrumb/Breadcrumb";
import { SiteFooter } from "@/components/site-footer/SiteFooter";
import { PublicNavbar } from "@/components/navbar/PublicNavbar";

export const metadata: Metadata = buildMetadata({
  title:       "How Arthmount Works — Start Investing in 4 Simple Steps",
  description: "Learn how Arthmount works — create an account, complete KYC, choose an investment plan, and start earning daily returns. Get started in minutes.",
  keywords: [
    "how Arthmount works", "how to start investing India",
    "invest online step by step", "KYC investment India", "daily return investment process",
    "how to earn daily returns India", "investment platform guide",
  ],
  canonicalPath: "/how-it-works",
});

const STEPS = [
  {
    num:   "01",
    title: "Create Your Account",
    desc:  "Sign up with your email address and mobile number. The registration process takes under 2 minutes — no paperwork, no branch visits.",
    detail: "You'll set a secure password and receive a one-time verification to confirm your mobile number. Your account is ready immediately after verification.",
    icon:  "👤",
    id:    "step-1",
  },
  {
    num:   "02",
    title: "Complete KYC Verification",
    desc:  "Upload your PAN card and Aadhaar card (front and back), along with a short selfie. Our team reviews and verifies your documents.",
    detail: "KYC is required by financial regulations and protects both you and the platform. Most verifications are approved within a few hours during business days.",
    icon:  "✅",
    id:    "step-2",
  },
  {
    num:   "03",
    title: "Deposit Funds & Choose a Plan",
    desc:  "Add funds to your Arthmount wallet via UPI, NEFT, IMPS, or bank transfer. Then select the investment plan that fits your goals and invest.",
    detail: "Plans start from ₹5,000. Once you invest in a plan, your capital is locked for the plan tenure while daily profits accumulate in your wallet.",
    icon:  "💰",
    id:    "step-3",
  },
  {
    num:   "04",
    title: "Earn Daily & Withdraw",
    desc:  "Every trading day (Monday–Saturday), your plan's daily return percentage is credited to your Arthmount wallet automatically.",
    detail: "You can withdraw your wallet balance to your bank account at any time. Processing typically takes 1–3 business days. At tenure end, your full capital is also returned.",
    icon:  "📈",
    id:    "step-4",
  },
] as const;

const FAQS = [
  { q: "When do I start earning returns?",  a: "Returns start accruing from the next trading day after your investment is confirmed." },
  { q: "What is the minimum investment?",   a: "The Starter Plan begins at ₹5,000. Other plans have higher minimums — check the Investment Plans page for details." },
  { q: "How long does KYC take?",           a: "Most KYC approvals are completed within a few hours on business days. You will receive an email once approved." },
  { q: "Can I invest in multiple plans?",   a: "Yes. You can hold multiple active investments across different plans simultaneously." },
] as const;

export default function HowItWorksPage() {
  const jsonLdSteps = STEPS.map((s) => ({ name: s.title, text: s.detail }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd(jsonLdSteps)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            webPageJsonLd({
              title:       "How Arthmount Works — Start Investing in 4 Simple Steps",
              description: "Learn how to start investing on Arthmount in 4 steps.",
              path:        "/how-it-works",
              breadcrumbs: [
                { name: "Home",         url: SITE.url },
                { name: "How It Works", url: `${SITE.url}/how-it-works` },
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
                  { label: "Home",         href: "/" },
                  { label: "How It Works", href: "/how-it-works" },
                ]}
                className="mb-6"
              />
              <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">
                Simple Process
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight mb-5">
                Start Earning Daily Returns{" "}
                <span className="text-emerald-600">in 4 Steps</span>
              </h1>
              <p className="text-lg text-slate-500 leading-[1.75] max-w-2xl">
                From account creation to your first daily profit — Arthmount makes the investing
                process straightforward. No financial jargon, no complicated processes.
              </p>
              <div className="flex gap-4 mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-7 py-3.5 text-base transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/investment-plans"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 font-semibold px-7 py-3.5 text-base transition-colors"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </section>

          {/* ── Steps ── */}
          <section className="px-[5%] py-20 bg-white" aria-label="Investment process steps">
            <div className="max-w-4xl mx-auto space-y-12">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  id={step.id}
                  className="flex flex-col sm:flex-row gap-8 items-start"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-2xl font-black text-emerald-600 shrink-0">
                      {step.num}
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className="w-0.5 h-12 bg-emerald-100 mt-4 hidden sm:block" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl" aria-hidden="true">{step.icon}</span>
                      <h2 className="text-xl font-extrabold text-slate-900">{step.title}</h2>
                    </div>
                    <p className="text-[1rem] text-slate-600 leading-[1.75] mb-3">{step.desc}</p>
                    <p className="text-sm text-slate-400 leading-[1.7] bg-slate-50 rounded-xl p-4 border border-slate-100">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="px-[5%] py-20 bg-slate-50 border-t border-slate-100">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-8">Common Questions</h2>
              <div className="space-y-4">
                {FAQS.map((faq) => (
                  <div key={faq.q} className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                    <p className="text-sm text-slate-500 leading-[1.7]">{faq.a}</p>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-sm text-slate-500 text-center">
                More questions?{" "}
                <Link href="/faq" className="text-emerald-600 font-semibold hover:underline">
                  Visit our full FAQ
                </Link>
              </p>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
