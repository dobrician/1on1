import { test, expect } from "./fixtures";

/**
 * Dashboard overview E2E tests.
 *
 * Verifies that /overview loads correctly for each role with
 * the welcome heading and key dashboard sections visible.
 */
test.describe("Dashboard overview", () => {
  test.setTimeout(30_000);

  test("admin sees /overview with welcome heading and upcoming/recent sessions", async ({
    adminPage,
  }) => {
    await adminPage.goto("/overview");
    await expect(adminPage.getByText(/welcome/i)).toBeVisible({
      timeout: 15_000,
    });
    // Use exact: true to avoid strict-mode conflict with "No upcoming sessions this week"
    await expect(
      adminPage
        .getByRole("heading", { name: "Upcoming Sessions", exact: true })
        .first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      adminPage.getByRole("heading", { name: "Recent Sessions", exact: true })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("manager (bob) sees /overview with welcome heading", async ({
    managerPage,
  }) => {
    await managerPage.goto("/overview");
    await expect(managerPage.getByText(/welcome/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("member (dave) sees /overview with welcome heading", async ({
    memberPage,
  }) => {
    await memberPage.goto("/overview");
    await expect(memberPage.getByText(/welcome/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
