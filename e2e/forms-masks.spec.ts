import { expect, test } from "@playwright/test";
import { installMockSupabase } from "./fixtures/mockSupabase";

test.describe("CPF/CNPJ and phone input masks", () => {
  test("applies phone mask and max length in quote, contract, and supplier forms while preserving default validity date", async ({
    page,
  }) => {
    await installMockSupabase(page);
    await page.goto("/quotes");

    // Quote form: keeps default +15 days validity and masks/caps phone at 11 digits.
    await page.getByRole("button", { name: "Novo orçamento" }).click();
    const quoteValidityInput = page.getByLabel("Validade (opcional)");
    await expect(quoteValidityInput).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);

    const quotePhoneInput = page.getByLabel("Telefone / WhatsApp (opcional)");
    await quotePhoneInput.fill("489999988889999");
    await expect(quotePhoneInput).toHaveValue("(48) 99999-8888");
    await page.getByRole("button", { name: "Fechar painel" }).click();

    // Contract form: masks and caps phone.
    await page.getByRole("link", { name: "Contratos" }).click();
    await page.getByRole("button", { name: "Novo contrato" }).click();
    const contractPhoneInput = page.getByLabel("Telefone / WhatsApp (opcional)");
    await contractPhoneInput.fill("4832224455");
    await expect(contractPhoneInput).toHaveValue("(48) 3222-4455");
    await contractPhoneInput.fill("489912345671234");
    await expect(contractPhoneInput).toHaveValue("(48) 99123-4567");
    await page.getByRole("button", { name: "Fechar painel" }).click();

    // Supplier form: masks and caps phone.
    await page.getByRole("link", { name: "Catálogo" }).click();
    await page.getByRole("tab", { name: "Fornecedores" }).click();
    await page.getByRole("button", { name: "Novo fornecedor" }).click();
    const supplierPhoneInput = page.getByLabel("WhatsApp / Telefone (opcional)");
    await supplierPhoneInput.fill("489876543210000");
    await expect(supplierPhoneInput).toHaveValue("(48) 98765-4321");
  });

  test("applies adaptive CPF and CNPJ mask + phone mask in BusinessProfileSheet", async ({
    page,
  }) => {
    await installMockSupabase(page);
    await page.goto("/quotes");

    await page
      .getByRole("button", { name: "Dados do emitente e conta" })
      .click();

    const docInput = page.getByLabel("CPF ou CNPJ");
    const phoneInput = page.getByLabel("Telefone / WhatsApp");

    // Preloaded DB values appear masked.
    await expect(docInput).toHaveValue("12.345.678/0001-95");
    await expect(phoneInput).toHaveValue("(48) 99999-8888");

    // Typing CPF (11 digits).
    await docInput.fill("12345678901");
    await expect(docInput).toHaveValue("123.456.789-01");

    // Typing CNPJ (14 digits) with extra digits gets capped cleanly.
    await docInput.fill("987654320001109999");
    await expect(docInput).toHaveValue("98.765.432/0001-10");

    // Typing phone with extra digits gets capped cleanly.
    await phoneInput.fill("48988887777111");
    await expect(phoneInput).toHaveValue("(48) 98888-7777");
  });
});
