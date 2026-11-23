import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { installMockSupabase } from "./fixtures/mockSupabase";

test.describe("Quote preview header, static Pix, and single-page PDF/PNG export", () => {
  test("renders static Pix QR code, copies BR Code, and exports single-page A4 PDF and PNG without 375px overflow", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const win = window as Window & { __copiedTexts?: string[] };
      win.__copiedTexts = [];
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            win.__copiedTexts?.push(text);
          },
        },
      });
    });

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

    // Static Pix block with inline SVG QR Code and reference inside the document.
    await expect(previewDoc.getByText("Pagamento via Pix")).toBeVisible();
    await expect(
      previewDoc.getByRole("img", {
        name: "QR Code Pix de CARLOS HENRIQUE SILVA",
      }),
    ).toBeVisible();
    await expect(previewDoc.getByText("FIXFLOW0007")).toBeVisible();
    await expect(previewDoc.getByText("12345678000195")).toBeVisible();

    // Zero horizontal overflow at 375px.
    const layoutMetrics = await previewDoc.evaluate((element) => ({
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
      docOverflow: element.scrollWidth > element.clientWidth + 1,
    }));
    expect(layoutMetrics.pageOverflow).toBe(false);
    expect(layoutMetrics.docOverflow).toBe(false);

    // Quick copy Pix and isolated WhatsApp Pix link in sheet footer.
    const copyPixButton = page.getByRole("button", {
      name: "Copiar Pix",
      exact: true,
    });
    await expect(copyPixButton).toBeVisible();
    const copyPixBox = await copyPixButton.boundingBox();
    expect(copyPixBox).not.toBeNull();
    expect(copyPixBox!.height).toBeGreaterThanOrEqual(44);

    const pixWhatsappLink = page.getByRole("link", {
      name: "Pix no WhatsApp",
      exact: true,
    });
    await expect(pixWhatsappLink).toBeVisible();
    const pixWhatsappBox = await pixWhatsappLink.boundingBox();
    expect(pixWhatsappBox).not.toBeNull();
    expect(pixWhatsappBox!.height).toBeGreaterThanOrEqual(44);

    await copyPixButton.click();
    await expect(
      page.getByRole("button", { name: "Pix copiado" }),
    ).toBeVisible();
    await expect(page.getByText("Pix Copia e Cola copiado.")).toBeVisible();

    const copiedTexts = await page.evaluate(() => {
      const win = window as Window & { __copiedTexts?: string[] };
      return win.__copiedTexts ?? [];
    });
    expect(copiedTexts.length).toBe(1);
    expect(copiedTexts[0].startsWith("000201")).toBe(true);
    expect(copiedTexts[0]).toContain("br.gov.bcb.pix");
    expect(copiedTexts[0]).toContain("12345678000195");
    expect(copiedTexts[0]).toContain("1220.00");
    expect(copiedTexts[0]).toContain("FIXFLOW0007");

    const pixWhatsappHref = await pixWhatsappLink.getAttribute("href");
    expect(pixWhatsappHref).not.toBeNull();
    const pixWhatsappParsed = new URL(pixWhatsappHref!);
    expect(pixWhatsappParsed.origin).toBe("https://wa.me");
    expect(pixWhatsappParsed.pathname).toBe("/5548998887766");
    expect(pixWhatsappParsed.searchParams.get("text")).toBe(copiedTexts[0]);

    await page.getByRole("button", { name: "Fechar notificação" }).click();

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
    await expect(previewDoc.getByText("Pagamento via Pix")).toBeVisible();
  });

  test("hides Pix payment block and copy button when pix_key is empty", async ({
    page,
  }) => {
    const { quoteId } = await installMockSupabase(page, {
      pixKey: null,
    });
    await page.goto(`/quotes/${quoteId}`);
    await page.getByRole("button", { name: "Prévia do cliente" }).click();

    const previewDoc = page.locator("article");
    await expect(previewDoc).toBeVisible();
    await expect(previewDoc.getByText("Pagamento via Pix")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Copiar Pix/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Pix no WhatsApp" }),
    ).toHaveCount(0);
  });

  test("validates optional pix_key in BusinessProfileSheet and accepts valid phone key", async ({
    page,
  }) => {
    await installMockSupabase(page);
    await page.goto("/quotes");

    await page
      .getByRole("button", { name: "Dados do emitente e conta" })
      .click();

    const pixInput = page.getByLabel("Chave Pix");
    await expect(
      page.getByText(
        "Para telefone, inclua o DDD entre parênteses ou +55 (ex.: (48) 99999-8888) para diferenciar de CPF.",
      ),
    ).toBeVisible();

    await pixInput.fill("chave-invalida");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(
      page.getByText(
        "Informe uma chave Pix válida (CPF, CNPJ, telefone com DDD, e-mail ou chave aleatória).",
      ),
    ).toBeVisible();

    await pixInput.fill("(48) 99999-8888");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Dados do emitente salvos.")).toBeVisible();
  });
});
