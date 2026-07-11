"use client";

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
import { Menu, X } from "lucide-react";

export default function ArthmountLandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  // Handle active navigation link on scroll
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

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden selection:bg-emerald-100">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[5%] h-18 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-shadow">
        <Link href="#home" className="text-2xl font-extrabold text-emerald-600 tracking-tight">
          Arth<span className="text-slate-900">mount</span>
        </Link>

        <ul className="hidden md:flex items-center gap-8">
          {["Features", "How It Works", "Download", "FAQ", "Contact"].map((item) => {
            const href = `#${item.toLowerCase().replace(/ /g, "-").replace("how-it-works", "how")}`;
            return (
              <li key={item}>
                <Link
                  href={href}
                  className={`text-[0.9rem] font-medium transition-colors hover:text-slate-900 ${activeSection === href.substring(1) ? "text-slate-900" : "text-slate-500"
                    }`}
                >
                  {item}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden md:flex gap-3">
          <Button size="lg" variant="outline" className="border-slate-200 text-slate-500 hover:text-slate-900 hover:border-emerald-600 rounded-[10px] font-semibold px-5">
            <Link href="/login">Login</Link>
          </Button>
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)] hover:shadow-[0_12px_36px_rgba(5,150,105,0.28)] hover:-translate-y-0.5 transition-all rounded-[10px] font-semibol px-5">
            <Link href="/signup">Start Investing</Link>
          </Button>
        </div>

        {/* Hamburger */}
        <Button size="icon-lg" variant="ghost" className="md:hidden cursor-pointer" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {
            isMenuOpen ? <X size={24} /> : <Menu size={30} />
          }
        </Button>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="absolute top-18 left-0 right-0 bg-white border-b border-slate-200 p-[5%] flex flex-col gap-4 shadow-lg md:hidden">
            {["Features", "How It Works", "Download", "FAQ", "Contact"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, "-").replace("how-it-works", "how")}`}
                className="text-slate-600 font-medium py-2 border-b border-slate-100"
                onClick={() => setIsMenuOpen(false)}
              >
                {item}
              </Link>
            ))}
            <div className="flex flex-col gap-3 mt-4">
              <Button size="lg" variant="outline" className="w-full justify-center"> <Link href="/login">Login</Link></Button>
              <Button size="lg" className="w-full justify-center bg-emerald-600 hover:bg-emerald-700"> <Link href="/signup">Start Investing</Link></Button>
            </div>
          </div>
        )}
      </nav>

      <section id="home" className="pt-32 pb-20 px-[5%] bg-white">
        <div className="max-w-295 mx-auto grid lg:grid-cols-2 gap-12 items-center">

          {/* Text Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#d1fae5] border border-[rgba(16,185,129,0.3)] rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-600 tracking-wide">
              <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
              INDIA'S TRUSTED INVESTMENT PLATFORM
            </div>

            <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
              Grow Your Wealth,<br />
              <span className="text-emerald-600">Every Single Day</span>
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed max-w-lg">
              Arthmount delivers daily returns on your investments through professionally managed trading plans — transparent, secure, and built for modern India.
            </p>

            <div className="flex gap-4 pt-4">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-8 h-14 font-semibold text-base shadow-lg shadow-emerald-600/20">
                <Link href="/signup">Start Investing</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-xl px-8 h-14 font-semibold text-base">
                Learn More
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative w-full h-auto rounded-2xl overflow-hidden border-2">
            {/* Using the image provided. Replace the src with your cropped file path */}
            <Image
              src="/hero-image.png"
              alt="Arthmount Investment Platform Growth"
              width={600}
              height={500}
              className="w-full h-auto object-contain"
              priority
            />
            {/* Optional: Add a subtle glow behind the image */}
            <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] -z-10" />
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="bg-emerald-600 overflow-hidden py-4">
        <div className="stats-ticker flex whitespace-nowrap">
          <div className="animate-ticker flex gap-16 pr-16 min-w-full">
            {[
              { val: "₹12Cr+", label: "Total Invested" },
              { val: "8,400+", label: "Active Investors" },
              { val: "Daily", label: "Profit Payouts" },
              { val: "₹2.5Cr+", label: "Profits Distributed" },
              { val: "100%", label: "Secure Withdrawals" },
              { val: "KYC", label: "Verified Platform" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 shrink-0">
                <span className="text-base font-extrabold text-white">{item.val}</span>
                <span className="text-[0.8rem] font-medium text-white/75">{item.label}</span>
              </div>
            ))}
          </div>
          {/* Duplicate for seamless loop */}
          <div className="animate-ticker flex gap-16 pr-16 min-w-full" aria-hidden="true">
            {[
              { val: "₹12Cr+", label: "Total Invested" },
              { val: "8,400+", label: "Active Investors" },
              { val: "Daily", label: "Profit Payouts" },
              { val: "₹2.5Cr+", label: "Profits Distributed" },
              { val: "100%", label: "Secure Withdrawals" },
              { val: "KYC", label: "Verified Platform" },
            ].map((item, i) => (
              <div key={`dup-${i}`} className="flex items-center gap-3 shrink-0">
                <span className="text-base font-extrabold text-white">{item.val}</span>
                <span className="text-[0.8rem] font-medium text-white/75">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="py-24 px-[5%] bg-slate-50">
        <div className="max-w-295 mx-auto">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">Why Arthmount</p>
          <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-1px]">
            Built for <span className="bg-clip-text text-transparent bg-linear-to-br from-emerald-700 to-emerald-600">Smart Investors</span>
          </h2>
          <p className="text-[1.05rem] text-slate-500 mt-4 max-w-140 leading-[1.7]">
            Everything you need to invest with confidence — from KYC verification to instant withdrawals.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
            {[
              { icon: "📈", title: "Daily Profits", desc: "Earn daily returns credited directly to your wallet. Watch your money grow every day you stay invested." },
              { icon: "🔒", title: "Bank-Grade Security", desc: "End-to-end encrypted transactions, PIN-protected login, and KYC-verified accounts for complete peace of mind." },
              { icon: "⚡", title: "Instant Withdrawals", desc: "Request a withdrawal anytime. Most transfers are processed same-day to your linked bank account." },
              { icon: "📊", title: "Live Dashboard", desc: "Track every rupee in real time. Interactive charts, transaction history, and profit analytics at a glance." },
              { icon: "🎯", title: "Multiple Plans", desc: "Choose from Starter, Growth, Elite and Premium plans designed to match your investment goals and appetite." },
              { icon: "👤", title: "Expert Management", desc: "Your capital is managed by experienced traders with a proven track record in Indian financial markets." },
            ].map((feature, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-[20px] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(16,183,127,0.3)] hover:shadow-[0_8px_40px_rgba(16,183,127,0.08)]">
                <div className="w-13 h-13 bg-[rgba(16,183,127,0.1)] border border-[rgba(16,183,127,0.2)] rounded-[14px] flex items-center justify-center text-2xl mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-[1.05rem] font-bold mb-2">{feature.title}</h3>
                <p className="text-[0.875rem] text-slate-500 leading-[1.6]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 px-[5%] bg-slate-50 border-t border-slate-200/50">
        <div className="max-w-295 mx-auto">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">Process</p>
          <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-1px]">
            Start Earning in <span className="bg-clip-text text-transparent bg-linear-to-br from-emerald-700 to-emerald-600">4 Simple Steps</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
            {[
              { num: "1", title: "Create Account", desc: "Sign up with your email and complete your profile in under 2 minutes." },
              { num: "2", title: "Complete KYC", desc: "Upload your Aadhaar & PAN for a secure, verified investment profile." },
              { num: "3", title: "Deposit & Choose Plan", desc: "Add funds via UPI, Bank Transfer or other methods, then pick your investment plan." },
              { num: "4", title: "Earn Daily", desc: "Sit back and watch daily profits land in your Arthmount wallet automatically." },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-15 h-15 mx-auto bg-[rgba(16,183,127,0.1)] border border-[rgba(16,183,127,0.25)] rounded-full flex items-center justify-center text-[1.4rem] font-black text-emerald-600 mb-5">
                  {step.num}
                </div>
                <h3 className="text-base font-bold mb-2">{step.title}</h3>
                <p className="text-[0.875rem] text-slate-500 leading-[1.6] max-w-50 mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APP DOWNLOAD */}
      <section id="download" className="py-24 px-[5%] bg-linear-to-br from-white to-slate-50 border-y border-slate-200">
        <div className="max-w-295 mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-135">
            <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">Mobile App</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold leading-[1.2] tracking-[-0.5px] mb-4">
              Your Portfolio,<br />
              <span className="bg-clip-text text-transparent bg-linear-to-br from-emerald-700 to-emerald-600">In Your Pocket</span>
            </h2>
            <p className="text-base text-slate-500 leading-[1.7] mb-8">
              The Arthmount mobile app puts full investment control in your hands — deposit, track earnings, and withdraw on the go. Available for Android.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <Button className="hidden bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base px-6 py-6 shadow-md font-semibold">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
                  <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm7 1.5L18.5 8H13V3.5zM12 18a1 1 0 0 1-1-1v-4.59l-1.29 1.3a1 1 0 0 1-1.42-1.42l3-3a1 1 0 0 1 1.42 0l3 3a1 1 0 1 1-1.42 1.42L13 12.41V17a1 1 0 0 1-1 1z"></path>
                </svg>
                Download APK
              </Button>
              <span className="text-[0.875rem] text-slate-500 inline-flex items-center">
                App coming soon — check back shortly!
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[24px] p-10 min-w-60 text-center shadow-[0_0_60px_rgba(16,183,127,0.08)]">
            <div className="w-20 h-20 mx-auto bg-linear-to-br from-emerald-600 to-[#4fffb0] rounded-[20px] flex items-center justify-center mb-5 text-[2.5rem] shadow-[0_0_30px_rgba(16,183,127,0.3)]">
              📱
            </div>
            <div className="font-bold text-[1.1rem]">Arthmount App</div>
            <div className="text-[0.875rem] text-slate-500 mt-2">Android · Free Download</div>
            <div className="text-[0.8rem] text-slate-500 mt-4 leading-relaxed">
              Scan QR on app stores or<br />download APK directly above
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-24 px-[5%] bg-slate-50">
        <div className="max-w-295 mx-auto">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">What Investors Say</p>
          <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-1px]">
            Trusted by <span className="bg-clip-text text-transparent bg-linear-to-br from-emerald-700 to-emerald-600">Thousands</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              {
                text: "I've been investing for 3 months and the returns have been absolutely consistent. The dashboard is clean and withdrawals are always on time.",
                initial: "R", name: "Rahul Verma", role: "Software Engineer, Bengaluru"
              },
              {
                text: "Started with the Growth plan with ₹25,000. My profits hit my wallet every morning without fail. Great platform with genuine returns!",
                initial: "P", name: "Priya Sharma", role: "Business Owner, Mumbai"
              },
              {
                text: "The KYC process was smooth and my account was verified in hours. The support team responded instantly when I had questions. Highly recommend!",
                initial: "A", name: "Amit Kumar", role: "Teacher, Delhi"
              }
            ].map((review, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-[20px] p-7">
                <div className="text-[#f59e0b] text-[0.85rem] mb-2 tracking-widest">★★★★★</div>
                <p className="text-[0.9rem] text-slate-500 leading-[1.7] mb-5 italic relative pl-4 before:content-['\x22'] before:absolute before:-left-1 before:-top-2 before:text-[2rem] before:text-emerald-600">
                  {review.text}
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-600 to-[#4fffb0] flex items-center justify-center font-bold text-[0.875rem] text-black shrink-0">
                    {review.initial}
                  </div>
                  <div>
                    <div className="font-bold text-[0.875rem]">{review.name}</div>
                    <div className="text-[0.75rem] text-slate-500">{review.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-[5%] bg-slate-50 border-t border-slate-200/50">
        <div className="max-w-295 mx-auto">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">FAQ</p>
          <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-1px]">
            Common <span className="bg-clip-text text-transparent bg-linear-to-br from-emerald-700 to-emerald-600">Questions</span>
          </h2>

          <div className="max-w-190 mt-12">
            <Accordion className="w-full flex flex-col gap-4">
              {[
                { q: "How is my money invested?", a: "Your capital is pooled and managed by our expert trading team in regulated financial instruments including equities, commodities, and fixed income across Indian markets." },
                { q: "How often are profits credited?", a: "Profits are credited to your Arthmount wallet every trading day (Monday–Saturday, excluding market holidays) based on your plan's daily percentage." },
                { q: "Can I withdraw anytime?", a: "Yes. You can request a withdrawal of your available wallet balance at any time. Processing typically takes 1–3 working days to your registered bank account." },
                { q: "Is my capital safe?", a: "We operate with strict risk management protocols. Your capital is returned in full at the end of your investment tenure. Please note that all investments carry inherent market risk." },
                { q: "What KYC documents do I need?", a: "You will need your PAN card and Aadhaar card (front and back). A selfie with your documents is also required for identity verification." },
                { q: "How do I refer a friend?", a: "If you have an Agent referral code, you can share it with your contacts. They enter it during signup. Contact your agent or support for your personal referral code details." },
              ].map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="bg-white border border-slate-200 rounded-[14px] px-6 data-[state=open]:border-emerald-200 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline py-5 text-[0.95rem] font-semibold text-left">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[0.875rem] text-slate-500 leading-[1.7] pb-5">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 px-[5%] bg-white flex flex-col items-center text-center">
        <div className="max-w-295 mx-auto w-full">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-600 mb-3">Get In Touch</p>
          <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-1px]">
            We're Here to <span className="bg-clip-text text-transparent bg-linear-to-br from-emerald-700 to-emerald-600">Help</span>
          </h2>
          <p className="text-[1.05rem] text-slate-500 mt-4 mb-12 max-w-150 mx-auto leading-[1.7]">
            Reach out to us directly through any of our official support channels.
          </p>

          <div className="max-w-150 mx-auto flex flex-col gap-4">
            {[
              { icon: "📧", title: "Email Support", val: "support@arthmount.com" },
              { icon: "📞", title: "Phone Support", val: "+91 XXXXX XXXXX" },
              { icon: "💬", title: "WhatsApp", val: "Available on WhatsApp" },
              { icon: "🕐", title: "Support Hours", val: "Mon – Sat, 9 AM – 7 PM IST" },
            ].map((contact, i) => (
              <div key={i} className="flex items-center gap-6 bg-white border border-slate-200 rounded-[16px] p-6 text-left transition-all hover:-translate-y-1 hover:border-emerald-600">
                <div className="w-12.5 h-12.5 bg-[rgba(16,183,127,0.1)] border border-[rgba(16,183,127,0.2)] rounded-[12px] flex items-center justify-center text-[1.25rem] shrink-0">
                  {contact.icon}
                </div>
                <div>
                  <div className="text-base font-bold mb-1">{contact.title}</div>
                  <div className="text-base text-slate-500">{contact.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 pt-14 px-[5%] pb-8 text-center text-white">
        <div className="max-w-295 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-8 border-b border-white/10 mb-7">
            <div className="text-[1.4rem] font-extrabold text-emerald-500">
              Arthmount
            </div>
            <div className="flex flex-wrap justify-center gap-7">
              {["Home", "Features", "Download", "FAQ", "Contact"].map((item) => (
                <Link key={item} href={`#${item.toLowerCase().replace("home", "home")}`} className="text-[0.85rem] text-white/50 hover:text-white/90 transition-colors">
                  {item}
                </Link>
              ))}
              <Link href="https://user.arthmount.com/" className="text-[0.85rem] text-white/50 hover:text-white/90 transition-colors">
                Investor Login
              </Link>
            </div>
          </div>
          <p className="text-[0.8rem] text-white/35">
            © {new Date().getFullYear()} Arthmount Technologies Pvt. Ltd. All rights reserved.
          </p>
          <p className="max-w-190 mx-auto mt-4 text-[0.72rem] text-white/30 leading-[1.8]">
            ⚠️ Investment in financial markets involves risk. Past performance is not indicative of future results. Please read all terms and conditions before investing. Arthmount is not a registered stockbroker or SEBI-regulated entity. Invest responsibly.
          </p>
        </div>
      </footer>
    </div>
  );
}