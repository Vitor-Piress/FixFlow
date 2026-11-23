import { expect, test } from "@playwright/test";
import { installMockSupabase } from "./fixtures/mockSupabase";

test.describe("Toast close button and hidden horizontal scrollbars", () => {
  test("renders accessible X close button on Sonner toasts and dismisses on click", async ({
    page,
  }) => {
    await installMockSupabase(page);
    await page.goto("/quotes");

    await page
      .getByRole("button", { name: "Dados do emitente e conta" })
      .click();

    const docInput = page.getByLabel("CPF ou CNPJ");
    await expect(docInput).toHaveValue("12.345.678/0001-95");
    await docInput.fill("12345678901");
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    const toastMessage = page.getByText("Dados do emitente salvos.");
    await expect(toastMessage).toBeVisible();

    const closeButton = page.getByRole("button", { name: "Fechar notificação" });
    await expect(closeButton).toBeVisible();

    const box = await closeButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await closeButton.click();
    await expect(toastMessage).toBeHidden();
  });

  test("hides visible scrollbars on /quotes, /finance, and /catalog without horizontal overflow at 375px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await installMockSupabase(page);

    const routesToCheck = [
      { path: "/quotes", groupLabel: "Filtrar orçamentos por status" },
      { path: "/finance", groupLabel: "Filtrar lançamentos do mês" },
      { path: "/catalog", groupLabel: "Filtrar serviços por categoria" },
    ];

    for (const target of routesToCheck) {
      await page.goto(target.path);
      const filterGroup = page.getByRole("group", { name: target.groupLabel });
      await expect(filterGroup).toBeVisible();

      const scrollbarWidth = await filterGroup.evaluate(
        (element) => window.getComputedStyle(element).scrollbarWidth,
      );
      expect(scrollbarWidth).toBe("none");

      const hasPageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(hasPageOverflow).toBe(false);
    }
  });
});
