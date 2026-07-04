import { test, expect } from "@playwright/test";

test("admin can register an expense", async ({ page }) => {
  await page.goto("/admin/egresos");
  await page.getByRole("button", { name: "Registrar Compra" }).click();
  await page.locator("#desc").fill("Compra E2E de prueba");
  await page.locator("#fecha").fill("2026-01-15");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.locator("#amountUsd").fill("15");
  await page.getByRole("button", { name: "Registrar Compra" }).click();
  await expect(page.getByText("Compra E2E de prueba").first()).toBeVisible();
});
