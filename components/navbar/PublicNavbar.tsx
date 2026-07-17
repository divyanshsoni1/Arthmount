/**
 * components/navbar/PublicNavbar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight server-compatible navigation bar for public static pages
 * (/about, /faq, /investment-plans, /privacy-policy, etc.).
 *
 * Unlike the landing page Navbar (which uses useUser / scroll tracking),
 * this component has NO client-side hooks — it can render as a Server
 * Component, improving LCP on static pages.
 *
 * For auth-awareness on these pages, add "use client" and import useUser
 * if that becomes necessary in the future.
 */

import Link from "next/link";

const NAV_LINKS = [
  { label: "Investment Plans", href: "/investment-plans" },
  { label: "How It Works",     href: "/how-it-works"     },
  { label: "About",            href: "/about"            },
  { label: "FAQ",              href: "/faq"              },
  { label: "Contact",          href: "/contact"          },
] as const;

export function PublicNavbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[5%] h-18 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <Link
        href="/"
        className="text-2xl font-extrabold tracking-tight"
        aria-label="Arthmount — Go to homepage"
      >
        <span className="text-emerald-600">Arth</span>
        <span className="text-slate-900">mount</span>
      </Link>

      {/* Desktop nav links */}
      <ul className="hidden md:flex items-center gap-7" role="list">
        {NAV_LINKS.map(({ label, href }) => (
          <li key={href}>
            <Link
              href={href}
              className="text-[0.9rem] font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Auth CTAs */}
      <div className="hidden md:flex items-center gap-3">
        <Link
          href="/login"
          className="text-[0.9rem] font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-emerald-300 rounded-[10px] px-5 py-2 transition-all"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="text-[0.9rem] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-[10px] px-5 py-2 transition-all shadow-[0_4px_12px_rgba(5,150,105,0.2)]"
        >
          Start Investing
        </Link>
      </div>

      {/* Mobile: just show the CTA */}
      <Link
        href="/register"
        className="md:hidden text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-4 py-2 transition-colors"
        aria-label="Create account and start investing"
      >
        Get Started
      </Link>
    </nav>
  );
}
