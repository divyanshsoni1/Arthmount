import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, SITE } from "@/lib/seo";
import { investmentPlanJsonLd, webPageJsonLd } from "@/lib/jsonld";
import { Breadcrumb } from "@/components/breadcrumb/Breadcrumb";
import { SiteFooter } from "@/components/site-footer/SiteFooter";
import { PublicNavbar } from "@/components/navbar/PublicNavbar";

export const metadata: Metadata = buildMetadata({
  title:       "Investment Plans — Starter, Growth, Elite & Premium",
  description: "Explore Arthmount's curated investment plans. From Starter at ₹5,000 to Premium — each plan delivers daily returns with transparent terms and flexible tenures.",
  keywords: [
    "Arthmount investment plans", "starter investment plan India",
    "growth investment plan", "elite investment plan", "premium investment plan",
    "daily return investment plans", "best investment plans India 2024",
    "invest ₹5000 daily returns", "online investment plan with daily profit",
  ],
  canonicalPath: "/investment-plans",
});

const PLANS = [
  {
    name:         "Starter Plan",
    slug:         "starter",
    badge:        "Best for Beginners",
    badgeColor:   "bg-blue-50 text-blue-700 border-blue-200",
    minAmount:    "₹5,000",
    maxAmount:    "₹24,999",
    dailyReturn:  "0.8%",
    tenure:       "30 days",
    description:  "Perfect for first-time investors. Low entry threshold with daily profit credits and full capital return at maturity.",
    highlights:   ["Daily profit to wallet", "Capital returned at tenure end", "No lock-in penalties", "24/7 dashboard access"],
    popular:      false,
    minInvestment: "5000",
    returnRate:   "0.8",
  },
  {
    name:         "Growth Plan",
    slug:         "growth",
    badge:        "Most Popular",
    badgeColor:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    minAmount:    "₹25,000",
    maxAmount:    "₹99,999",
    dailyReturn:  "1.2%",
    tenure:       "60 days",
    description:  "The most chosen plan by active investors. Higher daily returns with a 60-day tenure and same-day withdrawal processing.",
    highlights:   ["1.2% daily profit", "60-day tenure", "Priority withdrawals", "Profit analytics dashboard"],
    popular:      true,
    minInvestment: "25000",
    returnRate:   "1.2",
  },
  {
    name:         "Elite Plan",
    slug:         "elite",
    badge:        "High Returns",
    badgeColor:   "bg-purple-50 text-purple-700 border-purple-200",
    minAmount:    "₹1,00,000",
    maxAmount:    "₹4,99,999",
    dailyReturn:  "1.8%",
    tenure:       "90 days",
    description:  "Designed for serious investors seeking higher compounded returns. Dedicated support and priority payout processing.",
    highlights:   ["1.8% daily profit", "90-day tenure", "Dedicated support", "Early withdrawal option"],
    popular:      false,
    minInvestment: "100000",
    returnRate:   "1.8",
  },
  {
    name:         "Premium Plan",
    slug:         "premium",
    badge:        "Maximum Growth",
    badgeColor:   "bg-amber-50 text-amber-700 border-amber-200",
    minAmount:    "₹5,00,000+",
    maxAmount:    null,
    dailyReturn:  "2.5%",
    tenure:       "180 days",
    description:  "Our flagship plan for high-net-worth investors. Maximum daily returns, personalised management, and exclusive benefits.",
    highlights:   ["2.5% daily profit", "180-day tenure", "Personal account manager", "Instant withdrawals"],
    popular:      false,
    minInvestment: "500000",
    returnRate:   "2.5",
  },
] as const;

