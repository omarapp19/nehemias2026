-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'VES');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('admin', 'coordinator');

-- CreateEnum
CREATE TYPE "DonationType" AS ENUM ('financial', 'in_kind');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "DonationMethod" AS ENUM ('pago_movil', 'transfer', 'cash', 'other');

-- CreateEnum
CREATE TYPE "SupplyOrigin" AS ENUM ('purchased', 'donated');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('in', 'out', 'adjust');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'coordinator',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "type" "DonationType" NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(14,2),
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "method" "DonationMethod",
    "donorName" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "donorContact" TEXT,
    "message" TEXT,
    "proofUrl" TEXT,
    "declaredByPublic" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "donatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InKindItem" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "supplyId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "InKindItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "category" TEXT,
    "supplier" TEXT,
    "invoiceUrl" TEXT,
    "createsStock" BOOLEAN NOT NULL DEFAULT false,
    "spentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supply" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL,
    "currentStock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "minThreshold" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "origin" "SupplyOrigin",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Frente" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Frente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "frenteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryItem" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "supplyId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "DeliveryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryPhoto" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,

    CONSTRAINT "DeliveryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInfo" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaymentInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "Donation_status_idx" ON "Donation"("status");

-- CreateIndex
CREATE INDEX "Donation_type_idx" ON "Donation"("type");

-- CreateIndex
CREATE INDEX "Donation_donatedAt_idx" ON "Donation"("donatedAt");

-- CreateIndex
CREATE INDEX "Expense_spentAt_idx" ON "Expense"("spentAt");

-- CreateIndex
CREATE INDEX "Supply_isUrgent_idx" ON "Supply"("isUrgent");

-- CreateIndex
CREATE INDEX "StockMovement_supplyId_idx" ON "StockMovement"("supplyId");

-- CreateIndex
CREATE INDEX "Delivery_deliveredAt_idx" ON "Delivery"("deliveredAt");

-- CreateIndex
CREATE INDEX "Delivery_frenteId_idx" ON "Delivery"("frenteId");

-- AddForeignKey
ALTER TABLE "InKindItem" ADD CONSTRAINT "InKindItem_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_frenteId_fkey" FOREIGN KEY ("frenteId") REFERENCES "Frente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryItem" ADD CONSTRAINT "DeliveryItem_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryPhoto" ADD CONSTRAINT "DeliveryPhoto_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

