/**
 * Phone number normalization — single source of truth for all server-side code.
 *
 * Canonical format stored in DB and queried by every auth flow:
 *   XXXXXXXXXX  (10 digits, no country code prefix, no spaces)
 *
 * The same normalisation logic lives in api-client/auth.ts for client-side
 * form validation. Both must produce identical output for a given input.
 *
 * Handles common input variants:
 *   9876543210        → 9876543210   (already canonical)
 *   09876543210       → 9876543210   (leading 0)
 *   919876543210      → 9876543210   (91 country code, no +)
 *   +919876543210     → 9876543210   (E.164 with +)
 *   +91 98765 43210   → 9876543210   (spaces)
 *   +91-98765-43210   → 9876543210   (hyphens)
 *   91 98765 43210    → 9876543210   (country code with spaces)
 *   98765 43210       → 9876543210   (spaces, no country code)
 *
 * Returns null for anything that does not resolve to exactly 10 digits.
 */

export function normalizePhone(raw: string): string | null {
  // Strip everything except digits
  let digits = raw.replace(/\D/g, "");

  // Remove leading zero (e.g. 09876543210 → 9876543210)
  if (digits.startsWith("0")) digits = digits.slice(1);

  // 12-digit number starting with 91 → strip country code (e.g. 919876543210 → 9876543210)
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);

  // 11-digit number starting with 1 → treat as North American; not valid here
  // (No-op — falls through to rejection below)

  // Must be exactly 10 digits to be a valid Indian mobile number
  if (digits.length !== 10) return null;

  return digits;
}

/**
 * Returns true when `raw` is a valid Indian phone number (normalises to 10 digits).
 * Useful for Zod `.refine()` calls without catching errors.
 */
export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw) !== null;
}

/**
 * Asserts that `raw` is a valid Indian phone and returns the normalised form.
 * Throws a plain Error (callers convert to AuthError as appropriate).
 */
export function requirePhone(raw: string): string {
  const normalized = normalizePhone(raw);
  if (!normalized) {
    throw new Error(`Invalid phone number: "${raw}"`);
  }
  return normalized;
}
