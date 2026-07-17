/**
 * app/_home/faq-data.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared FAQ data — no client/server directive, safe to import from both
 * Server Components (for JSON-LD) and Client Components (for the accordion UI).
 */

export const FAQ_ITEMS = [
  {
    q: "How is my money invested?",
    a: "Your capital is pooled and managed by our expert trading team in regulated financial instruments including equities, commodities, and fixed income across Indian markets.",
  },
  {
    q: "How often are profits credited?",
    a: "Profits are credited to your Arthmount wallet every trading day (Monday–Saturday, excluding market holidays) based on your plan's daily percentage.",
  },
  {
    q: "Can I withdraw anytime?",
    a: "Yes. You can request a withdrawal of your available wallet balance at any time. Processing typically takes 1–3 working days to your registered bank account.",
  },
  {
    q: "Is my capital safe?",
    a: "We operate with strict risk management protocols. Your capital is returned in full at the end of your investment tenure. Please note that all investments carry inherent market risk.",
  },
  {
    q: "What KYC documents do I need?",
    a: "You will need your PAN card and Aadhaar card (front and back). A selfie with your documents is also required for identity verification.",
  },
  {
    q: "How do I refer a friend?",
    a: "If you have an Agent referral code, you can share it with your contacts. They enter it during signup. Contact your agent or support for your personal referral code details.",
  },
] as const;

export type FaqItem = (typeof FAQ_ITEMS)[number];
