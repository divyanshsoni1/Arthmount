"use client";
/**
 * app/_home/LandingPageClient.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * All the interactive / client-rendered content for the Arthmount landing page.
 * Extracted so the parent app/page.tsx can be a Server Component that exports
 * `metadata` and injects JSON-LD — both of which require a server context.
 *
 * Nothing in this file changed from the original app/page.tsx except:
 *  1. "use client" directive moved here.
 *  2. The footer now lives in a separate shared component (SiteFooter).
 *  3. Minor semantic HTML improvements for heading hierarchy & aria.
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "next/image";
import { Navbar } from "@/components/navbar/Navbar";
import { SiteFooter } from "@/components/site-footer/SiteFooter";
import { FAQ_ITEMS } from "@/app/_home/faq-data";

// ─── Data ─────────────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  { val: "₹12Cr+",  label: "Total Invested"      },
  { val: "8,400+",  label: "Active Investors"     },
  { val: "Daily",   label: "Profit Payouts"       },
  { val: "₹2.5Cr+", label: "Profits Distributed" },
  { val: "100%",    label: "Secure Withdrawals"   },
  { val: "KYC",     label: "Verified Platform"    },
] as const;

const FEATURES = [
  { icon: "📈", title: "Daily Profits",       desc: "Earn daily returns credited directly to your wallet. Watch your money grow every day you stay invested." },
  { icon: "🔒", title: "Bank-Grade Security", desc: "End-to-end encrypted transactions, PIN-protected login, and KYC-verified accounts for complete peace of mind." },
  { icon: "⚡", title: "Instant Withdrawals", desc: "Request a withdrawal anytime. Most transfers are processed same-day to your linked bank account." },
  { icon: "📊", title: "Live Dashboard",      desc: "Track every rupee in real time. Interactive charts, transaction history, and profit analytics at a glance." },
  { icon: "🎯", title: "Multiple Plans",      desc: "Choose from Starter, Growth, Elite and Premium plans designed to match your investment goals and appetite." },
  { icon: "👤", title: "Expert Management",   desc: "Your capital is managed by experienced traders with a proven track record in Indian financial markets." },
] as const;

const STEPS = [
  { num: "1", title: "Create Account",        desc: "Sign up with your email and complete your profile in under 2 minutes." },
  { num: "2", title: "Complete KYC",          desc: "Upload your Aadhaar & PAN for a secure, verified investment profile." },
  { num: "3", title: "Deposit & Choose Plan", desc: "Add funds via UPI, Bank Transfer or other methods, then pick your investment plan." },
  { num: "4", title: "Earn Daily",            desc: "Sit back and watch daily profits land in your Arthmount wallet automatically." },
] as const;

const TESTIMONIALS = [
  {
    text:    "I've been investing for 3 months and the returns have been absolutely consistent. The dashboard is clean and withdrawals are always on time.",
    initial: "R", name: "Rahul Verma",  role: "Software Engineer, Bengaluru",
  },
  {
    text:    "Started with the Growth plan with ₹25,000. My profits hit my wallet every morning without fail. Great platform with genuine returns!",
    initial: "P", name: "Priya Sharma", role: "Business Owner, Mumbai",
  },
  {
    text:    "The KYC process was smooth and my account was verified in hours. The support team responded instantly when I had questions. Highly recommend!",
    initial: "A", name: "Amit Kumar",   role: "Teacher, Delhi",
  },
] as const;



const CONTACTS = [
  { icon: "📧", title: "Email Support",  val: "support@arthmount.com"      },
  { icon: "📞", title: "Phone Support",  val: "+91 XXXXX XXXXX"            },
  { icon: "💬", title: "WhatsApp",       val: "Available on WhatsApp"      },
  { icon: "🕐", title: "Support Hours",  val: "Mon – Sat, 9 AM – 7 PM IST" },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-1px]">
      {children}
    </h2>
  );
}

function StatsMarquee() {
  return (
    <div
      className="bg-emerald-600 py-4"
      aria-label="Investment statistics"
      role="region"
    >
      <div className="marquee-outer">
        <div className="marquee-track" aria-hidden="false">
          {TICKER_ITEMS.map((item) => (
            <TickerItem key={item.label} val={item.val} label={item.label} />
          ))}
          {TICKER_ITEMS.map((item) => (
            <TickerItem
              key={`dup-${item.label}`}
              val={item.val}
              label={item.label}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TickerItem({
  val,
  label,
  "aria-hidden": ariaHidden,
}: {
  val: string;
  label: string;
  "aria-hidden"?: boolean;
}) {
  return (
    <div
      className="inline-flex items-center gap-2.5 px-8 shrink-0"
      aria-hidden={ariaHidden}
    >
      <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" aria-hidden="true" />
      <span className="text-sm font-extrabold text-white tabular-nums tracking-tight">{val}</span>
      <span className="text-xs font-medium text-white/70 tracking-wide">{label}</span>
    </div>
  );
}

function TestimonialCard({
  text,
  initial,
  name,
  role,
}: {
  text: string;
  initial: string;
  name: string;
  role: string;
}) {
  return (
    <article className="flex flex-col bg-white border border-slate-200 rounded-2xl p-7 transition-all duration-300 hover:border-emerald-200 hover:shadow-[0_8px_32px_rgba(16,183,127,0.08)] hover:-translate-y-0.5">
      <div className="flex items-center gap-0.5 mb-4" aria-label="5 out of 5 stars">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <div className="text-3xl font-black text-emerald-500/30 leading-none mb-1 select-none" aria-hidden="true">"</div>
      <p className="flex-1 text-[0.9rem] text-slate-600 leading-[1.75] mb-6 italic">{text}</p>
      <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
        <div
          className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm"
          aria-hidden="true"
        >
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">{name}</div>
          <div className="text-xs text-slate-500 truncate">{role}</div>
        </div>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPageClient() {
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section[id]");
      let current = "";
      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop;
        if (window.scrollY >= sectionTop - 100) {
          current = section.getAttribute("id") || "";
        }
      });
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden selection:bg-emerald-100">
      <Navbar activeSection={activeSection} />

      {/* ── HERO ── */}
      <section id="home" aria-labelledby="hero-heading" className="pt-28 pb-20 px-[5%] bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-700 tracking-wide">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true" />
              INDIA'S TRUSTED INVESTMENT PLATFORM
            </div>

            <h1
              id="hero-heading"
              className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.08] tracking-tight"
            >
              Grow Your Wealth,<br />
              <span className="text-emerald-600">Every Single Day</span>
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed max-w-lg">
              Arthmount delivers daily returns on your investments through professionally managed
              trading plans — transparent, secure, and built for modern India.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-8 h-13 font-semibold text-base shadow-lg shadow-emerald-600/20 transition-all duration-200"
                aria-label="Start investing on Arthmount — create your account"
              >
                <Link href="/register">Start Investing</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl px-8 h-13 font-semibold text-base border-slate-200 hover:border-emerald-300 hover:text-emerald-700 transition-all duration-200"
                aria-label="Learn more about Arthmount investment platform features"
              >
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>

          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-[0_20px_60px_-10px_rgba(16,183,127,0.12)]">
            <Image
              src="/hero-image.png"
              alt="Arthmount investment platform dashboard showing portfolio growth, daily profits, and investment analytics"
              width={600}
              height={500}
              className="w-full h-auto object-contain"
              priority
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* ── STATS MARQUEE ── */}
      <StatsMarquee />

      {/* ── FEATURES ── */}
      <section id="features" aria-labelledby="features-heading" className="py-24 px-[5%] bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <SectionLabel>Why Arthmount</SectionLabel>
          <SectionHeading>
            <span id="features-heading">
              Built for{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-700 to-emerald-500">
                Smart Investors
              </span>
            </span>
          </SectionHeading>
          <p className="text-[1.05rem] text-slate-500 mt-4 max-w-2xl leading-[1.7]">
            Everything you need to invest with confidence — from KYC verification to instant
            withdrawals, all in one secure platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-white border border-slate-200 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_8px_40px_rgba(16,183,127,0.08)]"
              >
                <div
                  className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-2xl mb-5"
                  aria-hidden="true"
                >
                  {feature.icon}
                </div>
                <h3 className="text-[1rem] font-bold mb-2 text-slate-900">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-[1.65]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" aria-labelledby="how-heading" className="py-24 px-[5%] bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <SectionLabel>Process</SectionLabel>
          <SectionHeading>
            <span id="how-heading">
              Start Earning in{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-700 to-emerald-500">
                4 Simple Steps
              </span>
            </span>
          </SectionHeading>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-14">
            {STEPS.map((step) => (
              <div key={step.num} className="text-center">
                <div
                  className="w-14 h-14 mx-auto bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-[1.35rem] font-black text-emerald-600 mb-5 shadow-sm"
                  aria-hidden="true"
                >
                  {step.num}
                </div>
                <h3 className="text-base font-bold mb-2 text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-[1.65] max-w-[200px] mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors underline underline-offset-4"
            >
              Learn more about how Arthmount works →
            </Link>
          </div>
        </div>
      </section>

      {/* ── APP DOWNLOAD ── */}
      <section id="download" aria-labelledby="download-heading" className="py-24 px-[5%] bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-xl">
            <SectionLabel>Mobile App</SectionLabel>
            <h2 id="download-heading" className="text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold leading-[1.2] tracking-[-0.5px] mb-4">
              Your Portfolio,<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-700 to-emerald-500">
                In Your Pocket
              </span>
            </h2>
            <p className="text-base text-slate-500 leading-[1.7] mb-8">
              The Arthmount mobile app puts full investment control in your hands — deposit,
              track earnings, and withdraw on the go. Available for Android.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <Button className="hidden bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base px-6 py-6 shadow-md font-semibold">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="mr-2" aria-hidden="true">
                  <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm7 1.5L18.5 8H13V3.5zM12 18a1 1 0 0 1-1-1v-4.59l-1.29 1.3a1 1 0 0 1-1.42-1.42l3-3a1 1 0 0 1 1.42 0l3 3a1 1 0 1 1-1.42 1.42L13 12.41V17a1 1 0 0 1-1 1z" />
                </svg>
                Download APK
              </Button>
              <span className="text-sm text-slate-500">App coming soon — check back shortly!</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-10 min-w-[240px] text-center shadow-[0_0_60px_rgba(16,183,127,0.07)]">
            <div
              className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-600 to-emerald-400 rounded-2xl flex items-center justify-center mb-5 text-[2.5rem] shadow-[0_8px_24px_rgba(16,183,127,0.25)]"
              aria-hidden="true"
            >
              📱
            </div>
            <div className="font-bold text-[1.1rem] text-slate-900">Arthmount App</div>
            <div className="text-sm text-slate-500 mt-1.5">Android · Free Download</div>
            <div className="text-xs text-slate-400 mt-4 leading-relaxed">
              Scan QR on app stores or<br />download APK directly above
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" aria-labelledby="testimonials-heading" className="py-24 px-[5%] bg-white">
        <div className="max-w-7xl mx-auto">
          <SectionLabel>What Investors Say</SectionLabel>
          <SectionHeading>
            <span id="testimonials-heading">
              Trusted by{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-700 to-emerald-500">
                Thousands
              </span>
            </span>
          </SectionHeading>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 items-stretch">
            {TESTIMONIALS.map((review) => (
              <TestimonialCard key={review.name} {...review} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" aria-labelledby="faq-heading" className="py-24 px-[5%] bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <SectionLabel>FAQ</SectionLabel>
          <SectionHeading>
            <span id="faq-heading">
              Common{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-700 to-emerald-500">
                Questions
              </span>
            </span>
          </SectionHeading>
          <p className="text-[1.05rem] text-slate-500 mt-4 max-w-xl leading-[1.7]">
            Everything you need to know before you start investing with Arthmount.
          </p>

          <div className="max-w-3xl mx-auto mt-12">
            <Accordion className="w-full flex flex-col gap-3">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="bg-white border border-slate-200 rounded-2xl px-6 data-[state=open]:border-emerald-200 data-[state=open]:shadow-[0_4px_20px_rgba(16,183,127,0.06)] overflow-hidden transition-all duration-200"
                >
                  <AccordionTrigger className="hover:no-underline py-5 text-[0.95rem] font-semibold text-left text-slate-900 [&>svg]:text-emerald-500">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-slate-500 leading-[1.75] pb-5">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="text-center mt-10">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors underline underline-offset-4"
            >
              View all frequently asked questions →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" aria-labelledby="contact-heading" className="py-24 px-[5%] bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Get In Touch</SectionLabel>
            <SectionHeading>
              <span id="contact-heading">
                We&apos;re Here to{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-700 to-emerald-500">
                  Help
                </span>
              </span>
            </SectionHeading>
            <p className="text-[1.05rem] text-slate-500 mt-4 max-w-lg mx-auto leading-[1.7]">
              Reach out to us directly through any of our official support channels.
              We respond within one business day.
            </p>
          </div>

          <div className="max-w-xl mx-auto flex flex-col gap-3">
            {CONTACTS.map((contact) => (
              <div
                key={contact.title}
                className="flex items-center gap-5 bg-white border border-slate-200 rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_4px_20px_rgba(16,183,127,0.07)]"
              >
                <div
                  className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-xl shrink-0"
                  aria-hidden="true"
                >
                  {contact.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-0.5">{contact.title}</div>
                  <div className="text-sm text-slate-500">{contact.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <SiteFooter />
    </div>
  );
}
