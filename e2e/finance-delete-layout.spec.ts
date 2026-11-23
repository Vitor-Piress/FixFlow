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
    expect(Math.abs(manualEditRight - contractEditRight)).toBeLessThanOrEqual(2);

    // Deleting via ConfirmSheet removes the manual entry.
    await deleteButton.click();
    await expect(
      page.getByRole("heading", { name: "Excluir lançamento" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(manualRow).toHaveCount(0);
  });
});
