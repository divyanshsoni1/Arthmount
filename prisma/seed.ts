import "dotenv/config";
import { PrismaClient, Role, KycStatus } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ────────────────────────────────────────────────────────────────

async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
}

// ─── Environment Helpers ──────────────────────────────────────────────────

function getEnvArray(key: string, fallback: string[]): string[] {
    const value = process.env[key];
    if (!value) return fallback;
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

function getEnvString(key: string, fallback: string): string {
    return process.env[key] || fallback;
}

// ─── Seed ──────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Clean all tables (PostgreSQL)
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

    console.log('🧹 All tables cleared.');

    // ─── Users ──────────────────────────────────────────────────────────────

    // Admin details from env
    const adminEmail = getEnvString('ADMIN_EMAIL', 'divyanshsonijii@gmail.com');
    const adminPhone = getEnvString('ADMIN_PHONE', '8305180151');
    const adminPass = getEnvString('ADMIN_PASS', 'Admin@123');

    // User details from env (comma-separated)
    const userEmails = getEnvArray('USER_EMAIL', [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
        'user4@example.com',
        'user5@example.com',
        'user6@example.com',
        'user7@example.com',
        'user8@example.com',
        'user9@example.com',
        'user10@example.com',
    ]);
    const userPhones = getEnvArray('USER_PHONE', [
        '9000000001',
        '9000000002',
        '9000000003',
        '9000000004',
        '9000000005',
        '9000000006',
        '9000000007',
        '9000000008',
        '9000000009',
        '9000000010',
    ]);
    const userPass = getEnvString('USER_PASS', 'User@123');

    // Ensure arrays have same length – pad with fallback if needed
    const maxUsers = Math.max(userEmails.length, userPhones.length);
    while (userEmails.length < maxUsers) {
        userEmails.push(`user${userEmails.length + 1}@example.com`);
    }
    while (userPhones.length < maxUsers) {
        userPhones.push(`900000000${userPhones.length + 1}`);
    }

    const adminPassword = await hashPassword(adminPass);
    const userPassword = await hashPassword(userPass);

    // Create Admin
    const admin = await prisma.user.create({
        data: {
            name: 'Admin',
            email: adminEmail,
            phone: adminPhone,
            passwordHash: adminPassword,
            role: Role.SUPER_ADMIN,
            kycVerified: true,
            kycStatus: KycStatus.AUTO_APPROVED,
            mainBalance: 0,
            investedBalance: 0,
            commissionBalance: 0,
        },
    });
    console.log(`✅ Admin created: ${admin.email}`);

    // Create Regular Users
    const users = [];
    for (let i = 0; i < maxUsers; i++) {
        const email = userEmails[i];
        const phone = userPhones[i];
        const user = await prisma.user.create({
            data: {
                name: `User ${i + 1}`,
                email,
                phone,
                passwordHash: userPassword,
                role: Role.USER,
                kycVerified: i % 2 === 0, // some verified
                kycStatus: i % 2 === 0 ? KycStatus.APPROVED : KycStatus.PENDING,
                mainBalance: 0,
                investedBalance: 0,
                commissionBalance: 0,
            },
        });
        users.push(user);
        console.log(`✅ User created: ${email}`);
    }

    // Create Agents (hardcoded, but can be extended via env later)
    for (let i = 1; i <= 2; i++) {
        const phone = `900000001${i}`;
        const email = `agent${i}@example.com`;
        const agent = await prisma.user.create({
            data: {
                name: `Agent ${i}`,
                email,
                phone,
                passwordHash: userPassword,
                role: Role.AGENT,
                agentCode: `AG${String(i).padStart(4, '0')}`,
                kycVerified: true,
                kycStatus: KycStatus.APPROVED,
                mainBalance: 0,
                investedBalance: 0,
                commissionBalance: 0,
            },
        });
        console.log(`✅ Agent created: ${email}`);
    }

    // ─── Packages ────────────────────────────────────────────────────────────

    const packages = [
        {
            name: 'Silver Plan',
            code: 'SILVER',
            description: 'Low risk, steady returns',
            minAmount: 1000,
            maxAmount: 50000,
            dailyReturnRate: 0.005,
            tenureDays: 30,
            maxInvestmentsPerUser: 3,
            allowMultipleInvestments: true,
            isActive: true,
            isVisible: true,
            displayOrder: 1,
        },
        {
            name: 'Gold Plan',
            code: 'GOLD',
            description: 'Medium risk, higher returns',
            minAmount: 5000,
            maxAmount: 200000,
            dailyReturnRate: 0.0075,
            tenureDays: 45,
            maxInvestmentsPerUser: 2,
            allowMultipleInvestments: true,
            isActive: true,
            isVisible: true,
            displayOrder: 2,
        },
        {
            name: 'Platinum Plan',
            code: 'PLATINUM',
            description: 'High risk, maximum returns',
            minAmount: 10000,
            maxAmount: 500000,
            dailyReturnRate: 0.01,
            tenureDays: 60,
            maxInvestmentsPerUser: 1,
            allowMultipleInvestments: false,
            isActive: true,
            isVisible: true,
            displayOrder: 3,
        },
    ];

    for (const pkg of packages) {
        await prisma.package.create({ data: pkg });
        console.log(`✅ Package created: ${pkg.name}`);
    }

    // ─── Trading Calendar (sample) ──────────────────────────────────────────

    const today = new Date();
    const nextBusinessDay = new Date(today);
    nextBusinessDay.setDate(today.getDate() + 1);

    await prisma.tradingCalendar.create({
        data: {
            date: nextBusinessDay,
            dayOfWeek: nextBusinessDay.getDay() === 0 ? 7 : nextBusinessDay.getDay(),
            isBusinessDay: true,
            isHoliday: false,
            settlementAllowed: true,
            withdrawalAllowed: true,
            investmentAllowed: true,
        },
    });
    console.log('✅ Trading calendar entry seeded.');

    console.log('🎉 Seeding complete!');
}

// ─── Run ──────────────────────────────────────────────────────────────────

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });