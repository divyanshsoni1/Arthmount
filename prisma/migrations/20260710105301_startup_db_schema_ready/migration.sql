-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('ACTIVE', 'MATURED', 'CANCELLED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ProfitStatus" AS ENUM ('PENDING', 'CREDITED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('UPFRONT', 'WEEKLY', 'REFERRAL', 'BONUS', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'CREDITED', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WithdrawalMethod" AS ENUM ('BANK', 'UPI');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DepositMethod" AS ENUM ('UPI', 'BANK_TRANSFER', 'CARD', 'NET_BANKING', 'WALLET', 'CRYPTO');

-- CreateEnum
CREATE TYPE "PaymentGatewayType" AS ENUM ('RAZORPAY', 'CASHFREE', 'PHONEPE', 'PAYTM', 'STRIPE', 'MANUAL');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'PROFIT', 'COMMISSION', 'BONUS', 'REFUND', 'PENALTY', 'ADJUSTMENT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'WEEKLY_PROFIT', 'AGENT_COMMISSION', 'ADMIN_ADJUSTMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "KycProvider" AS ENUM ('MANUAL', 'CASHFREE', 'SIGNZY', 'DIGIO', 'HYPERVERGE');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'AUTO_APPROVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'PROFIT', 'COMMISSION', 'KYC', 'SECURITY', 'PROMOTION', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS_AND_CONDITIONS', 'PRIVACY_POLICY', 'KYC_CONSENT', 'INVESTMENT_AGREEMENT', 'RISK_DISCLOSURE', 'AML_POLICY', 'MARKETING', 'EMAIL_COMMUNICATION', 'SMS_COMMUNICATION');

-- CreateEnum
CREATE TYPE "GatewayMode" AS ENUM ('SANDBOX', 'LIVE');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('NATIONAL', 'BANK', 'MARKET', 'WEEKEND', 'SPECIAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'ENABLE', 'DISABLE', 'RESET_PASSWORD', 'RESET_PIN');

-- CreateEnum
CREATE TYPE "AuditResource" AS ENUM ('USER', 'KYC', 'DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'PACKAGE', 'PAYMENT_GATEWAY', 'OTP_PROVIDER', 'SMTP', 'SYSTEM_SETTING', 'NOTIFICATION', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('ACCOUNT', 'KYC', 'DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'PAYMENT', 'COMMISSION', 'SECURITY', 'BUG', 'FEATURE_REQUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'AGENT', 'ADMIN', 'SUPER_ADMIN', 'SUPPORT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "passwordHash" TEXT,
    "loginPinHash" TEXT,
    "transactionPinHash" TEXT,
    "dob" DATE,
    "gender" "Gender",
    "maritalStatus" "MaritalStatus",
    "panNumber" VARCHAR(10),
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "kycRejectedReason" TEXT,
    "mainBalance" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "investedBalance" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "commissionBalance" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "agentCode" VARCHAR(30),
    "referredById" UUID,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "sessionRevokedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "description" TEXT,
    "minAmount" DECIMAL(18,2) NOT NULL,
    "maxAmount" DECIMAL(18,2) NOT NULL,
    "dailyReturnRate" DECIMAL(8,4) NOT NULL,
    "tenureDays" INTEGER NOT NULL,
    "maxInvestmentsPerUser" INTEGER,
    "allowMultipleInvestments" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "principalAmount" DECIMAL(18,2) NOT NULL,
    "dailyReturnRate" DECIMAL(8,4) NOT NULL,
    "tenureDays" INTEGER NOT NULL,
    "completedDays" INTEGER NOT NULL DEFAULT 0,
    "totalProfitEarned" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "totalProfitPaid" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "pendingProfit" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "investedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "lastProfitDate" TIMESTAMP(3),
    "status" "InvestmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_profit_accumulations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "investmentId" UUID NOT NULL,
    "grossProfit" DECIMAL(18,2) NOT NULL,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "feeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "netProfit" DECIMAL(18,2) NOT NULL,
    "profitDate" DATE NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "ProfitStatus" NOT NULL DEFAULT 'PENDING',
    "creditedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_profit_accumulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_commissions" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "investmentId" UUID,
    "type" "CommissionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "weekNumber" INTEGER,
    "year" INTEGER,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "creditedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "ledgerId" UUID,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "agent_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "fee" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "tax" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "method" "WithdrawalMethod" NOT NULL,
    "accountHolderName" VARCHAR(150),
    "bankName" VARCHAR(100),
    "accountNumber" VARCHAR(50),
    "ifscCode" VARCHAR(20),
    "upiId" VARCHAR(100),
    "transactionReference" VARCHAR(100),
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "approvedById" UUID,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_requests" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "method" "DepositMethod" NOT NULL,
    "gateway" "PaymentGatewayType",
    "transactionReference" VARCHAR(150) NOT NULL,
    "gatewayOrderId" VARCHAR(150),
    "gatewayPaymentId" VARCHAR(150),
    "gatewayTransactionId" VARCHAR(150),
    "paymentProofUrl" TEXT,
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" UUID,
    "depositedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "deposit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "transactionType" "LedgerTransactionType" NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balanceBefore" DECIMAL(18,2) NOT NULL,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "referenceId" UUID,
    "referenceType" "ReferenceType" NOT NULL,
    "externalTransactionId" VARCHAR(150),
    "description" VARCHAR(255) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "KycProvider" NOT NULL DEFAULT 'MANUAL',
    "panNumber" VARCHAR(10),
    "panName" TEXT,
    "aadhaarNumber" VARCHAR(12),
    "aadhaarName" TEXT,
    "aadhaarDob" DATE,
    "panFrontUrl" TEXT,
    "aadhaarFrontUrl" TEXT,
    "aadhaarBackUrl" TEXT,
    "selfieUrl" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "faceMatchScore" DECIMAL(5,2),
    "verifiedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "reviewedById" UUID,
    "providerReferenceId" TEXT,
    "providerResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "actionUrl" TEXT,
    "imageUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "documentUrl" TEXT,
    "metadata" JSONB,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_gateways" (
    "id" UUID NOT NULL,
    "name" "PaymentGatewayType" NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "mode" "GatewayMode" NOT NULL DEFAULT 'SANDBOX',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "publicKey" TEXT,
    "secretKey" TEXT,
    "webhookSecret" TEXT,
    "config" JSONB,
    "webhookUrl" TEXT,
    "logoUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_gateways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_calendar" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isBusinessDay" BOOLEAN NOT NULL DEFAULT true,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "holidayName" VARCHAR(150),
    "holidayType" "HolidayType",
    "marketOpenTime" TIME(0),
    "marketCloseTime" TIME(0),
    "settlementAllowed" BOOLEAN NOT NULL DEFAULT true,
    "withdrawalAllowed" BOOLEAN NOT NULL DEFAULT true,
    "investmentAllowed" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "adminId" UUID,
    "action" "AuditAction" NOT NULL,
    "resourceType" "AuditResource" NOT NULL,
    "resourceId" UUID,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "requestId" VARCHAR(100),
    "sessionId" VARCHAR(100),
    "status" "AuditStatus" NOT NULL DEFAULT 'SUCCESS',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ticketNumber" VARCHAR(30) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" UUID,
    "attachmentUrl" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "feedback" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceId" VARCHAR(255) NOT NULL,
    "platform" VARCHAR(50),
    "pushToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_panNumber_key" ON "users"("panNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_agentCode_key" ON "users"("agentCode");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_agentCode_idx" ON "users"("agentCode");

-- CreateIndex
CREATE INDEX "users_kycStatus_idx" ON "users"("kycStatus");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "packages_name_key" ON "packages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "packages_code_key" ON "packages"("code");

-- CreateIndex
CREATE INDEX "packages_isActive_idx" ON "packages"("isActive");

-- CreateIndex
CREATE INDEX "packages_isVisible_idx" ON "packages"("isVisible");

-- CreateIndex
CREATE INDEX "packages_displayOrder_idx" ON "packages"("displayOrder");

-- CreateIndex
CREATE INDEX "packages_createdAt_idx" ON "packages"("createdAt");

-- CreateIndex
CREATE INDEX "investments_userId_idx" ON "investments"("userId");

-- CreateIndex
CREATE INDEX "investments_packageId_idx" ON "investments"("packageId");

-- CreateIndex
CREATE INDEX "investments_status_idx" ON "investments"("status");

-- CreateIndex
CREATE INDEX "investments_investedAt_idx" ON "investments"("investedAt");

-- CreateIndex
CREATE INDEX "investments_maturityDate_idx" ON "investments"("maturityDate");

-- CreateIndex
CREATE INDEX "investments_createdAt_idx" ON "investments"("createdAt");

-- CreateIndex
CREATE INDEX "investments_userId_status_idx" ON "investments"("userId", "status");

-- CreateIndex
CREATE INDEX "investments_userId_createdAt_idx" ON "investments"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "weekly_profit_accumulations_userId_idx" ON "weekly_profit_accumulations"("userId");

-- CreateIndex
CREATE INDEX "weekly_profit_accumulations_investmentId_idx" ON "weekly_profit_accumulations"("investmentId");

-- CreateIndex
CREATE INDEX "weekly_profit_accumulations_status_idx" ON "weekly_profit_accumulations"("status");

-- CreateIndex
CREATE INDEX "weekly_profit_accumulations_profitDate_idx" ON "weekly_profit_accumulations"("profitDate");

-- CreateIndex
CREATE INDEX "weekly_profit_accumulations_weekNumber_year_idx" ON "weekly_profit_accumulations"("weekNumber", "year");

-- CreateIndex
CREATE INDEX "weekly_profit_accumulations_userId_status_idx" ON "weekly_profit_accumulations"("userId", "status");

-- CreateIndex
CREATE INDEX "weekly_profit_accumulations_investmentId_profitDate_idx" ON "weekly_profit_accumulations"("investmentId", "profitDate");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_profit_accumulations_investmentId_profitDate_key" ON "weekly_profit_accumulations"("investmentId", "profitDate");

-- CreateIndex
CREATE INDEX "agent_commissions_agentId_idx" ON "agent_commissions"("agentId");

-- CreateIndex
CREATE INDEX "agent_commissions_clientId_idx" ON "agent_commissions"("clientId");

-- CreateIndex
CREATE INDEX "agent_commissions_investmentId_idx" ON "agent_commissions"("investmentId");

-- CreateIndex
CREATE INDEX "agent_commissions_status_idx" ON "agent_commissions"("status");

-- CreateIndex
CREATE INDEX "agent_commissions_type_idx" ON "agent_commissions"("type");

-- CreateIndex
CREATE INDEX "agent_commissions_weekNumber_year_idx" ON "agent_commissions"("weekNumber", "year");

-- CreateIndex
CREATE INDEX "agent_commissions_createdAt_idx" ON "agent_commissions"("createdAt");

-- CreateIndex
CREATE INDEX "agent_commissions_agentId_status_idx" ON "agent_commissions"("agentId", "status");

-- CreateIndex
CREATE INDEX "agent_commissions_agentId_createdAt_idx" ON "agent_commissions"("agentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_transactionReference_key" ON "withdrawals"("transactionReference");

-- CreateIndex
CREATE INDEX "withdrawals_userId_idx" ON "withdrawals"("userId");

-- CreateIndex
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");

-- CreateIndex
CREATE INDEX "withdrawals_method_idx" ON "withdrawals"("method");

-- CreateIndex
CREATE INDEX "withdrawals_requestedAt_idx" ON "withdrawals"("requestedAt");

-- CreateIndex
CREATE INDEX "withdrawals_approvedById_idx" ON "withdrawals"("approvedById");

-- CreateIndex
CREATE INDEX "withdrawals_userId_status_idx" ON "withdrawals"("userId", "status");

-- CreateIndex
CREATE INDEX "withdrawals_status_requestedAt_idx" ON "withdrawals"("status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_requests_transactionReference_key" ON "deposit_requests"("transactionReference");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_requests_gatewayOrderId_key" ON "deposit_requests"("gatewayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_requests_gatewayPaymentId_key" ON "deposit_requests"("gatewayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_requests_gatewayTransactionId_key" ON "deposit_requests"("gatewayTransactionId");

-- CreateIndex
CREATE INDEX "deposit_requests_userId_idx" ON "deposit_requests"("userId");

-- CreateIndex
CREATE INDEX "deposit_requests_status_idx" ON "deposit_requests"("status");

-- CreateIndex
CREATE INDEX "deposit_requests_method_idx" ON "deposit_requests"("method");

-- CreateIndex
CREATE INDEX "deposit_requests_gateway_idx" ON "deposit_requests"("gateway");

-- CreateIndex
CREATE INDEX "deposit_requests_depositedAt_idx" ON "deposit_requests"("depositedAt");

-- CreateIndex
CREATE INDEX "deposit_requests_userId_status_idx" ON "deposit_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "deposit_requests_status_depositedAt_idx" ON "deposit_requests"("status", "depositedAt");

-- CreateIndex
CREATE INDEX "ledger_userId_idx" ON "ledger"("userId");

-- CreateIndex
CREATE INDEX "ledger_transactionType_idx" ON "ledger"("transactionType");

-- CreateIndex
CREATE INDEX "ledger_entryType_idx" ON "ledger"("entryType");

-- CreateIndex
CREATE INDEX "ledger_referenceType_idx" ON "ledger"("referenceType");

-- CreateIndex
CREATE INDEX "ledger_createdAt_idx" ON "ledger"("createdAt");

-- CreateIndex
CREATE INDEX "ledger_userId_createdAt_idx" ON "ledger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ledger_userId_transactionType_idx" ON "ledger"("userId", "transactionType");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_documents_userId_key" ON "kyc_documents"("userId");

-- CreateIndex
CREATE INDEX "kyc_documents_status_idx" ON "kyc_documents"("status");

-- CreateIndex
CREATE INDEX "kyc_documents_provider_idx" ON "kyc_documents"("provider");

-- CreateIndex
CREATE INDEX "kyc_documents_reviewedById_idx" ON "kyc_documents"("reviewedById");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_channel_idx" ON "notifications"("channel");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_status_createdAt_idx" ON "notifications"("status", "createdAt");

-- CreateIndex
CREATE INDEX "user_consents_userId_idx" ON "user_consents"("userId");

-- CreateIndex
CREATE INDEX "user_consents_consentType_idx" ON "user_consents"("consentType");

-- CreateIndex
CREATE INDEX "user_consents_acceptedAt_idx" ON "user_consents"("acceptedAt");

-- CreateIndex
CREATE INDEX "user_consents_userId_consentType_idx" ON "user_consents"("userId", "consentType");

-- CreateIndex
CREATE INDEX "user_consents_userId_acceptedAt_idx" ON "user_consents"("userId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateways_name_key" ON "payment_gateways"("name");

-- CreateIndex
CREATE INDEX "payment_gateways_isActive_idx" ON "payment_gateways"("isActive");

-- CreateIndex
CREATE INDEX "payment_gateways_mode_idx" ON "payment_gateways"("mode");

-- CreateIndex
CREATE INDEX "payment_gateways_displayOrder_idx" ON "payment_gateways"("displayOrder");

-- CreateIndex
CREATE INDEX "trading_calendar_date_idx" ON "trading_calendar"("date");

-- CreateIndex
CREATE INDEX "trading_calendar_isBusinessDay_idx" ON "trading_calendar"("isBusinessDay");

-- CreateIndex
CREATE INDEX "trading_calendar_isHoliday_idx" ON "trading_calendar"("isHoliday");

-- CreateIndex
CREATE UNIQUE INDEX "trading_calendar_date_key" ON "trading_calendar"("date");

-- CreateIndex
CREATE INDEX "admin_audit_logs_adminId_idx" ON "admin_audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_resourceType_idx" ON "admin_audit_logs"("resourceType");

-- CreateIndex
CREATE INDEX "admin_audit_logs_resourceId_idx" ON "admin_audit_logs"("resourceId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_status_idx" ON "admin_audit_logs"("status");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_adminId_createdAt_idx" ON "admin_audit_logs"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_resourceType_resourceId_idx" ON "admin_audit_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "support_tickets_ticketNumber_idx" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX "support_tickets_category_idx" ON "support_tickets"("category");

-- CreateIndex
CREATE INDEX "support_tickets_assignedToId_idx" ON "support_tickets"("assignedToId");

-- CreateIndex
CREATE INDEX "support_tickets_createdAt_idx" ON "support_tickets"("createdAt");

-- CreateIndex
CREATE INDEX "user_devices_userId_idx" ON "user_devices"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_userId_deviceId_key" ON "user_devices"("userId", "deviceId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_profit_accumulations" ADD CONSTRAINT "weekly_profit_accumulations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_profit_accumulations" ADD CONSTRAINT "weekly_profit_accumulations_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_commissions" ADD CONSTRAINT "agent_commissions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_commissions" ADD CONSTRAINT "agent_commissions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_commissions" ADD CONSTRAINT "agent_commissions_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
