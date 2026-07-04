-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "externalRef" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "externalRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Donation_externalRef_key" ON "Donation"("externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_externalRef_key" ON "Expense"("externalRef");
