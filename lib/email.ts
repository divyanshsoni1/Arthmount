/**
 * Email OTP delivery via Nodemailer (already in dependencies).
 *
 * Required env variables (matching .env):
 *   MAIL_HOST      — SMTP host       e.g. smtp.gmail.com
 *   MAIL_PORT      — SMTP port       e.g. 465
 *   MAIL_SECURITY  — "true" for TLS  (port 465), "false" for STARTTLS (port 587)
 *   MAIL_USER      — sender address
 *   MAIL_PASS      — SMTP password / app password
 *
 *   MAIL_OTP_TEMPLATE — filename of the HTML template inside /assets/
 *                       e.g. mail_otp_template.html
 *
 * Template placeholders replaced at send time:
 *   {{name}}  — recipient's display name
 *   {{otp}}   — the 6-digit code
 *   {{year}}  — current full year
 */

import nodemailer from "nodemailer";
import fs         from "fs";
import path       from "path";

// ─── Env helper ───────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`[Email] Missing required env variable: ${key}`);
  return val;
}

// ─── Transporter singleton ────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST!,
  port:   Number(process.env.MAIL_PORT ?? 465),
  secure: process.env.MAIL_SECURITY === "true",
  auth: {
    user: process.env.MAIL_USER!,
    pass: process.env.MAIL_PASS!,
  },
});

// ─── Template loader (cached after first read) ────────────────────────────────

let cachedTemplate: string | null = null;

function loadTemplate(): string {
  if (cachedTemplate) return cachedTemplate;

  const templateFile = requireEnv("MAIL_OTP_TEMPLATE");

  // Resolve relative to project root (process.cwd() in Next.js = project root)
  const templatePath = path.join(process.cwd(), "assets", templateFile);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`[Email] Template file not found: ${templatePath}`);
  }

  cachedTemplate = fs.readFileSync(templatePath, "utf-8");
  return cachedTemplate;
}

function buildHtml(name: string, otp: string): string {
  return loadTemplate()
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{otp\}\}/g,  otp)
    .replace(/\{\{year\}\}/g, String(new Date().getFullYear()));
}

// ─── Send OTP email ───────────────────────────────────────────────────────────

export async function sendOtpEmail(
  to:   string,
  otp:  string,
  name: string = "Investor"
): Promise<void> {
  const from = process.env.MAIL_USER!;

  await transporter.sendMail({
    from:    `"Arthmount" <${from}>`,
    to,
    subject: `${otp} — Your Arthmount Login OTP`,
    html:    buildHtml(name, otp),
    // Plain-text fallback for clients that don't render HTML
    text: [
      `Hello ${name},`,
      ``,
      `Your Arthmount login OTP is: ${otp}`,
      ``,
      `This code expires in 5 minutes. Never share it with anyone.`,
      ``,
      `© ${new Date().getFullYear()} Arthmount. All Rights Reserved.`,
    ].join("\n"),
  });
}
