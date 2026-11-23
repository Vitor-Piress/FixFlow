import { expect, test } from "@playwright/test";
import { installMockSupabase } from "./fixtures/mockSupabase";

test.describe("AppSplashIntro and Motion navigation", () => {
  test("shows splash intro once per session, allows tap to skip, and skips on reload", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await installMockSupabase(page, { skipSplash: false });
    await page.goto("/quotes");

    const splash = page.getByTestId("app-splash-intro");
    await expect(splash).toBeVisible();
    await splash.click();
    await expect(splash).toBeHidden();

    // Reloading in the same session should not replay the splash intro.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Orçamentos" })).toBeVisible();
    await expect(page.getByTestId("app-splash-intro")).toHaveCount(0);

    // Navigate across all 4 BottomNav tabs and verify SegmentedControl transitions.
    await page.getByRole("link", { name: "Financeiro" }).click();
    await expect(page.getByRole("heading", { name: "Financeiro" })).toBeVisible();
    await page.getByRole("tab", { name: "Despesas Fixas" }).click();
    await expect(page.getByText("Despesas fixas mensais")).toBeVisible();

    await page.getByRole("link", { name: "Contratos" }).click();
    await expect(page.getByRole("heading", { name: "Contratos" })).toBeVisible();

    await page.getByRole("link", { name: "Catálogo" }).click();
    await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
    await page.getByRole("tab", { name: "Fornecedores" }).click();
    await expect(page.getByText("Refrigeração Catarinense")).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test("skips splash immediately when prefers-reduced-motion is reduce", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installMockSupabase(page, { skipSplash: false });
    await page.goto("/quotes");

    await expect(page.getByRole("heading", { name: "Orçamentos" })).toBeVisible();
    await expect(page.getByTestId("app-splash-intro")).toHaveCount(0);
  });
});
