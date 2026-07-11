/*
  Warnings:

  - You are about to drop the column `gateway` on the `deposit_requests` table. All the data in the column will be lost.
  - You are about to drop the `payment_gateways` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "deposit_requests_gateway_idx";

-- AlterTable
ALTER TABLE "deposit_requests" DROP COLUMN "gateway";

-- DropTable
DROP TABLE "payment_gateways";

-- DropEnum
DROP TYPE "PaymentGatewayType";
