import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  A4_PAGE_HEIGHT_MM,
  A4_PAGE_WIDTH_MM,
  buildQuoteExportFilename,
  calculateA4PdfPageSlices,
  DEFAULT_PDF_MARGIN_MM,
  sanitizeQuoteExportSlug,
} from "../../src/lib/quoteExportUtils.ts";

describe("quoteExportUtils", () => {
  it("exposes A4 dimensions and default margin", () => {
    assert.equal(A4_PAGE_WIDTH_MM, 210);
    assert.equal(A4_PAGE_HEIGHT_MM, 297);
    assert.equal(DEFAULT_PDF_MARGIN_MM, 10);
  });

  it("sanitizes accented, empty, and long slugs", () => {
    assert.equal(
      sanitizeQuoteExportSlug("Condomínio Sol & Mar Ltda!"),
      "condominio-sol-mar-ltda",
    );
    assert.equal(sanitizeQuoteExportSlug("   ---   "), "cliente");
    assert.equal(sanitizeQuoteExportSlug(""), "cliente");
    assert.equal(
      sanitizeQuoteExportSlug(
        "João Ávila Construtora e Engenharia de Climatização Predial",
      ),
      "joao-avila-construtora-e-engenha",
    );
  });

  it("builds padded PDF and PNG export filenames", () => {
    assert.equal(
      buildQuoteExportFilename(7, "Condomínio Sol", "pdf"),
      "orcamento-007-condominio-sol.pdf",
    );
    assert.equal(
      buildQuoteExportFilename(1234, "Ação & Reforma", "png"),
      "orcamento-1234-acao-reforma.png",
    );
    assert.equal(
      buildQuoteExportFilename(-5, "", "pdf"),
      "orcamento-000-cliente.pdf",
    );
  });

  it("paginates single-page and multi-page A4 canvases without overflow or pixel loss", () => {
    const single = calculateA4PdfPageSlices(800, 1000);
    assert.equal(single.length, 1);
    assert.equal(single[0].sourceY, 0);
    assert.equal(single[0].sourceHeight, 1000);
    assert.equal(single[0].renderWidthMm, 190);

    const multi = calculateA4PdfPageSlices(900, 3200);
    assert.ok(multi.length >= 3);
    let covered = 0;
    for (const slice of multi) {
      assert.equal(slice.sourceY, covered);
      assert.equal(slice.renderWidthMm, 190);
      assert.ok(slice.renderHeightMm > 0 && slice.renderHeightMm <= 277);
      covered += slice.sourceHeight;
    }
    assert.equal(covered, 3200);
  });

  it("returns empty slices for invalid canvas or margin inputs", () => {
    assert.deepEqual(calculateA4PdfPageSlices(0, 500), []);
    assert.deepEqual(calculateA4PdfPageSlices(500, 0), []);
    assert.deepEqual(calculateA4PdfPageSlices(-10, 500), []);
    assert.deepEqual(calculateA4PdfPageSlices(Number.NaN, 500), []);
    assert.deepEqual(calculateA4PdfPageSlices(800, 800, { marginMm: 120 }), []);
  });
});
