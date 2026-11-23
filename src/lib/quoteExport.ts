import { calculateA4SinglePageLayout } from "@/lib/quoteExportUtils";

export type QuoteExportFormat = "pdf" | "png";
export type ExportDeliveryOutcome = "shared" | "downloaded" | "cancelled";

export interface QuoteShareMeta {
  title: string;
  text?: string;
}

function getExportPixelRatio(): number {
  const deviceRatio =
    typeof window !== "undefined" && Number.isFinite(window.devicePixelRatio)
      ? window.devicePixelRatio
      : 2;

  return Math.min(3, Math.max(2, deviceRatio || 2));
}

function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Não foi possível gerar a imagem do orçamento."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException || error instanceof Error) &&
    error.name === "AbortError"
  );
}

function triggerFileDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();
    // Delay revocation briefly so mobile Safari does not abort the download stream.
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);
  }
}

export async function renderQuoteCanvas(
  element: HTMLElement,
): Promise<HTMLCanvasElement> {
  if (element.offsetWidth <= 0 || element.offsetHeight <= 0) {
    throw new Error("A prévia do orçamento não está visível para exportação.");
  }

  const { toCanvas } = await import("html-to-image");
  const canvas = await toCanvas(element, {
    backgroundColor: "#ffffff",
    pixelRatio: getExportPixelRatio(),
    // Native system font stack avoids external @font-face cross-origin failures on iOS.
    skipFonts: true,
    cacheBust: false,
  });

  if (canvas.width <= 0 || canvas.height <= 0) {
    releaseCanvas(canvas);
    throw new Error("Não foi possível capturar o conteúdo do orçamento.");
  }

  return canvas;
}

export async function exportQuoteElementAsPngBlob(
  element: HTMLElement,
): Promise<Blob> {
  const canvas = await renderQuoteCanvas(element);
  try {
    return await canvasToPngBlob(canvas);
  } finally {
    releaseCanvas(canvas);
  }
}

export async function exportQuoteElementAsPdfBlob(
  element: HTMLElement,
): Promise<Blob> {
  const canvas = await renderQuoteCanvas(element);

  try {
    const layout = calculateA4SinglePageLayout(canvas.width, canvas.height);
    if (!layout) {
      throw new Error("Não foi possível ajustar o orçamento na página A4.");
    }

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const imageDataUrl = canvas.toDataURL("image/png");
    pdf.addImage(
      imageDataUrl,
      "PNG",
      layout.offsetXMm,
      layout.offsetYMm,
      layout.renderWidthMm,
      layout.renderHeightMm,
      undefined,
      "FAST",
    );

    return pdf.output("blob");
  } finally {
    releaseCanvas(canvas);
  }
}

export async function deliverQuoteExportFile(
  blob: Blob,
  filename: string,
  shareMeta: QuoteShareMeta,
): Promise<ExportDeliveryOutcome> {
  const mimeType =
    blob.type || (filename.endsWith(".pdf") ? "application/pdf" : "image/png");

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    typeof File === "function"
  ) {
    const file = new File([blob], filename, { type: mimeType });

    let canShareFiles = false;
    try {
      canShareFiles = navigator.canShare({ files: [file] });
    } catch {
      canShareFiles = false;
    }

    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: shareMeta.title,
          text: shareMeta.text,
        });
        return "shared";
      } catch (error) {
        if (isAbortError(error)) {
          return "cancelled";
        }
        // Fall back to direct download if browser blocks file sharing at runtime.
      }
    }
  }

  triggerFileDownload(blob, filename);
  return "downloaded";
}
