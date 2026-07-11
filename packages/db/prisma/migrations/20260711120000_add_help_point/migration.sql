-- CreateEnum
CREATE TYPE "HelpPointType" AS ENUM ('person', 'organization');

-- CreateTable
CREATE TABLE "HelpPoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HelpPointType" NOT NULL,
    "description" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HelpPoint_isActive_idx" ON "HelpPoint"("isActive");
