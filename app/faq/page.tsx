import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, SITE } from "@/lib/seo";
import { faqPageJsonLd, webPageJsonLd } from "@/lib/jsonld";
import { Breadcrumb } from "@/components/breadcrumb/Breadcrumb";
import { SiteFooter } from "@/components/site-footer/SiteFooter";
import { PublicNavbar } from "@/components/navbar/PublicNavbar";

export const metadata: Metadata = buildMetadata({
  title:       "Frequently Asked Questions — Arthmount Investment Platform",
  description: "Find answers to all your questions about Arthmount — investment plans, daily returns, KYC, withdrawals, security, and account management.",
  keywords: [
    "Arthmount FAQ", "investment platform questions", "how to withdraw from Arthmount",
    "Arthmount KYC questions", "daily returns FAQ", "investment safety India",
    "Arthmount support", "how does Arthmount work",
  ],
  canonicalPath: "/faq",
});

const FAQ_SECTIONS = [
  {
    section: "Getting Started",
    items: [
      {
        q: "What is Arthmount?",
        a: "Arthmount is a professional investment platform that pools investor capital and deploys it through expert trading strategies in Indian financial markets. Investors earn daily returns credited directly to their Arthmount wallet every trading day.",
      },
      {
        q: "Who can invest on Arthmount?",
        a: "Any Indian resident with a valid PAN card and Aadhaar card can invest on Arthmount. You must be 18 years or older to create an account.",
      },
      {
        q: "What is the minimum amount I can invest?",
        a: "The minimum investment is ₹5,000 on the Starter Plan. Other plans have higher minimums — Growth starts at ₹25,000, Elite at ₹1,00,000, and Premium at ₹5,00,000.",
      },
      {
        q: "How do I create an account?",
        a: "Visit arthmount.com, click 'Start Investing', fill in your details, verify your mobile number, and complete KYC verification. The entire process takes under 10 minutes.",
      },
    ],
  },
  {
    section: "KYC Verification",
    items: [
      {
        q: "What documents are needed for KYC?",
        a: "You need your PAN card (front), Aadhaar card (front and back), and a live selfie photo. All documents must be clear, legible, and match your name exactly.",
      },
      {
        q: "How long does KYC take?",
        a: "Most KYC submissions are reviewed and approved within 2–4 hours on business days (Monday–Saturday, 9 AM–7 PM IST). You will receive an email and notification once approved.",
      },
      {
        q: "Can I invest before KYC is approved?",
        a: "No. KYC verification must be completed and approved before you can place any investment. This is a regulatory requirement to protect all investors.",
      },
      {
        q: "What if my KYC is rejected?",
        a: "You'll receive a reason for rejection via email. Common issues include blurry photos, mismatched names, or expired documents. You can resubmit after correcting the issue.",
      },
    ],
  },
  {
    section: "Returns & Profits",
    items: [
      {
        q: "How are daily returns calculated?",
        a: "Your daily return is calculated as a percentage of your invested amount. For example, a ₹50,000 investment on the Growth Plan at 1.2% daily earns ₹600 per trading day.",
      },
      {
        q: "When are profits credited?",
        a: "Profits are credited to your Arthmount wallet every trading day — Monday to Saturday, excluding declared market holidays. Credits typically appear by 8 PM IST each day.",
      },
      {
        q: "Do profits compound?",
        a: "Daily profits are credited to your wallet balance, not added back to your investment principal. You can choose to reinvest your wallet balance by placing a new investment.",
      },
      {
        q: "What happens at the end of the plan tenure?",
        a: "Your full invested capital is returned to your Arthmount wallet at the end of the tenure. You can then reinvest or withdraw as you prefer.",
      },
    ],
  },
  {
    section: "Withdrawals & Wallet",
    items: [
      {
        q: "Can I withdraw my profits anytime?",
        a: "Yes. Your wallet balance (accumulated daily profits) can be withdrawn at any time by submitting a withdrawal request. This does not affect your active investment.",
      },
      {
        q: "How long do withdrawals take?",
        a: "Withdrawal requests are typically processed within 1–3 business days. Funds are transferred directly to your registered bank account via NEFT/IMPS.",
      },
      {
        q: "Is there a minimum withdrawal amount?",
        a: "Yes. The minimum withdrawal amount is ₹500. There is no maximum limit, but large withdrawals may require additional verification.",
      },
      {
        q: "Can I withdraw my invested capital before tenure ends?",
        a: "Early withdrawal of invested capital before tenure end may be subject to terms and conditions specific to each plan. Contact support for details on early exit options.",
      },
    ],
  },
  {
    section: "Security & Safety",
    items: [
      {
        q: "Is my investment safe?",
        a: "Arthmount operates with strict risk management protocols. Your capital is managed by experienced traders and is returned in full at tenure end. However, all investments carry inherent market risk and past performance does not guarantee future results.",
      },
      {
        q: "How does Arthmount protect my personal data?",
        a: "All data is encrypted in transit and at rest. KYC documents are stored securely and only accessible by authorised verification staff. We do not share your personal data with third parties without consent.",
      },
      {
        q: "What security features does my account have?",
        a: "Your account is protected by password authentication, OTP-based login verification, and a transaction PIN. We recommend using a strong, unique password and never sharing your PIN.",
      },
    ],
  },
] as const;

