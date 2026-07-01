/*
  Warnings:

  - The `method` column on the `Donation` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "exchangeRate" DECIMAL(10,4),
ADD COLUMN     "referenceNumber" TEXT,
DROP COLUMN "method",
ADD COLUMN     "method" TEXT;

-- AlterTable
ALTER TABLE "PaymentInfo" ADD COLUMN     "defaultCurrency" "Currency" NOT NULL DEFAULT 'USD';

-- DropEnum
DROP TYPE "DonationMethod";
