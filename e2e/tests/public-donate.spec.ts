import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } }); // no admin session needed

test("Camino A: payment method info is visible on the donate page", async ({ page }) => {
  await page.goto("/donar");
  await expect(page.getByRole("heading", { name: "Medios de recaudación" })).toBeVisible();
});

test("Camino B: declaring a donation shows the confirmation message", async ({ page }) => {
  await page.goto("/donar");
  await page.locator("#fecha").fill("2026-01-15");
  await page.locator("#metodo").selectOption({ index: 0 });
  await page.locator("#monto").fill("25");
  await page.locator("#contacto").fill("e2e-donor@example.com");
  // The "show name publicly" radio is checked by default, which makes #nombre required.
  await page.locator("#nombre").fill("E2E Donor");
  await page.getByRole("button", { name: "Declarar mi donación" }).click();
  await expect(page.getByText("¡Gracias de corazón!")).toBeVisible();
});
