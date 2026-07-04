import { test, expect } from "@playwright/test";

test("admin can register an expense", async ({ page }) => {
  // Use a unique description per run so this assertion can only pass if THIS run's submit
  // actually worked, rather than matching a stale row left over from a prior run on a shared DB
  // (seed.test.ts does not reset expense data between runs).
  const description = `Compra E2E ${Date.now()}`;

  await page.goto("/admin/egresos");
  await page.getByRole("button", { name: "Registrar Compra" }).click();
  await page.locator("#desc").fill(description);
  await page.locator("#fecha").fill("2026-01-15");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.locator("#amountUsd").fill("15");
  await page.getByRole("button", { name: "Registrar Compra" }).click();
  await expect(page.getByText(description).first()).toBeVisible();
});
