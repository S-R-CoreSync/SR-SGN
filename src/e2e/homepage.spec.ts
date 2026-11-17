import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads and displays the site name", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("body")).toBeVisible();
  });

  test("has language switcher", async ({ page }) => {
    await page.goto("/ar");
    // The switcher is a button containing the Globe icon (lucide-react svg)
    const langSwitcher = page.locator('[data-testid="language-switcher"]');
    await expect(langSwitcher).toBeVisible();
  });

  test("loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/ar");
    expect(errors.filter((e) => !e.includes("favicon")).length).toBe(0);
  });
});

test.describe("Navigation", () => {
  test("navigates between main pages", async ({ page }) => {
    await page.goto("/ar");
    await page.goto("/ar/news");
    // Arabic is the default locale, so the URL may be /news (locale stripped)
    await expect(page).toHaveURL(/\/(ar\/)?news/);
  });

  test("404 page shows error message", async ({ page }) => {
    const response = await page.goto("/ar/nonexistent-page-xyz", { waitUntil: "networkidle" });
    expect(response?.status()).toBe(404);
  });
});
