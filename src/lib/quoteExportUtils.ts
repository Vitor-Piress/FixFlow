export const A4_PAGE_WIDTH_MM = 210;
export const A4_PAGE_HEIGHT_MM = 297;
export const DEFAULT_PDF_MARGIN_MM = 10;

export interface PdfPageSlice {
  sourceY: number;
  sourceHeight: number;
  renderWidthMm: number;
  renderHeightMm: number;
}

export interface PdfSinglePageLayout {
  offsetXMm: number;
  offsetYMm: number;
  renderWidthMm: number;
  renderHeightMm: number;
}

export interface PdfPaginationOptions {
  pageWidthMm?: number;
  pageHeightMm?: number;
  marginMm?: number;
}

/**
 * Normalizes a client name into a safe lowercase ASCII filename slug.
 */
export function sanitizeQuoteExportSlug(raw: string): string {
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    return "cliente";
  }

  const truncated = normalized.slice(0, 32).replace(/-+$/g, "");
  return truncated || "cliente";
}

export function buildQuoteExportFilename(
  quoteNumber: number,
  clientName: string,
  extension: "pdf" | "png",
): string {
  const safeNumber =
    Number.isFinite(quoteNumber) && quoteNumber > 0
      ? Math.trunc(quoteNumber)
      : 0;
  const paddedNumber = String(safeNumber).padStart(3, "0");
  const slug = sanitizeQuoteExportSlug(clientName);
  return `orcamento-${paddedNumber}-${slug}.${extension}`;
}

/**
 * Splits a tall captured canvas into non-overlapping A4 vertical slices
 * matching the printable width and height inside the page margins.
 */
export function calculateA4PdfPageSlices(
  canvasWidthPx: number,
  canvasHeightPx: number,
  options?: PdfPaginationOptions,
): PdfPageSlice[] {
  const pageWidthMm = options?.pageWidthMm ?? A4_PAGE_WIDTH_MM;
  const pageHeightMm = options?.pageHeightMm ?? A4_PAGE_HEIGHT_MM;
  const marginMm = options?.marginMm ?? DEFAULT_PDF_MARGIN_MM;

  if (
    !Number.isFinite(canvasWidthPx) ||
    !Number.isFinite(canvasHeightPx) ||
    canvasWidthPx <= 0 ||
    canvasHeightPx <= 0 ||
    !Number.isFinite(pageWidthMm) ||
    !Number.isFinite(pageHeightMm) ||
    !Number.isFinite(marginMm) ||
    marginMm < 0
  ) {
    return [];
  }

  const usableWidthMm = pageWidthMm - marginMm * 2;
  const usableHeightMm = pageHeightMm - marginMm * 2;
  if (usableWidthMm <= 0 || usableHeightMm <= 0) {
    return [];
  }

  const maxSliceHeightPx = Math.max(
    1,
    Math.floor(canvasWidthPx * (usableHeightMm / usableWidthMm)),
  );

  const slices: PdfPageSlice[] = [];
  let sourceY = 0;

  while (sourceY < canvasHeightPx) {
    const remainingPx = canvasHeightPx - sourceY;
    const sourceHeight = Math.min(maxSliceHeightPx, remainingPx);
    const renderHeightMm = (sourceHeight / canvasWidthPx) * usableWidthMm;

    slices.push({
      sourceY,
      sourceHeight,
      renderWidthMm: usableWidthMm,
      renderHeightMm,
    });

    sourceY += sourceHeight;
  }

  return slices;
}

/**
 * Scales the captured quote canvas proportionally so the entire document
 * always fits cleanly on a single A4 page inside margins, centered horizontally.
 */
export function calculateA4SinglePageLayout(
  canvasWidthPx: number,
  canvasHeightPx: number,
  options?: PdfPaginationOptions,
): PdfSinglePageLayout | null {
  const pageWidthMm = options?.pageWidthMm ?? A4_PAGE_WIDTH_MM;
  const pageHeightMm = options?.pageHeightMm ?? A4_PAGE_HEIGHT_MM;
  const marginMm = options?.marginMm ?? DEFAULT_PDF_MARGIN_MM;

  if (
    !Number.isFinite(canvasWidthPx) ||
    !Number.isFinite(canvasHeightPx) ||
    canvasWidthPx <= 0 ||
    canvasHeightPx <= 0 ||
    !Number.isFinite(pageWidthMm) ||
    !Number.isFinite(pageHeightMm) ||
    !Number.isFinite(marginMm) ||
    marginMm < 0
  ) {
    return null;
  }

  const usableWidthMm = pageWidthMm - marginMm * 2;
  const usableHeightMm = pageHeightMm - marginMm * 2;
  if (usableWidthMm <= 0 || usableHeightMm <= 0) {
    return null;
  }

  const scale = Math.min(
    usableWidthMm / canvasWidthPx,
    usableHeightMm / canvasHeightPx,
  );
  const renderWidthMm = canvasWidthPx * scale;
  const renderHeightMm = canvasHeightPx * scale;
  const offsetXMm = marginMm + (usableWidthMm - renderWidthMm) / 2;
  const offsetYMm = marginMm;

  return {
    offsetXMm,
    offsetYMm,
    renderWidthMm,
    renderHeightMm,
  };
}
