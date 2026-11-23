import { expect, test } from "@playwright/test";
import { installMockSupabase } from "./fixtures/mockSupabase";

test.describe("Notification center, deep-linking, snooze, and preferences", () => {
  test("displays bell unread badge, filters by category, snoozes/unsnoozes, saves preferences, and deep-links cleanly at 375px", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await installMockSupabase(page);
    await page.goto("/quotes");

    // 3 unread notifications out of 4 active in mockSupabase.
    const bellButton = page.getByRole("button", {
      name: "Notificações, 3 não lidas",
    });
    await expect(bellButton).toBeVisible();
    const bellBox = await bellButton.boundingBox();
    expect(bellBox).not.toBeNull();
    expect(bellBox!.width).toBeGreaterThanOrEqual(44);
    expect(bellBox!.height).toBeGreaterThanOrEqual(44);

    // Open notification center sheet.
    await bellButton.click();
    await expect(
      page.getByRole("heading", { name: "Central de notificações" }),
    ).toBeVisible();
    await expect(
      page.getByText("Compra de gás refrigerante R410A: conta atrasada"),
    ).toBeVisible();
    await expect(
      page.getByText("Clínica Vida: contrato vence hoje"),
    ).toBeVisible();
    await expect(
      page.getByText("Condomínio Sol & Mar ainda não pagou (#007)"),
    ).toBeVisible();

    // Check zero horizontal overflow inside page and sheet at 375px.
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow).toBe(false);

    // Filter by Contracts.
    await page.getByRole("button", { name: /Contratos \(1\)/ }).click();
    await expect(
      page.getByText("Clínica Vida: contrato vence hoje"),
    ).toBeVisible();
    await expect(
      page.getByText("Condomínio Sol & Mar ainda não pagou (#007)"),
    ).toHaveCount(0);

    // Back to All.
    await page.getByRole("button", { name: /Todos \(4\)/ }).click();

    // Snooze the stale quote alert by 3 days and reactivate it.
    await page
      .getByRole("button", { name: "Adiar" })
      .nth(3)
      .click();
    await page.getByRole("button", { name: "3 dias" }).click();
    await expect(page.getByText("Alerta adiado por 3 dias.")).toBeVisible();

    const snoozedToggle = page.getByRole("button", { name: /Adiados \(1\)/ });
    await expect(snoozedToggle).toBeVisible();
    await snoozedToggle.click();
    await page.getByRole("button", { name: "Reativar" }).click();
    await expect(page.getByText("Alerta reativado.")).toBeVisible();

    // Switch to Preferences tab, edit advance days, verify Zod validation + save.
    await page.getByRole("tab", { name: "Preferências" }).click();
    const financeAdvanceInput = page.getByLabel(
      "Avisar com quantos dias de antecedência",
    ).first();
    await expect(financeAdvanceInput).toHaveValue("3");
    await financeAdvanceInput.fill("5");
    await page.getByRole("button", { name: "Salvar preferências" }).click();
    await expect(
      page.getByText("Preferências de alerta salvas."),
    ).toBeVisible();

    // Return to Alertas tab and click the overdue finance alert -> deep-links to /finance with overdue filter active.
    await page.getByRole("tab", { name: /Alertas/ }).click();
    await page
      .getByRole("button", {
        name: /Compra de gás refrigerante R410A: conta atrasada/,
      })
      .click();

    await expect(page).toHaveURL(/\/finance\?.*filter=overdue/);
    await expect(
      page.getByRole("button", { name: /Atrasados/ }),
    ).toHaveAttribute("aria-pressed", "true");

    // Reopen via ?notifications=open query param and test Mark all as read.
    await page.goto("/quotes?notifications=open");
    await expect(
      page.getByRole("heading", { name: "Central de notificações" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Marcar todas como lidas" }).click();
    await expect(
      page.getByText("Alertas marcados como lidos."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Fechar painel" }).click();
    await expect(
      page.getByRole("button", { name: "Notificações", exact: true }),
    ).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
