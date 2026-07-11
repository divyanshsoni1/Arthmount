import "dotenv/config";
import { PrismaClient} from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function cleanup() {
  console.log('🧹 Starting cleanup…');

  // ─── Truncate all tables in the correct order ──────────────────────────
  // Using CASCADE to automatically handle foreign key dependencies.
  // This works for PostgreSQL. Adjust for other databases.
  await prisma.$executeRaw`
    TRUNCATE TABLE
      "users",
      "packages",
      "investments",
      "weekly_profit_accumulations",
      "agent_commissions",
      "withdrawals",
      "deposit_requests",
      "ledger",
      "kyc_documents",
      "notifications",
      "user_consents",
      "user_devices",
      "trading_calendar",
      "admin_audit_logs",
      "support_tickets"
    CASCADE;
  `;

  console.log('✅ All tables cleared.');
  console.log('🎉 Cleanup complete!');
}

cleanup()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });