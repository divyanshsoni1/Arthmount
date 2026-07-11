import { prisma } from "@/lib/prisma";
import type { User } from "@/lib/generated/prisma/client";

// ─── Duplicate checks ─────────────────────────────────────────────────────────

export async function phoneExists(phone: string): Promise<boolean> {
  const count = await prisma.user.count({ where: { phone } });
  return count > 0;
}

// ─── Create user ──────────────────────────────────────────────────────────────

export interface CreateUserInput {
  name:         string;
  phone:        string;
  passwordHash: string;
}

export type CreatedUser = Pick<User, "id" | "name" | "phone" | "role">;

export async function createUser(input: CreateUserInput): Promise<CreatedUser> {
  return prisma.user.create({
    data: {
      name:         input.name,
      phone:        input.phone,
      passwordHash: input.passwordHash,
      role:         "USER",
      kycStatus:    "PENDING",
    },
    select: {
      id:    true,
      name:  true,
      phone: true,
      role:  true,
    },
  });
}
