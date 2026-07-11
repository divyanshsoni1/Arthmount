import { prisma } from "@/lib/prisma";
import type { User } from "@/lib/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

// Only the fields the auth layer ever needs — never pull secrets into the
// wrong scope by accident.
export type AuthUser = Pick<
  User,
  | "id"
  | "email"
  | "phone"
  | "passwordHash"
  | "role"
  | "isFrozen"
  | "deletedAt"
  | "kycStatus"
  | "name"
>;

// ─── Queries ──────────────────────────────────────────────────────────────────

const AUTH_SELECT = {
  id:           true,
  email:        true,
  phone:        true,
  passwordHash: true,
  role:         true,
  isFrozen:     true,
  deletedAt:    true,
  kycStatus:    true,
  name:         true,
} as const;

/**
 * Look up a user by their UUID (used after JWT verification).
 */
export async function findUserById(id: string): Promise<AuthUser | null> {
  return prisma.user.findUnique({
    where:  { id },
    select: AUTH_SELECT,
  });
}

/**
 * Look up a user by email (case-insensitive) or normalised phone number.
 * Returns null when not found — never throws.
 */
export async function findUserByEmailOrPhone(
  identifier: string
): Promise<AuthUser | null> {
  const isEmail = identifier.includes("@");

  return prisma.user.findFirst({
    where: isEmail
      ? { email: { equals: identifier, mode: "insensitive" } }
      : { phone: identifier },
    select: AUTH_SELECT,
  });
}

/**
 * Stamp the last-login timestamp without touching any other field.
 */
export async function updateLastLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data:  { lastLoginAt: new Date() },
  });
}

/**
 * Overwrite a user's passwordHash — called only after full identity verification.
 */
export async function updatePassword(userId: string, passwordHash: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data:  { passwordHash },
  });
}
