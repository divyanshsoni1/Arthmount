/**
 * components/site-footer/SiteFooter.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared site footer used on the landing page and all public static pages.
 * Enhanced with comprehensive internal linking, legal links, investment
 * resources, and structured company information for SEO.
 */

import Link from "next/link";

const PRODUCT_LINKS = [
  { label: "Investment Plans",  href: "/investment-plans" },
  { label: "How It Works",      href: "/how-it-works"     },
  { label: "About Arthmount",   href: "/about"            },
  { label: "FAQ",               href: "/faq"              },
  { label: "Contact Us",        href: "/contact"          },
] as const;

const ACCOUNT_LINKS = [
  { label: "Create Account",    href: "/register"         },
  { label: "Investor Login",    href: "/login"            },
  { label: "KYC Verification",  href: "/register"         },
  { label: "Dashboard",         href: "/dashboard"        },
  { label: "Support",           href: "/contact"          },
] as const;

const LEGAL_LINKS = [
  { label: "Privacy Policy",       href: "/privacy-policy"        },
  { label: "Terms & Conditions",   href: "/terms-and-conditions"  },
  { label: "Risk Disclosure",      href: "/terms-and-conditions#risk" },
  { label: "Refund Policy",        href: "/terms-and-conditions#refund" },
] as const;

const RESOURCE_LINKS = [
  { label: "Investment Guide",     href: "/how-it-works"          },
  { label: "Investment Plans",     href: "/investment-plans"      },
  { label: "Daily Returns",        href: "/#features"             },
  { label: "Security",            href: "/#features"             },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900" aria-label="Site footer">
      {/* ── Main footer grid ── */}
      <div className="max-w-7xl mx-auto px-[5%] pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">

          {/* Brand column — spans 2 cols on large screens */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-flex text-[1.35rem] font-extrabold tracking-tight"
              aria-label="Arthmount — Go to homepage"
            >
              <span className="text-emerald-400">Arth</span>
              <span className="text-white">mount</span>
            </Link>

            <p className="text-sm text-white/50 leading-[1.75] max-w-xs">
              India&apos;s trusted investment platform delivering daily returns through
              professionally managed trading plans. Secure, transparent, and KYC-verified.
            </p>

            <address className="not-italic space-y-1.5">
              <p className="text-xs text-white/40">
                <span className="text-white/60 font-medium">Email:</span>{" "}
                <a
                  href="mailto:support@arthmount.com"
                  className="hover:text-emerald-400 transition-colors"
                >
                  support@arthmount.com
                </a>
              </p>
              <p className="text-xs text-white/40">
                <span className="text-white/60 font-medium">Hours:</span>{" "}
                Mon – Sat, 9 AM – 7 PM IST
              </p>
              <p className="text-xs text-white/40">
                <span className="text-white/60 font-medium">Location:</span>{" "}
                India
              </p>
            </address>
          </div>

          {/* Product */}
          <nav aria-label="Product links">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
              Platform
            </h3>
            <ul className="space-y-2.5" role="list">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/55 hover:text-white/90 transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Account */}
          <nav aria-label="Account links">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
              Account
            </h3>
            <ul className="space-y-2.5" role="list">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/55 hover:text-white/90 transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Resources + Legal */}
          <div className="space-y-8">
            <nav aria-label="Resources links">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
                Resources
              </h3>
              <ul className="space-y-2.5" role="list">
                {RESOURCE_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/55 hover:text-white/90 transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Legal links">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
                Legal
              </h3>
              <ul className="space-y-2.5" role="list">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/55 hover:text-white/90 transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="pt-8 space-y-4">
          <p className="text-center text-[0.8rem] text-white/35">
            © {year} Arthmount Technologies Pvt. Ltd. All rights reserved.
          </p>
          <p className="max-w-2xl mx-auto text-center text-[0.72rem] text-white/30 leading-[1.8]">
            ⚠️ Investment in financial markets involves risk. Past performance is not indicative of
            future results. Please read all{" "}
            <Link href="/terms-and-conditions" className="underline hover:text-white/50 transition-colors">
              terms and conditions
            </Link>{" "}
            before investing. Arthmount is not a registered stockbroker or SEBI-regulated entity.
            Invest responsibly.
          </p>
        </div>
      </div>
    </footer>
  );
}
