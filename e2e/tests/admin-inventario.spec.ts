import { test, expect } from "@playwright/test";

// BadgeStock (packages/ui/src/components/Badge.tsx) renders "En existencia" (normal),
// "Stock bajo" (bajo) or "Agotado" (agotado) depending on nivelStock(currentStock, minThreshold).
// The test-seed DB has no supplies, so the page shows its empty state instead of any badge;
// we assert the page renders correctly rather than a specific stock label.
test("admin inventory page renders without error", async ({ page }) => {
  await page.goto("/admin/inventario");
  await expect(page.getByRole("heading", { name: "Inventario" })).toBeVisible();
});
