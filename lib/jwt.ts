/**
 * JWT helpers — Web Crypto API (HS256), no external library.
 *
 * Key optimisation: CryptoKey objects are cached after first import.
 * crypto.subtle.importKey() has non-trivial overhead (~1–3 ms per call).
 * Caching cuts that to ~0 ms on every subsequent sign/verify.
 */

// ─── Base64url ────────────────────────────────────────────────────────────────

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(str: string): ArrayBuffer {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad    = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(pad));
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

// ─── Key cache — import once per secret value ─────────────────────────────────

const keyCache = new Map<string, Promise<CryptoKey>>();

function getKey(secret: string): Promise<CryptoKey> {
  if (!keyCache.has(secret)) {
    keyCache.set(
      secret,
      crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      )
    );
  }
  return keyCache.get(secret)!;
}

// ─── Env ──────────────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`[JWT] Missing env variable: ${key}`);
  return value;
}

// ─── Static JWT header (same for every token) ────────────────────────────────

const HEADER = b64urlEncode(
  new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" }))
);

// ─── Core sign / verify ───────────────────────────────────────────────────────

async function sign(payload: Record<string, unknown>, secret: string): Promise<string> {
  const body   = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key    = await getKey(secret);
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${HEADER}.${body}`));
  return `${HEADER}.${body}.${b64urlEncode(sigBuf)}`;
}

async function verify<T>(token: string, secret: string): Promise<T> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const [header, body, sig] = parts;
  const key = await getKey(secret);

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlDecode(sig),
    new TextEncoder().encode(`${header}.${body}`)
  );

  if (!valid) throw new Error("Invalid token signature");

  const payload = JSON.parse(
    new TextDecoder().decode(b64urlDecode(body))
  ) as T & { exp?: number };

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error("Token expired");
  }

  return payload;
}

function nowSec() { return Math.floor(Date.now() / 1000); }

// ─── OTP token (10 minutes) ───────────────────────────────────────────────────
// Carries enough user data so verify-otp doesn't need a DB roundtrip.

export interface OtpTokenPayload {
  userId:  string;
  channel: "email" | "phone";
  name:    string;
  role:    string;
  exp:     number;
  iat:     number;
}

export async function signOtpToken(
  payload: Pick<OtpTokenPayload, "userId" | "channel" | "name" | "role">
): Promise<string> {
  return sign(
    { ...payload, iat: nowSec(), exp: nowSec() + 10 * 60 },
    requireEnv("JWT_OTP_SECRET")
  );
}

export async function verifyOtpToken(token: string): Promise<OtpTokenPayload> {
  return verify<OtpTokenPayload>(token, requireEnv("JWT_OTP_SECRET"));
}

// ─── Session token (7 days) ───────────────────────────────────────────────────

export interface SessionTokenPayload {
  userId: string;
  role:   string;
  exp:    number;
  iat:    number;
}

export async function signSessionToken(
  payload: Pick<SessionTokenPayload, "userId" | "role">
): Promise<string> {
  return sign(
    { ...payload, iat: nowSec(), exp: nowSec() + 7 * 24 * 60 * 60 },
    requireEnv("JWT_SESSION_SECRET")
  );
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload> {
  return verify<SessionTokenPayload>(token, requireEnv("JWT_SESSION_SECRET"));
}
