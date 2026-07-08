import { test as setup, expect } from "@playwright/test";

const authFile = "tests/admin.auth.json";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/admin/login");
  await page.locator("#email").fill(process.env.SEED_ADMIN_EMAIL ?? "admin@test.local");
  await page.locator("#password").fill(process.env.SEED_ADMIN_PASSWORD ?? "test-admin-password-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.context().storageState({ path: authFile });
});
