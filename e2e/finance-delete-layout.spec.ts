import { expect, test } from "@playwright/test";
import { installMockSupabase } from "./fixtures/mockSupabase";

test.describe("Finance delete icon button and aligned layout", () => {
  test("places icon-only trash button on the left for manual transactions while keeping right actions aligned across all entries", async ({
    page,
  }) => {
    await installMockSupabase(page);
    await page.goto("/finance");

    const manualRow = page
      .locator("li")
      .filter({ hasText: "Compra de gás refrigerante R410A" });
    const contractRow = page
      .locator("li")
      .filter({ hasText: "Mensalidade Clínica Vida" });
    const recurringRow = page
      .locator("li")
      .filter({ hasText: "Internet fibra escritório" });

    await expect(manualRow).toBeVisible();
    await expect(contractRow).toBeVisible();
    await expect(recurringRow).toBeVisible();

    const deleteButton = manualRow.getByRole("button", {
      name: "Excluir lançamento Compra de gás refrigerante R410A",
    });
    await expect(deleteButton).toBeVisible();
    // Icon-only button: no visible text label "Excluir".
    await expect(deleteButton).toHaveText("");

    // Non-manual rows have no delete button.
    await expect(
      contractRow.getByRole("button", { name: /Excluir lançamento/i }),
    ).toHaveCount(0);
    await expect(
      recurringRow.getByRole("button", { name: /Excluir lançamento/i }),
    ).toHaveCount(0);

    const deleteBox = await deleteButton.boundingBox();
    const manualEditBox = await manualRow
      .getByRole("button", { name: /Editar lançamento/i })
      .boundingBox();
    const contractEditBox = await contractRow
      .getByRole("button", { name: /Editar lançamento/i })
      .boundingBox();

    expect(deleteBox).not.toBeNull();
    expect(manualEditBox).not.toBeNull();
    expect(contractEditBox).not.toBeNull();

    // Trash icon meets 44x44px tap target and sits on the opposite (left) extremity.
    expect(deleteBox!.width).toBeGreaterThanOrEqual(44);
    expect(deleteBox!.height).toBeGreaterThanOrEqual(44);
    expect(deleteBox!.x + deleteBox!.width).toBeLessThan(manualEditBox!.x);

    // Right edge of "Editar" is identically aligned between deletable and non-deletable rows.
    const manualEditRight = manualEditBox!.x + manualEditBox!.width;
    const contractEditRight = contractEditBox!.x + contractEditBox!.width;
    expect(Math.abs(manualEditRight - contractEditRight)).toBeLessThanOrEqual(
      2,
    );

    // Deleting via ConfirmSheet removes the manual entry.
    await deleteButton.click();
    await expect(
      page.getByRole("heading", { name: "Excluir lançamento" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(manualRow).toHaveCount(0);
  });

  test("keeps finance summary card values on single intact lines without overflow at 375px even with large negative balances", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await installMockSupabase(page, {
      transactions: [
        {
          id: "55555555-5555-4555-8555-555555555601",
          type: "income",
          status: "paid",
          description: "Obra comercial completa",
          category: "Serviços / Orçamentos",
          amount_cents: 1250000000, // R$ 12.500.000,00
        },
        {
          id: "55555555-5555-4555-8555-555555555602",
          type: "income",
          status: "pending",
          description: "Parcela final da obra",
          category: "Serviços / Orçamentos",
          amount_cents: 150000000, // R$ 1.500.000,00
        },
        {
          id: "55555555-5555-4555-8555-555555555603",
          type: "expense",
          status: "paid",
          description: "Fornecimento de equipamentos VRF",
          category: "Materiais e Peças",
          amount_cents: 2508700000, // R$ 25.087.000,00
        },
      ],
    });

    await page.goto("/finance");

    const heroBalance = page.getByTestId("finance-realized-balance");
    const incomeValue = page.getByTestId("finance-summary-income");
    const expenseValue = page.getByTestId("finance-summary-expense");
    const projectedValue = page.getByTestId("finance-summary-projected");
    const progressValue = page.getByTestId("finance-summary-received-progress");

    await expect(heroBalance).toContainText("-R$");
    await expect(heroBalance).toContainText("12.587.000,00");
    await expect(incomeValue).toContainText("12.500.000,00");
    await expect(expenseValue).toContainText("25.087.000,00");
    await expect(projectedValue).toContainText("-R$");
    await expect(projectedValue).toContainText("11.087.000,00");
    await expect(progressValue).toContainText("89% de R$");

    // No page-wide horizontal overflow at 375px.
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(pageOverflow).toBeLessThanOrEqual(0);

    // Every currency figure stays on a single line inside the summary card bounds (never splitting "-" from "R$").
    const summaryCard = heroBalance.locator("xpath=ancestor::section[1]");
    const cardBox = await summaryCard.boundingBox();
    expect(cardBox).not.toBeNull();

    for (const locator of [
      heroBalance,
      incomeValue,
      expenseValue,
      projectedValue,
      progressValue,
    ]) {
      const metrics = await locator.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const rects = Array.from(range.getClientRects()).filter(
          (rect) => rect.width > 0 && rect.height > 0,
        );
        const box = el.getBoundingClientRect();
        return {
          lineCount: new Set(rects.map((rect) => Math.round(rect.top))).size,
          left: box.left,
          right: box.right,
        };
      });

      expect(metrics.lineCount).toBe(1);
      expect(metrics.left).toBeGreaterThanOrEqual(cardBox!.x);
      expect(metrics.right).toBeLessThanOrEqual(
        cardBox!.x + cardBox!.width + 1,
      );
    }

    // Breakdown contains 2 side-by-side blocks (Entradas | Saídas), while Previsto sits above them under Saldo realizado.
    const breakdownItems = page
      .getByTestId("finance-summary-breakdown")
      .locator("> div");
    expect(await breakdownItems.count()).toBe(2);

    const heroBox = await heroBalance.boundingBox();
    const projectedBox = await projectedValue.boundingBox();
    const incomeBox = await incomeValue.boundingBox();
    const expenseBox = await expenseValue.boundingBox();

    expect(heroBox).not.toBeNull();
    expect(projectedBox).not.toBeNull();
    expect(incomeBox).not.toBeNull();
    expect(expenseBox).not.toBeNull();

    // Previsto sits below Saldo realizado and above Entradas | Saídas.
    expect(projectedBox!.y).toBeGreaterThan(heroBox!.y + heroBox!.height - 1);
    expect(incomeBox!.y).toBeGreaterThan(projectedBox!.y + projectedBox!.height);

    // Entradas and Saídas share the same row without horizontal collision.
    expect(Math.abs(incomeBox!.y - expenseBox!.y)).toBeLessThanOrEqual(2);
    expect(incomeBox!.x + incomeBox!.width).toBeLessThan(expenseBox!.x);
  });
});
