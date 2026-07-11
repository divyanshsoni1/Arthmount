import { PrismaClient }  from "./generated/prisma/client";
import { PrismaPg }      from "@prisma/adapter-pg";
import { Pool }          from "pg";

// ─── Connection pool singleton ────────────────────────────────────────────────
// Using Pool (not a single Client) so connections are reused across requests.
// Neon's pooler endpoint already handles connection pooling on the server side,
// but having a local pool prevents the cost of a new TCP handshake on every
// request during development hot-reloads.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool:   Pool         | undefined;
};

function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL!,
    // Keep a small pool — Neon's free tier allows up to 3 concurrent connections.
    max:              3,
    // Idle connections are released after 30 s so the Neon compute doesn't stay
    // awake unnecessarily.
    idleTimeoutMillis: 30_000,
    // Hard cap per connection attempt — surfaces errors fast rather than hanging.
    connectionTimeoutMillis: 10_000,
  });
}

function createPrismaClient(pool: Pool): PrismaClient {
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
      ? ["error", "warn"]   // removed "query" — reduces noise
      : ["error"],
  });
}

// Re-use both across Next.js hot-reloads in development
const pool   = globalForPrisma.pool   ?? createPool();
export const prisma = globalForPrisma.prisma ?? createPrismaClient(pool);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool   = pool;
  globalForPrisma.prisma = prisma;
}
