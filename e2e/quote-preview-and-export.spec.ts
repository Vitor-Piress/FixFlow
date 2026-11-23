import { expect, test } from "@playwright/test";
import { installMockSupabase } from "./fixtures/mockSupabase";

test.describe("Quote preview header and PDF/PNG export with WhatsApp shortcut", () => {
  test("renders compact header, respects show_item_prices, and exports PDF/PNG with WhatsApp follow-up toast", async ({
    page,
  }) => {
    const { quoteId } = await installMockSupabase(page, {
      showItemPrices: true,
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/quotes/${quoteId}`);

    await page.getByRole("button", { name: "Prévia do cliente" }).click();

    const previewDoc = page.locator("article");
    const previewHeader = previewDoc.locator("header");
    await expect(previewDoc).toBeVisible();
    await expect(
      previewHeader.getByText("ClimaTech Serviços Prediais"),
    ).toBeVisible();
    await expect(previewHeader.getByText("#007")).toBeVisible();
    await expect(previewHeader.getByText(/Emissão 20\/11\/2026/)).toBeVisible();
    await expect(previewHeader.getByText(/Validade 08\/12\/2026/)).toBeVisible();
    await expect(previewDoc.getByText("R$ 900,00")).toBeVisible();

    // Compact header should stay harmonious (well under 170px tall on 375px width).
    const headerBox = await previewHeader.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(headerBox!.height).toBeLessThan(170);

    // Export PNG triggers file download and offers "Abrir WhatsApp" action in toast.
    const pngDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar imagem" }).click();
    const pngDownload = await pngDownloadPromise;
    expect(pngDownload.suggestedFilename()).toBe(
      "orcamento-007-condominio-sol-mar.png",
    );
    await expect(page.getByText("Imagem do orçamento baixada.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Abrir WhatsApp" }),
    ).toBeVisible();

    // Dismiss toast with X button before testing PDF.
    await page.getByRole("button", { name: "Fechar notificação" }).click();

    // Export PDF triggers file download cleanly.
    const pdfDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar PDF" }).click();
    const pdfDownload = await pdfDownloadPromise;
    expect(pdfDownload.suggestedFilename()).toBe(
      "orcamento-007-condominio-sol-mar.pdf",
    );
    await expect(page.getByText("PDF do orçamento baixado.")).toBeVisible();
  });

  test("hides unit prices and item subtotals when show_item_prices is false", async ({
    page,
  }) => {
    const { quoteId } = await installMockSupabase(page, {
      showItemPrices: false,
    });
    await page.goto(`/quotes/${quoteId}`);
    await page.getByRole("button", { name: "Prévia do cliente" }).click();

    const previewDoc = page.locator("article");
    await expect(previewDoc).toBeVisible();
    await expect(previewDoc.getByText("R$ 1.220,00")).toBeVisible();
    await expect(previewDoc.getByText("R$ 900,00")).toHaveCount(0);
    await expect(previewDoc.getByText("Subtotal dos itens")).toHaveCount(0);
  });
});
