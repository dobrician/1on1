import { test as setup, expect } from "@playwright/test";

const ADMIN_FILE = "e2e/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("alice@acme.example.com");
  await page.getByLabel(/password/i).fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/(dashboard|overview)?$/i, {
    timeout: 15_000,
  });

  await page.context().storageState({ path: ADMIN_FILE });
});
