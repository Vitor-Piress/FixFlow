import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { installMockSupabase } from "./fixtures/mockSupabase";

test.describe("Quote preview header and single-page PDF/PNG export", () => {
  test("renders organized provider fields, exports single-page A4 PDF and PNG with WhatsApp follow-up", async ({
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

    // Structured provider metadata grid (no mashed middot string).
    await expect(previewHeader.getByText("CNPJ", { exact: true })).toBeVisible();
    await expect(previewHeader.getByText("12.345.678/0001-95")).toBeVisible();
    await expect(
      previewHeader.getByText("Telefone", { exact: true }),
    ).toBeVisible();
    await expect(previewHeader.getByText("(48) 99999-8888")).toBeVisible();
    await expect(
      previewHeader.getByText("Cidade", { exact: true }),
    ).toBeVisible();
    await expect(previewHeader.getByText("São José - SC")).toBeVisible();
    await expect(
      previewHeader.getByText("E-mail", { exact: true }),
    ).toBeVisible();
    await expect(
      previewHeader.getByText("contato@climatech.com.br"),
    ).toBeVisible();

    await expect(previewDoc.getByText("R$ 900,00")).toBeVisible();

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

    // Dismiss toast with X button while BottomSheet stays open.
    await page.getByRole("button", { name: "Fechar notificação" }).click();

    // Export PDF and verify the generated file strictly has 1 single A4 page.
    const pdfDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar PDF" }).click();
    const pdfDownload = await pdfDownloadPromise;
    expect(pdfDownload.suggestedFilename()).toBe(
      "orcamento-007-condominio-sol-mar.pdf",
    );
    await expect(page.getByText("PDF do orçamento baixado.")).toBeVisible();

    const pdfPath = await pdfDownload.path();
    expect(pdfPath).not.toBeNull();
    const pdfRaw = fs.readFileSync(pdfPath!, "latin1");
    expect(pdfRaw.startsWith("%PDF-")).toBe(true);
    const pagesCountMatch = pdfRaw.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/);
    expect(pagesCountMatch).not.toBeNull();
    expect(Number(pagesCountMatch![1])).toBe(1);
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
