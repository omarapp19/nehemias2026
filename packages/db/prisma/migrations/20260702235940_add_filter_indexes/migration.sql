-- CreateIndex
CREATE INDEX "Donation_method_idx" ON "Donation"("method");

-- CreateIndex
CREATE INDEX "Donation_currency_idx" ON "Donation"("currency");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_supplier_idx" ON "Expense"("supplier");

-- CreateIndex
CREATE INDEX "Expense_currency_idx" ON "Expense"("currency");