export default function InvestmentPlansPage() {
  return (
    <>
      {PLANS.map((plan) => (
        <script
          key={plan.slug}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              investmentPlanJsonLd({
                name:          plan.name,
                description:   plan.description,
                url:           `${SITE.url}/investment-plans#${plan.slug}`,
                minInvestment: plan.minInvestment,
                returnRate:    plan.returnRate,
                tenure:        plan.tenure,
              }),
            ),
          }}
        />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            webPageJsonLd({
              title:       "Investment Plans — Arthmount",
              description: "Explore Arthmount's investment plans with daily returns from 0.8% to 2.5%.",
              path:        "/investment-plans",
              breadcrumbs: [
                { name: "Home",             url: SITE.url },
                { name: "Investment Plans", url: `${SITE.url}/investment-plans` },
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
            <div className="max-w-5xl mx-auto">
              <Breadcrumb
                items={[
                  { label: "Home",             href: "/" },
                  { label: "Investment Plans", href: "/investment-plans" },
                ]}
                className="mb-6"
              />
              <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">
                Choose Your Plan
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight mb-5">
                Investment Plans Built for{" "}
                <span className="text-emerald-600">Every Goal</span>
              </h1>
              <p className="text-lg text-slate-500 leading-[1.75] max-w-2xl">
                Whether you&apos;re starting with ₹5,000 or deploying a larger corpus, Arthmount has a
                professionally managed plan that fits your financial goals — all with transparent
                daily returns and capital protection.
              </p>
            </div>
          </section>

          {/* ── Plans Grid ── */}
          <section className="px-[5%] py-20 bg-white" aria-label="Investment plan options">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-7">
              {PLANS.map((plan) => (
                <article
                  key={plan.slug}
                  id={plan.slug}
                  className={[
                    "relative flex flex-col rounded-3xl border p-8 transition-all duration-300",
                    plan.popular
                      ? "border-emerald-300 shadow-[0_8px_40px_rgba(16,183,127,0.15)] bg-white ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white hover:border-emerald-200 hover:shadow-[0_8px_32px_rgba(16,183,127,0.08)]",
                  ].join(" ")}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md tracking-wide">
                      ⭐ Most Popular
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${plan.badgeColor} mb-3`}>
                        {plan.badge}
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-900">{plan.name}</h2>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-emerald-600">{plan.dailyReturn}</div>
                      <div className="text-xs text-slate-400 font-medium">daily return</div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 leading-[1.65] mb-6">{plan.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Min. Investment</div>
                      <div className="text-base font-bold text-slate-900">{plan.minAmount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Tenure</div>
                      <div className="text-base font-bold text-slate-900">{plan.tenure}</div>
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2.5 text-sm text-slate-600">
                        <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {h}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={[
                      "w-full flex items-center justify-center rounded-xl py-3.5 text-base font-semibold transition-all duration-200",
                      plan.popular
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                        : "bg-slate-900 hover:bg-slate-800 text-white",
                    ].join(" ")}
                    aria-label={`Get started with the ${plan.name}`}
                  >
                    Get Started →
                  </Link>
                </article>
              ))}
            </div>
          </section>

          {/* ── Trust bar ── */}
          <section className="px-[5%] py-14 bg-slate-50 border-t border-slate-100">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Why Invest with Arthmount?</h2>
              <p className="text-slate-500 mb-10 max-w-xl mx-auto">
                Every plan is backed by professional trading, strict risk management, and a
                commitment to returning your capital at tenure end.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { icon: "🔒", title: "Capital Protected",   desc: "Your invested amount is returned in full at the end of every plan tenure." },
                  { icon: "📊", title: "Daily Transparency",  desc: "Real-time dashboard shows every credit, every day. No surprises." },
                  { icon: "⚡", title: "Fast Withdrawals",    desc: "Wallet withdrawals processed within 1–3 business days to your bank account." },
                ].map((item) => (
                  <div key={item.title} className="bg-white rounded-2xl border border-slate-200 p-6 text-left">
                    <div className="text-2xl mb-3" aria-hidden="true">{item.icon}</div>
                    <div className="font-bold text-slate-900 mb-1.5">{item.title}</div>
                    <div className="text-sm text-slate-500 leading-[1.65]">{item.desc}</div>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-sm text-slate-400">
                Have questions?{" "}
                <Link href="/faq" className="text-emerald-600 font-semibold hover:underline">Read our FAQ</Link>{" "}
                or{" "}
                <Link href="/contact" className="text-emerald-600 font-semibold hover:underline">contact support</Link>.
              </p>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
