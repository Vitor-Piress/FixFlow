import { expect, test } from "@playwright/test";
import { installMockSupabase } from "./fixtures/mockSupabase";

test.describe("UX fixes, client directory/autocomplete, and quote payment plans", () => {
  test("keeps BottomNav pill stable when switching tabs after page scroll and enforces Textarea height bounds", async ({
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
    await page.goto("/finance");
    await expect(page.getByText("Saldo realizado")).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Navegação principal" });
    const pill = page.getByTestId("bottom-nav-active-pill");
    await expect(pill).toBeVisible();

    const sampleTabSwitchAnimation = async (
      targetTabLabel: string,
      readyCheck: () => Promise<void>,
    ) => {
      // Force the current page to be genuinely tall so window.scrollY reaches >= 600px.
      await page.evaluate(() => {
        const main = document.getElementById("main-content");
        if (main) {
          main
            .querySelectorAll("[data-test-scroll-spacer]")
            .forEach((node) => node.remove());
          const spacer = document.createElement("div");
          spacer.dataset.testScrollSpacer = "true";
          spacer.style.height = "1400px";
          main.appendChild(spacer);
        }
        window.scrollTo(0, 650);
      });

      const scrollBefore = await page.evaluate(() => window.scrollY);
      expect(scrollBefore).toBeGreaterThanOrEqual(500);

      const baseline = await page.evaluate(() => {
        const navEl = document.querySelector(
          'nav[aria-label="Navegação principal"]',
        );
        const pillEl = document.querySelector(
          '[data-testid="bottom-nav-active-pill"]',
        );
        const navRect = navEl!.getBoundingClientRect();
        const pillRect = pillEl!.getBoundingClientRect();
        return {
          navTop: navRect.top,
          navBottom: navRect.bottom,
          pillTop: pillRect.top,
          pillBottom: pillRect.bottom,
          pillLeft: pillRect.left,
        };
      });

      // Start recording pill & nav bounding boxes on every animation frame during the transition.
      const framesPromise = page.evaluate(
        () =>
          new Promise<
            Array<{
              navTop: number;
              navBottom: number;
              pillTop: number;
              pillBottom: number;
              pillLeft: number;
              pillWidth: number;
              pillHeight: number;
            }>
          >((resolve) => {
            const frames: Array<{
              navTop: number;
              navBottom: number;
              pillTop: number;
              pillBottom: number;
              pillLeft: number;
              pillWidth: number;
              pillHeight: number;
            }> = [];
            const start = performance.now();

            const tick = () => {
              const navEl = document.querySelector(
                'nav[aria-label="Navegação principal"]',
              );
              const pillEl = document.querySelector(
                '[data-testid="bottom-nav-active-pill"]',
              );
              if (navEl && pillEl) {
                const navRect = navEl.getBoundingClientRect();
                const pillRect = pillEl.getBoundingClientRect();
                frames.push({
                  navTop: navRect.top,
                  navBottom: navRect.bottom,
                  pillTop: pillRect.top,
                  pillBottom: pillRect.bottom,
                  pillLeft: pillRect.left,
                  pillWidth: pillRect.width,
                  pillHeight: pillRect.height,
                });
              }

              if (performance.now() - start < 450) {
                requestAnimationFrame(tick);
              } else {
                resolve(frames);
              }
            };

            requestAnimationFrame(tick);
          }),
      );

      await nav.getByRole("link", { name: targetTabLabel }).click();
      await readyCheck();

      const frames = await framesPromise;
      expect(frames.length).toBeGreaterThanOrEqual(8);

      // Every single animation frame must keep the dark pill locked vertically inside BottomNav.
      for (const frame of frames) {
        expect(frame.pillTop).toBeGreaterThanOrEqual(frame.navTop);
        expect(frame.pillBottom).toBeLessThanOrEqual(frame.navBottom);
        expect(Math.abs(frame.pillTop - baseline.pillTop)).toBeLessThanOrEqual(1);
        expect(
          Math.abs(frame.pillBottom - baseline.pillBottom),
        ).toBeLessThanOrEqual(1);
        expect(Math.abs(frame.pillHeight - 44)).toBeLessThanOrEqual(1);
      }

      // Confirm scroll reset to top and pill settled aligned with the target active link.
      const scrollAfter = await page.evaluate(() => window.scrollY);
      expect(scrollAfter).toBe(0);

      const finalAlignment = await page.evaluate((tabLabel) => {
        const pillEl = document.querySelector(
          '[data-testid="bottom-nav-active-pill"]',
        );
        const linkEl = document.querySelector(
          `nav[aria-label="Navegação principal"] a[aria-label="${tabLabel}"]`,
        );
        const pillRect = pillEl!.getBoundingClientRect();
        const linkRect = linkEl!.getBoundingClientRect();
        return {
          leftDelta: Math.abs(pillRect.left - linkRect.left),
          widthDelta: Math.abs(pillRect.width - linkRect.width),
          topDelta: Math.abs(pillRect.top - linkRect.top),
          movedFromStart: pillRect.left,
        };
      }, targetTabLabel);

      expect(finalAlignment.leftDelta).toBeLessThanOrEqual(1.5);
      expect(finalAlignment.widthDelta).toBeLessThanOrEqual(1.5);
      expect(finalAlignment.topDelta).toBeLessThanOrEqual(1);
      expect(
        Math.abs(finalAlignment.movedFromStart - baseline.pillLeft),
      ).toBeGreaterThan(20);
    };

    // Switch across non-adjacent and adjacent tabs while scrolled down >= 500px.
    await sampleTabSwitchAnimation("Catálogo", async () => {
      await expect(page.getByRole("tab", { name: "Serviços" })).toBeVisible();
    });
    await sampleTabSwitchAnimation("Orçamentos", async () => {
      await expect(
        page.getByRole("button", { name: "Novo orçamento" }),
      ).toBeVisible();
    });

    // Check Textarea min/max bounds in Novo orçamento.
    await page.getByRole("button", { name: "Novo orçamento" }).click();
    const quoteNotes = page.getByLabel("Observações (opcional)");
    await expect(quoteNotes).toBeVisible();
    const quoteTextareaStyles = await quoteNotes.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        minHeight: style.minHeight,
        maxHeight: style.maxHeight,
        resize: style.resize,
        boxHeight: el.getBoundingClientRect().height,
      };
    });
    expect(quoteTextareaStyles.minHeight).toBe("96px");
    expect(quoteTextareaStyles.maxHeight).toBe("192px");
    expect(quoteTextareaStyles.resize).toBe("vertical");
    expect(quoteTextareaStyles.boxHeight).toBeGreaterThanOrEqual(96);

    await quoteNotes.fill(Array.from({ length: 14 }, (_, i) => `Linha ${i + 1}`).join("\n"));
    const expandedQuoteHeight = await quoteNotes.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    expect(expandedQuoteHeight).toBeLessThanOrEqual(192);
    await page.getByRole("button", { name: "Fechar painel" }).click();

    // Check Textarea min/max bounds in Novo lançamento (Receita & Despesa).
    await page.getByRole("link", { name: "Financeiro" }).click();
    await page.getByRole("button", { name: "Novo lançamento" }).click();

    const financeNotes = page.getByLabel("Observações (opcional)");
    const financeStyles = await financeNotes.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        minHeight: style.minHeight,
        maxHeight: style.maxHeight,
        resize: style.resize,
      };
    });
    expect(financeStyles.minHeight).toBe("96px");
    expect(financeStyles.maxHeight).toBe("192px");
    expect(financeStyles.resize).toBe("vertical");

    await page.getByRole("tab", { name: "Despesa" }).click();
    const expenseStyles = await financeNotes.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        minHeight: style.minHeight,
        maxHeight: style.maxHeight,
        resize: style.resize,
      };
    });
    expect(expenseStyles.minHeight).toBe("96px");
    expect(expenseStyles.maxHeight).toBe("192px");
    expect(expenseStyles.resize).toBe("vertical");

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("simplifies quote creation, opens full client picker without forcing keyboard, restores BottomSheet after virtual keyboard, and recalculates payments as items are added", async ({
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

    // 1. New quote sheet no longer asks for payment mode up front and accepts new client inline.
    await page.getByRole("button", { name: "Novo orçamento" }).click();
    await expect(page.getByText("Condições de pagamento")).toHaveCount(0);
    await expect(
      page.getByRole("group", { name: "Modalidade de pagamento" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Selecionar cliente cadastrado/ }),
    ).toBeVisible();

    await page.getByLabel("Nome do cliente").fill("Mariana Costa");
    await page.getByLabel("Telefone / WhatsApp (opcional)").fill("48991234567");
    await page
      .getByLabel("Endereço do serviço (opcional)")
      .fill("Rua das Flores, 88");

    await page.getByRole("button", { name: "Criar orçamento" }).click();
    await expect(
      page.getByText("Orçamento criado e cliente cadastrado."),
    ).toBeVisible();

    // 2. Empty quote guides the user to add items first and then configure payment.
    await expect(page.getByText("Pagamentos")).toBeVisible();
    await expect(
      page.getByText(
        "Adicione itens acima e depois toque em Configurar para definir entrada, parcelas e datas.",
      ),
    ).toBeVisible();

    // Add 1st item (R$ 1.000,00) -> auto-creates cash payment entry for R$ 1.000,00.
    await page.getByRole("button", { name: "Serviço", exact: true }).click();
    await page
      .getByLabel("Descrição do item")
      .fill("Limpeza completa de 2 aparelhos");
    await page.getByLabel("Preço unitário").fill("100000");
    await page.getByRole("button", { name: "Adicionar ao orçamento" }).click();
    await expect(page.getByText("Pagamento à vista")).toBeVisible();
    await expect(page.getByText("R$ 1.000,00").first()).toBeVisible();

    // Configure 50/50 split with dates in Pagamentos > Configurar.
    await page.getByRole("button", { name: "Configurar" }).click();
    await expect(
      page.getByRole("heading", { name: "Condições e parcelas" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Entrada \+ Saldo/ }).click();
    const splitDueInputs = page.getByLabel("Data de vencimento");
    await splitDueInputs.nth(0).fill("2026-11-25");
    await splitDueInputs.nth(1).fill("2026-12-10");
    await page.getByRole("button", { name: "Salvar condições" }).click();
    await expect(
      page.getByText("Condições de pagamento salvas."),
    ).toBeVisible();
    await expect(page.getByText("Entrada (50%)")).toBeVisible();
    await expect(page.getByText("Saldo (50%)")).toBeVisible();
    await expect(page.getByText("R$ 500,00").first()).toBeVisible();

    // Add 2nd item (R$ 200,00) -> pending 50/50 installments recalculate automatically to R$ 600,00 each!
    await page.getByRole("button", { name: "Material", exact: true }).click();
    await page.getByLabel("Descrição do item").fill("Carga de gás R410A");
    await page.getByLabel("Preço unitário").fill("20000");
    await page.getByRole("button", { name: "Adicionar ao orçamento" }).click();
    await expect(page.getByText("R$ 1.200,00").first()).toBeVisible();
    await expect(page.getByText("R$ 600,00").nth(1)).toBeVisible();
    await expect(page.getByText("Vence 25/11/2026")).toBeVisible();
    await expect(page.getByText("Vence 10/12/2026")).toBeVisible();

    // 3. Approve quote -> syncs both recalculated R$ 600,00 installments to Cashbook.
    await page.getByRole("button", { name: "Alterar status" }).click();
    await page.getByRole("button", { name: /Aprovado/ }).click();
    await expect(
      page.getByText("Orçamento aprovado. Parcelas sincronizadas no Livro-Caixa."),
    ).toBeVisible();

    // 4. Receive 1st installment directly on QuoteDetailPage -> check 1/2 pago & Pix on preview.
    await page
      .getByRole("button", { name: "Confirmar recebimento de Entrada (50%)" })
      .click();
    await expect(page.getByText("Parcela marcada como recebida.")).toBeVisible();
    await expect(page.getByText(/1\/2 pago/)).toBeVisible();

    await page.getByRole("button", { name: "Prévia do cliente" }).click();
    const previewDoc = page.locator("article");
    await expect(
      previewDoc.getByText("Entrada de 50% + Saldo de 50%"),
    ).toBeVisible();
    await expect(previewDoc.getByText(/Saldo \(50%\)/).first()).toBeVisible();
    await expect(previewDoc.getByText("FIXFLOW0008P2")).toBeVisible();
    await expect(
      page.getByText(/Pix para Saldo \(50%\): R\$\s*600,00/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Fechar painel" }).click();

    // 5. Open Novo orçamento -> open full-height ClientPickerView WITHOUT forcing keyboard open,
    // filter client, simulate virtual keyboard open + dismiss, and ensure BottomSheet sits cleanly at bottom.
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Orçamentos" })
      .click();
    await expect(page.getByText("1/2 pago")).toBeVisible();

    await page.getByRole("button", { name: "Novo orçamento" }).click();
    await page
      .getByRole("button", { name: /Selecionar cliente cadastrado/ })
      .click();

    await expect(
      page.getByRole("heading", { name: "Selecionar cliente" }),
    ).toBeVisible();
    const clientSearch = page.getByLabel("Buscar cliente cadastrado");
    await expect(clientSearch).toBeVisible();

    // Critical UX check: opening the client picker must NOT auto-focus search (no forced keyboard).
    const focusedTagOnOpen = await page.evaluate(
      () => document.activeElement?.tagName ?? null,
    );
    expect(focusedTagOnOpen).not.toBe("INPUT");

    const pickerOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(pickerOverflow).toBe(false);

    // Simulate mobile keyboard opening on search and closing when tapping the client row.
    await page.evaluate(() => {
      const state = { height: 812, offsetTop: 0, scale: 1 };
      const listeners: Array<() => void> = [];
      const mockVV = {
        get height() {
          return state.height;
        },
        get offsetTop() {
          return state.offsetTop;
        },
        get scale() {
          return state.scale;
        },
        addEventListener(type: string, cb: () => void) {
          if (type === "resize" || type === "scroll") {
            listeners.push(cb);
          }
        },
        removeEventListener(_type: string, cb: () => void) {
          const idx = listeners.indexOf(cb);
          if (idx >= 0) {
            listeners.splice(idx, 1);
          }
        },
      };
      (
        window as unknown as {
          __setMockVisualViewportHeight?: (nextHeight: number) => void;
        }
      ).__setMockVisualViewportHeight = (nextHeight: number) => {
        state.height = nextHeight;
        listeners.forEach((fn) => fn());
      };
      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        value: mockVV,
      });
    });

    // Re-open picker briefly so its BottomSheet listeners attach to mock visualViewport.
    await page.getByRole("button", { name: "Fechar painel" }).click();
    await page.getByRole("button", { name: "Novo orçamento" }).click();
    await page
      .getByRole("button", { name: /Selecionar cliente cadastrado/ })
      .click();

    await clientSearch.fill("Mariana");
    await page.evaluate(() => {
      (
        window as unknown as {
          __setMockVisualViewportHeight?: (nextHeight: number) => void;
        }
      ).__setMockVisualViewportHeight?.(460);
    });

    const drawerDuringKeyboard = await page
      .locator("[data-vaul-drawer]")
      .evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          bottomCss: style.bottom,
          rectBottom: rect.bottom,
          rectHeight: rect.height,
        };
      });
    expect(drawerDuringKeyboard.bottomCss).toBe("352px");
    expect(drawerDuringKeyboard.rectHeight).toBeLessThanOrEqual(460);

    // Select Mariana Costa and restore visualViewport (keyboard closed).
    await page
      .getByRole("list", { name: "Lista de clientes cadastrados" })
      .getByRole("button", { name: /Mariana Costa/ })
      .click();

    await page.evaluate(() => {
      (
        window as unknown as {
          __setMockVisualViewportHeight?: (nextHeight: number) => void;
        }
      ).__setMockVisualViewportHeight?.(812);
    });

    const drawerAfterKeyboardClose = await page
      .locator("[data-vaul-drawer]")
      .evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          bottomCss: style.bottom,
          rectBottom: rect.bottom,
          rectHeight: rect.height,
        };
      });
    expect(drawerAfterKeyboardClose.bottomCss).toBe("0px");
    expect(drawerAfterKeyboardClose.rectBottom).toBe(812);
    expect(drawerAfterKeyboardClose.rectHeight).toBeGreaterThanOrEqual(700);

    const lockedName = page.getByLabel("Nome do cliente");
    const lockedPhone = page.getByLabel("Telefone / WhatsApp (opcional)");
    await expect(lockedName).toHaveAttribute("readonly", "");
    await expect(lockedPhone).toHaveAttribute("readonly", "");
    await expect(lockedName).toHaveValue("Mariana Costa");
    await expect(lockedPhone).toHaveValue("(48) 99123-4567");
    await expect(
      page.getByText(
        "Cliente cadastrado. Edite nome e telefone em Catálogo > Clientes.",
      ),
    ).toBeVisible();

    // Tapping Trocar returns to the full client picker with keyboard closed, and Back returns cleanly.
    await page
      .getByRole("button", { name: "Trocar cliente selecionado" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Selecionar cliente" }),
    ).toBeVisible();
    await expect(page.getByText("Atual")).toBeVisible();
    await page
      .getByRole("button", { name: "Voltar para dados do orçamento" })
      .click();

    await page.getByRole("button", { name: "Criar orçamento" }).click();
    await expect(page.getByText("Orçamento criado.")).toBeVisible();

    await page.getByRole("button", { name: "Serviço", exact: true }).click();
    await page.getByLabel("Descrição do item").fill("Manutenção preventiva");
    await page.getByLabel("Preço unitário").fill("30000");
    await page.getByRole("button", { name: "Adicionar ao orçamento" }).click();
    await expect(page.getByText("Pagamento à vista")).toBeVisible();

    // Open Configurar (QuotePaymentsSheet), switch to Parcelado 3x, edit Parcela 2 due date, and save.
    await page.getByRole("button", { name: "Configurar" }).click();
    await expect(
      page.getByRole("heading", { name: "Condições e parcelas" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Parcelado/ }).click();
    await page.getByLabel("Quantidade de parcelas").selectOption("3");
    const dueInputs = page.getByLabel("Data de vencimento");
    await dueInputs.nth(1).fill("2027-01-15");
    await page.getByRole("button", { name: "Salvar condições" }).click();
    await expect(
      page.getByText("Condições de pagamento salvas."),
    ).toBeVisible();
    await expect(page.getByText("Parcelado em 3x").first()).toBeVisible();
    await expect(page.getByText("Parcela 1/3")).toBeVisible();
    await expect(page.getByText("Vence 15/01/2027")).toBeVisible();

    // Check zero overflow on QuoteDetailPage at 375px.
    const detailOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(detailOverflow).toBe(false);

    // 6. Verify Catálogo > Clientes sub-tab fits 375px without horizontal overflow and edits client there.
    await page.getByRole("link", { name: "Catálogo" }).click();
    const clientsTab = page.getByRole("tab", { name: "Clientes" });
    await expect(clientsTab).toBeVisible();

    const catalogOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(catalogOverflow).toBe(false);

    await clientsTab.click();
    await expect(page.getByText("Mariana Costa")).toBeVisible();
    const clientRow = page.locator("li").filter({ hasText: "Mariana Costa" });
    await clientRow.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Nome do cliente").fill("Mariana Costa Silva");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Mariana Costa Silva")).toBeVisible();

    // 7. Verify remaining 2nd installment in Financeiro (December) shows recalculated R$ 600,00 and marks quote Pago.
    await page.getByRole("link", { name: "Financeiro" }).click();
    const currentHeading = await page.locator("h2").first().textContent();
    if (!currentHeading?.includes("Dezembro")) {
      await page.getByRole("button", { name: "Próximo mês" }).click();
    }
    const saldoRow = page
      .locator("li")
      .filter({ hasText: "Mariana Costa (Saldo (50%))" });
    await expect(saldoRow).toBeVisible();
    await expect(saldoRow.getByText("R$ 600,00")).toBeVisible();
    await saldoRow.getByRole("button", { name: /Confirmar recebimento/ }).click();
    await expect(page.getByText("Parcela marcada como recebida.")).toBeVisible();

    await saldoRow.getByRole("link", { name: /Abrir orçamento/ }).click();
    await expect(page.getByText("Pago", { exact: true }).first()).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