// Flatten all FAQs for JSON-LD
const ALL_FAQS: ReadonlyArray<{ readonly q: string; readonly a: string }> =
  FAQ_SECTIONS.flatMap((s) => s.items as ReadonlyArray<{ readonly q: string; readonly a: string }>);

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            faqPageJsonLd(ALL_FAQS.map((f) => ({ question: f.q, answer: f.a }))),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            webPageJsonLd({
              title:       "FAQ — Arthmount Investment Platform",
              description: "Answers to common questions about Arthmount investments, KYC, withdrawals, and security.",
              path:        "/faq",
              breadcrumbs: [
                { name: "Home", url: SITE.url },
                { name: "FAQ",  url: `${SITE.url}/faq` },
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
                  { label: "Home", href: "/" },
                  { label: "FAQ",  href: "/faq" },
                ]}
                className="mb-6"
              />
              <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">
                Help Centre
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight mb-5">
                Frequently Asked{" "}
                <span className="text-emerald-600">Questions</span>
              </h1>
              <p className="text-lg text-slate-500 leading-[1.75] max-w-2xl">
                Everything you need to know about investing on Arthmount — from account creation
                to daily returns and withdrawals.
              </p>
            </div>
          </section>

          {/* ── FAQ Sections ── */}
          <section className="px-[5%] py-20 bg-white">
            <div className="max-w-4xl mx-auto space-y-14">
              {FAQ_SECTIONS.map((section) => (
                <div key={section.section}>
                  <h2 className="text-xl font-extrabold text-slate-900 mb-6 pb-3 border-b border-slate-100">
                    {section.section}
                  </h2>
                  <div className="space-y-4">
                    {section.items.map((faq) => (
                      <div
                        key={faq.q}
                        className="rounded-2xl border border-slate-200 p-6 hover:border-emerald-200 hover:shadow-[0_4px_20px_rgba(16,183,127,0.06)] transition-all duration-200"
                      >
                        <h3 className="font-semibold text-slate-900 mb-2.5">{faq.q}</h3>
                        <p className="text-sm text-slate-500 leading-[1.75]">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="px-[5%] py-16 bg-slate-50 border-t border-slate-100 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Still have questions?</h2>
              <p className="text-slate-500 mb-8">
                Our support team is available Monday to Saturday, 9 AM – 7 PM IST.
                We typically respond within one business day.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-7 py-3.5 text-base transition-colors shadow-md"
                >
                  Contact Support
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 font-semibold px-7 py-3.5 text-base transition-colors"
                >
                  Start Investing
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
