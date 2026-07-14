import { describe, it, expect } from "vitest";
import { normalizePhone, isValidPhone, requirePhone } from "../phone";

// ─── normalizePhone ───────────────────────────────────────────────────────────

describe("normalizePhone", () => {
  // ── Already canonical ──────────────────────────────────────────────────────
  it("returns a plain 10-digit number unchanged", () => {
    expect(normalizePhone("9876543210")).toBe("9876543210");
  });

  // ── +91 prefix ────────────────────────────────────────────────────────────
  it("strips +91 from +919876543210", () => {
    expect(normalizePhone("+919876543210")).toBe("9876543210");
  });

  it("strips +91 and spaces from '+91 98765 43210'", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
  });

  it("strips +91 and hyphens from '+91-98765-43210'", () => {
    expect(normalizePhone("+91-98765-43210")).toBe("9876543210");
  });

  it("strips +91 and brackets from '+91 (98765) 43210'", () => {
    expect(normalizePhone("+91 (98765) 43210")).toBe("9876543210");
  });

  // ── 91 prefix (no +) ──────────────────────────────────────────────────────
  it("strips 91 country code from 919876543210", () => {
    expect(normalizePhone("919876543210")).toBe("9876543210");
  });

  it("strips 91 and spaces from '91 9876543210'", () => {
    expect(normalizePhone("91 9876543210")).toBe("9876543210");
  });

  it("strips 91 and spaces from '91 98765 43210'", () => {
    expect(normalizePhone("91 98765 43210")).toBe("9876543210");
  });

  // ── 10-digit with formatting ───────────────────────────────────────────────
  it("strips spaces from '98765 43210'", () => {
    expect(normalizePhone("98765 43210")).toBe("9876543210");
  });

  it("strips hyphens from '98765-43210'", () => {
    expect(normalizePhone("98765-43210")).toBe("9876543210");
  });

  // ── Leading zero ──────────────────────────────────────────────────────────
  it("strips leading zero from 09876543210", () => {
    expect(normalizePhone("09876543210")).toBe("9876543210");
  });

  // ── Whitespace trimming ────────────────────────────────────────────────────
  it("handles leading/trailing whitespace", () => {
    expect(normalizePhone("  9876543210  ")).toBe("9876543210");
  });

  it("handles leading/trailing whitespace with +91", () => {
    expect(normalizePhone("  +91 9876543210  ")).toBe("9876543210");
  });

  // ── Invalid inputs → null ─────────────────────────────────────────────────
  it("returns null for an empty string", () => {
    expect(normalizePhone("")).toBeNull();
  });

  it("returns null for a number with fewer than 10 digits", () => {
    expect(normalizePhone("98765")).toBeNull();
  });

  it("returns null for a number with more than 10 digits that is not a +91 variant", () => {
    expect(normalizePhone("123456789012345")).toBeNull();
  });

  it("returns null for a non-numeric string", () => {
    expect(normalizePhone("not-a-phone")).toBeNull();
  });

  it("returns null for an 11-digit number that does not start with 91", () => {
    expect(normalizePhone("19876543210")).toBeNull();
  });

  it("returns null for a 12-digit number that does not start with 91", () => {
    expect(normalizePhone("129876543210")).toBeNull();
  });
});

// ─── isValidPhone ─────────────────────────────────────────────────────────────

describe("isValidPhone", () => {
  it("returns true for a valid 10-digit number", () => {
    expect(isValidPhone("9876543210")).toBe(true);
  });

  it("returns true for a +91 prefixed number", () => {
    expect(isValidPhone("+919876543210")).toBe(true);
  });

  it("returns true for a formatted number with spaces", () => {
    expect(isValidPhone("+91 98765 43210")).toBe(true);
  });

  it("returns false for an invalid number", () => {
    expect(isValidPhone("12345")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidPhone("")).toBe(false);
  });
});

// ─── requirePhone ─────────────────────────────────────────────────────────────

describe("requirePhone", () => {
  it("returns the normalised 10-digit number for a valid input", () => {
    expect(requirePhone("+91 98765 43210")).toBe("9876543210");
  });

  it("throws for an invalid phone number", () => {
    expect(() => requirePhone("12345")).toThrowError(/Invalid phone number/);
  });

  it("throws for an empty string", () => {
    expect(() => requirePhone("")).toThrowError(/Invalid phone number/);
  });
});

// ─── End-to-end: all required inputs normalize to the same value ──────────────

describe("normalizePhone — required inputs from spec", () => {
  const CANONICAL = "9876543210";

  const inputs = [
    "9876543210",
    "919876543210",
    "+919876543210",
    "+91 98765 43210",
    "91 98765 43210",
    "98765 43210",
    "+91-98765-43210",
  ];

  for (const input of inputs) {
    it(`"${input}" → "${CANONICAL}"`, () => {
      expect(normalizePhone(input)).toBe(CANONICAL);
    });
  }
});
