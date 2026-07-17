import type { Metadata } from "next";
import { buildMetadata, SITE } from "@/lib/seo";
import { webPageJsonLd } from "@/lib/jsonld";
import { Breadcrumb } from "@/components/breadcrumb/Breadcrumb";
import { SiteFooter } from "@/components/site-footer/SiteFooter";
import { PublicNavbar } from "@/components/navbar/PublicNavbar";

export const metadata: Metadata = buildMetadata({
  title:       "Privacy Policy — Arthmount Investment Platform",
  description: "Read Arthmount's privacy policy. Learn how we collect, use, and protect your personal information and investment data in compliance with Indian data protection standards.",
  keywords:    ["Arthmount privacy policy", "investment platform data privacy", "investor data protection India"],
  canonicalPath: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  const lastUpdated = "January 2025";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            webPageJsonLd({
              title:       "Privacy Policy — Arthmount",
              description: "How Arthmount collects, uses, and protects your personal data.",
              path:        "/privacy-policy",
              breadcrumbs: [
                { name: "Home",           url: SITE.url },
                { name: "Privacy Policy", url: `${SITE.url}/privacy-policy` },
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
                  { label: "Home",           href: "/" },
                  { label: "Privacy Policy", href: "/privacy-policy" },
                ]}
                className="mb-6"
              />
              <h1 className="text-4xl font-black text-slate-900 leading-[1.1] tracking-tight mb-3">
                Privacy Policy
              </h1>
              <p className="text-sm text-slate-400">Last updated: {lastUpdated}</p>
            </div>
          </section>

          <section className="px-[5%] py-16">
            <div className="max-w-4xl mx-auto prose prose-slate prose-lg max-w-none">

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-10 not-prose">
                <p className="text-sm text-emerald-800 leading-[1.7]">
                  <strong>Summary:</strong> Arthmount collects only the information necessary to verify
                  your identity, process investments, and provide support. We do not sell your personal
                  data to third parties. Your data is encrypted and stored securely.
                </p>
              </div>

              <h2 className="text-2xl font-extrabold text-slate-900 mt-10 mb-4">1. Information We Collect</h2>
              <p className="text-slate-600 leading-[1.8] mb-4">We collect the following categories of personal information:</p>
              <ul className="space-y-2 text-slate-600 leading-[1.75] mb-6 list-none pl-0">
                {[
                  "Identity information: Full name, date of birth, PAN card number, Aadhaar number",
                  "Contact information: Email address, mobile phone number",
                  "Financial information: Bank account details for withdrawal processing",
                  "KYC documents: PAN card images, Aadhaar card images, selfie photographs",
                  "Transaction data: Investment history, wallet transactions, withdrawal records",
                  "Technical data: IP address, browser type, device information, login timestamps",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <h2 className="text-2xl font-extrabold text-slate-900 mt-10 mb-4">2. How We Use Your Information</h2>
              <p className="text-slate-600 leading-[1.8] mb-4">Your information is used to:</p>
              <ul className="space-y-2 text-slate-600 leading-[1.75] mb-6 list-none pl-0">
                {[
                  "Verify your identity and complete KYC as required by financial regulations",
                  "Process your investments, calculate daily returns, and credit profits",
                  "Process withdrawal requests to your bank account",
                  "Send account notifications, profit statements, and support communications",
                  "Detect and prevent fraud, unauthorised access, and financial crime",
                  "Comply with applicable laws and regulatory requirements",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <h2 className="text-2xl font-extrabold text-slate-900 mt-10 mb-4">3. Data Security</h2>
              <p className="text-slate-600 leading-[1.8] mb-4">
                We implement industry-standard security measures to protect your personal information:
              </p>
              <ul className="space-y-2 text-slate-600 leading-[1.75] mb-6 list-none pl-0">
                {[
                  "All data transmitted between your device and our servers is encrypted using TLS/SSL",
                  "Sensitive data is encrypted at rest in our secure database infrastructure",
                  "KYC documents are stored in access-controlled cloud storage with limited authorised access",
                  "Account access is protected by password authentication and OTP verification",
                  "Regular security audits and vulnerability assessments are conducted",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <h2 className="text-2xl font-extrabold text-slate-900 mt-10 mb-4">4. Data Sharing</h2>
              <p className="text-slate-600 leading-[1.8] mb-4">
                Arthmount does not sell, rent, or trade your personal data. We may share your
                information only in the following limited circumstances:
              </p>
              <ul className="space-y-2 text-slate-600 leading-[1.75] mb-6 list-none pl-0">
                {[
                  "With KYC verification service providers who assist in identity verification",
                  "With payment processors and banking partners to facilitate withdrawals",
                  "With regulatory authorities if required by applicable law or court order",
                  "With our cloud infrastructure providers who process data on our behalf under strict data processing agreements",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <h2 className="text-2xl font-extrabold text-slate-900 mt-10 mb-4">5. Data Retention</h2>
              <p className="text-slate-600 leading-[1.8]">
                We retain your personal information for as long as your account is active and for a
                reasonable period thereafter to comply with legal obligations, resolve disputes, and
                enforce our agreements. KYC documents are retained in accordance with applicable
                financial regulations.
              </p>

              <h2 className="text-2xl font-extrabold text-slate-900 mt-10 mb-4">6. Your Rights</h2>
              <p className="text-slate-600 leading-[1.8] mb-4">
                You have the right to access, correct, or request deletion of your personal data.
                To exercise these rights, contact us at{" "}
                <a href="mailto:support@arthmount.com" className="text-emerald-600 hover:underline font-medium">
                  support@arthmount.com
                </a>.
                Note that some data may need to be retained for regulatory compliance even after
                account deletion.
              </p>

              <h2 className="text-2xl font-extrabold text-slate-900 mt-10 mb-4">7. Cookies</h2>
              <p className="text-slate-600 leading-[1.8]">
                We use essential session cookies to maintain your login state and provide a secure
                experience. We do not use third-party advertising or tracking cookies.
              </p>

              <h2 className="text-2xl font-extrabold text-slate-900 mt-10 mb-4">8. Contact Us</h2>
              <p className="text-slate-600 leading-[1.8]">
                For any privacy-related questions or concerns, please contact our data protection team
                at{" "}
                <a href="mailto:support@arthmount.com" className="text-emerald-600 hover:underline font-medium">
                  support@arthmount.com
                </a>.
              </p>

            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
