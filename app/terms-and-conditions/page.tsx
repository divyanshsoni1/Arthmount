import type { Metadata } from "next";
import { buildMetadata, SITE } from "@/lib/seo";
import { webPageJsonLd } from "@/lib/jsonld";
import { Breadcrumb } from "@/components/breadcrumb/Breadcrumb";
import { SiteFooter } from "@/components/site-footer/SiteFooter";
import { PublicNavbar } from "@/components/navbar/PublicNavbar";

export const metadata: Metadata = buildMetadata({
  title:       "Terms and Conditions — Arthmount Investment Platform",
  description: "Read Arthmount's terms and conditions governing use of our investment platform. Understand your rights, obligations, risk disclosures, and refund policy.",
  keywords:    ["Arthmount terms and conditions", "investment platform terms", "Arthmount user agreement", "investment risk disclosure India"],
  canonicalPath: "/terms-and-conditions",
});

export default function TermsPage() {
  const lastUpdated = "January 2025";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            webPageJsonLd({
              title:       "Terms and Conditions — Arthmount",
              description: "Terms governing use of Arthmount's investment platform.",
              path:        "/terms-and-conditions",
              breadcrumbs: [
                { name: "Home",                  url: SITE.url },
                { name: "Terms and Conditions",  url: `${SITE.url}/terms-and-conditions` },
              ],
            }),
          ),
        }}
      />

      <div className="min-h-screen bg-white text-slate-900">
        <PublicNavbar />

        <main className="pt-24">
          <section className="px-[5%] py-16 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
            <div className="max-w-4xl mx-auto">
              <Breadcrumb
                items={[
                  { label: "Home",                 href: "/" },
                  { label: "Terms & Conditions",   href: "/terms-and-conditions" },
                ]}
                className="mb-6"
              />
              <h1 className="text-4xl font-black text-slate-900 leading-[1.1] tracking-tight mb-3">
                Terms and Conditions
              </h1>
              <p className="text-sm text-slate-400">Last updated: {lastUpdated}</p>
            </div>
          </section>

          <section className="px-[5%] py-16">
            <div className="max-w-4xl mx-auto space-y-12">

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <p className="text-sm text-amber-800 leading-[1.7]">
                  <strong>Important:</strong> By creating an account and using Arthmount's services,
                  you agree to these terms and conditions. Please read them carefully before investing.
                  If you do not agree, do not use the platform.
                </p>
              </div>

              {[
                {
                  id: "acceptance",
                  title: "1. Acceptance of Terms",
                  body: "By registering on the Arthmount platform, you confirm that you are at least 18 years of age, a resident of India, and that you accept these terms in full. These terms constitute a legally binding agreement between you and Arthmount Technologies Pvt. Ltd.",
                },
                {
                  id: "services",
                  title: "2. Our Services",
                  body: "Arthmount operates as an investment platform that pools investor capital and deploys it through professional trading activities in Indian financial markets. We are not a registered stockbroker, SEBI-regulated entity, or bank. Our services are provided on a best-effort basis and returns are not guaranteed.",
                },
                {
                  id: "kyc",
                  title: "3. KYC and Eligibility",
                  body: "All investors must complete Know Your Customer (KYC) verification before investing. You must provide accurate, complete, and up-to-date identity documents. Submitting false or fraudulent documents will result in immediate account termination and may be reported to relevant authorities.",
                },
                {
                  id: "investment",
                  title: "4. Investment Terms",
                  body: "Once an investment is placed in a plan, the invested capital is locked for the duration of the tenure. Daily returns are credited to your wallet every trading day as per the applicable plan rate. Capital is returned to your wallet at the end of the tenure. Early termination terms vary by plan.",
                },
                {
                  id: "risk",
                  title: "5. Risk Disclosure",
                  body: "All investments involve risk. Past performance of any investment plan does not guarantee future results. The value of investments may go up or down. You could receive less than the amount invested in exceptional circumstances. Arthmount applies strict risk management but cannot guarantee profits under all market conditions. Invest only what you can afford to lose.",
                },
                {
                  id: "withdrawals",
                  title: "6. Withdrawals and Refunds",
                  body: "Wallet balance withdrawals are processed within 1–3 business days to your registered bank account. Capital withdrawal at tenure end is processed within 3–5 business days. Arthmount does not offer refunds on invested capital during the active tenure period unless an early exit option is explicitly available for your plan. Withdrawal of profits does not affect the active investment.",
                },
                {
                  id: "account",
                  title: "7. Account Responsibilities",
                  body: "You are responsible for maintaining the confidentiality of your login credentials and transaction PIN. Do not share your password or PIN with anyone, including Arthmount support staff. Any activity conducted under your account credentials is your responsibility. Report unauthorised access immediately to support@arthmount.com.",
                },
                {
                  id: "prohibited",
                  title: "8. Prohibited Activities",
                  body: "You must not use the platform for money laundering, tax evasion, or any illegal activity. You must not attempt to manipulate, hack, or disrupt the platform. You must not register multiple accounts. Violation of these terms will result in immediate account suspension and may be reported to relevant law enforcement authorities.",
                },
                {
                  id: "liability",
                  title: "9. Limitation of Liability",
                  body: "Arthmount's liability to any investor is limited to the amount of capital invested. We are not liable for indirect, incidental, or consequential losses. We are not responsible for losses arising from market volatility, force majeure events, or circumstances beyond our control.",
                },
                {
                  id: "changes",
                  title: "10. Changes to Terms",
                  body: "Arthmount reserves the right to update these terms at any time. Material changes will be communicated to registered investors via email at least 7 days before they take effect. Continued use of the platform after changes constitutes acceptance of the revised terms.",
                },
                {
                  id: "governing",
                  title: "11. Governing Law",
                  body: "These terms are governed by the laws of India. Any disputes arising from your use of Arthmount will be subject to the exclusive jurisdiction of courts in India.",
                },
              ].map((section) => (
                <div key={section.id} id={section.id}>
                  <h2 className="text-xl font-extrabold text-slate-900 mb-4">{section.title}</h2>
                  <p className="text-slate-600 leading-[1.8]">{section.body}</p>
                </div>
              ))}

              <div className="pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-400">
                  Questions about these terms?{" "}
                  <a href="mailto:support@arthmount.com" className="text-emerald-600 hover:underline font-medium">
                    Contact us at support@arthmount.com
                  </a>
                </p>
              </div>

            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
