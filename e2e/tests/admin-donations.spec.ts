import { test, expect } from "@playwright/test";

test("admin can approve a pending donation", async ({ page, context }) => {
  // Use a unique contact per run so the assertions below can only match THIS run's donation,
  // rather than a stale row left over from a prior run on a shared DB (seed.test.ts does not
  // reset donation data between runs).
  const contact = `e2e-verify-${Date.now()}@example.com`;

  // Declare a donation as a logged-out visitor first, in a fresh context tab with no admin session.
  const publicPage = await context.browser()!.newContext().then((c) => c.newPage());
  await publicPage.goto("/donar");
  await publicPage.locator("#fecha").fill("2026-01-15");
  await publicPage.locator("#metodo").selectOption({ index: 0 });
  await publicPage.locator("#monto").fill("40");
  await publicPage.locator("#contacto").fill(contact);
  // The "show name publicly" radio is checked by default, which makes #nombre required.
  await publicPage.locator("#nombre").fill("E2E Verify Donor");
  await publicPage.getByRole("button", { name: "Declarar mi donación" }).click();
  await expect(publicPage.getByText("¡Gracias de corazón!")).toBeVisible();
  await publicPage.close();

  // Now, as the authenticated admin (storageState from auth.setup.ts), approve it.
  await page.goto("/admin/donaciones");
  await page.getByRole("button", { name: "Aprobar" }).first().click();

  // The approved donation must disappear from the "Por verificar" (pending) tab, since the
  // list reloads for the current tab after the verify action completes.
  await expect(page.getByText(contact)).not.toBeVisible({ timeout: 5000 });

  // And it must now show up under "Verificadas", proving the approve action actually worked
  // rather than the button click silently doing nothing.
  await page.getByRole("button", { name: "Verificadas" }).click();
  await expect(page.getByText(contact)).toBeVisible();
});
