import { test, expect } from "@playwright/test";

test.describe("Invite Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/people");
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
  });

  test("Invite people button opens the invite dialog", async ({ page }) => {
    await page.getByRole("button", { name: /Invite people/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Check dialog title and description
    await expect(
      dialog.getByRole("heading", { name: "Invite people" })
    ).toBeVisible();
    await expect(
      dialog.getByText("Send email invitations to join your organization.")
    ).toBeVisible();
  });

  test("invite dialog has email textarea, role selector, and action buttons", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Invite people/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Email textarea
    await expect(dialog.getByLabel(/Email addresses/i)).toBeVisible();
    await expect(
      dialog.getByPlaceholder(
        /Enter email addresses, one per line or comma-separated/i
      )
    ).toBeVisible();
    await expect(
      dialog.getByText("You can invite up to 50 people at once.")
    ).toBeVisible();

    // Role selector label - use exact match to avoid the description text
    await expect(dialog.getByLabel("Role")).toBeVisible();

    // Action buttons
    await expect(
      dialog.getByRole("button", { name: /Cancel/i })
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /Send invites/i })
    ).toBeVisible();
  });

  test("invite dialog cancel button closes the dialog", async ({ page }) => {
    await page.getByRole("button", { name: /Invite people/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.getByRole("button", { name: /Cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("invite dialog shows validation error for empty email", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Invite people/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Submit without entering emails
    await dialog.getByRole("button", { name: /Send invites/i }).click();

    // Should show validation error
    await expect(
      dialog.getByText(/Enter at least one email address/i)
    ).toBeVisible();
  });

  test("invite dialog role selector shows all roles", async ({ page }) => {
    await page.getByRole("button", { name: /Invite people/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Click the role selector to open it
    // The default value is "Member"
    const roleTrigger = dialog.locator("button[role='combobox']");
    await roleTrigger.click();

    // Should show all three role options
    await expect(page.getByRole("option", { name: "Member" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Manager" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Admin" })).toBeVisible();
  });

  test("invite dialog sends invite for valid email", async ({ page }) => {
    await page.getByRole("button", { name: /Invite people/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Enter a valid email (use a unique one to avoid conflicts)
    const uniqueEmail = `e2e-invite-${Date.now()}@test.example.com`;
    await dialog.getByLabel(/Email addresses/i).fill(uniqueEmail);

    // Submit
    await dialog.getByRole("button", { name: /Send invites/i }).click();

    // Dialog should close on success (wait longer for API call)
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });

    // Success toast should appear
    await expect(page.getByText(/invite.*sent successfully/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("invite dialog handles already-existing email", async ({ page }) => {
    await page.getByRole("button", { name: /Invite people/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Enter an already-existing user's email
    await dialog.getByLabel(/Email addresses/i).fill("alice@acme.example.com");

    // Submit
    await dialog.getByRole("button", { name: /Send invites/i }).click();

    // Should show a warning or remain open since the email was skipped
    // The API returns skipped emails with reasons
    await page.waitForTimeout(3000);

    // Either the dialog stays open (all skipped) or a warning toast appears
    const warningToast = page.getByText(/skipped/i);
    const errorToast = page.getByText(/already/i);
    const hasWarning = await warningToast.isVisible().catch(() => false);
    const hasError = await errorToast.isVisible().catch(() => false);

    // At least one of these should be true - existing emails should be handled
    expect(hasWarning || hasError || (await dialog.isVisible())).toBeTruthy();
  });
});
