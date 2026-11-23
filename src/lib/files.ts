export const MAX_CONTRACT_PDF_BYTES = 10 * 1024 * 1024;
export const CONTRACT_PDF_MIME_TYPE = "application/pdf";

export interface FileMetadataLike {
  name: string;
  size: number;
  type: string;
}

const kbSizeFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const mbSizeFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

/**
 * Validates that a selected file is a non-empty PDF within the 10 MB bucket limit.
 * Mobile file pickers sometimes leave `file.type` empty, so `.pdf` extension acts as fallback only then.
 */
export function validateContractPdfFile(file: FileMetadataLike): string | null {
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "O arquivo selecionado está vazio.";
  }

  if (file.size > MAX_CONTRACT_PDF_BYTES) {
    return "O PDF excede o limite máximo de 10 MB.";
  }

  const normalizedType = file.type.trim().toLowerCase();
  const hasPdfExtension = file.name.trim().toLowerCase().endsWith(".pdf");

  if (normalizedType !== "") {
    if (normalizedType !== CONTRACT_PDF_MIME_TYPE) {
      return "Envie apenas arquivos em formato PDF.";
    }
    return null;
  }

  if (!hasPdfExtension) {
    return "Envie apenas arquivos em formato PDF (.pdf).";
  }

  return null;
}

/**
 * Sanitizes contract ID and file name to prevent path traversal and invalid Storage keys.
 */
export function buildContractPdfStoragePath(
  contractId: string,
  originalFileName: string,
  timestamp: number = Date.now(),
): string {
  const safeContractId =
    contractId.replace(/[^a-zA-Z0-9_-]/g, "") || "contract";

  const baseName = originalFileName.split(/[\\/]/).pop() ?? "";
  const withoutExtension = baseName.replace(/\.pdf$/i, "");
  const asciiSlug = withoutExtension
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const safeTimestamp =
    Number.isFinite(timestamp) && timestamp > 0
      ? Math.trunc(timestamp)
      : Date.now();

  return `contracts/${safeContractId}/${safeTimestamp}-${asciiSlug || "contrato"}.pdf`;
}

/**
 * Extracts a readable PDF file name from a Storage object path.
 */
export function extractPdfFileName(
  pdfPath: string | null | undefined,
): string {
  if (!pdfPath) {
    return "";
  }

  const trimmed = pdfPath.trim();
  if (!trimmed) {
    return "";
  }

  const lastSegment = trimmed.split("/").pop() ?? "";
  if (!lastSegment) {
    return "";
  }

  const withoutPrefix = lastSegment.replace(/^\d{10,}-(.+)$/, "$1");
  return withoutPrefix || lastSegment;
}

/**
 * Formats a byte length in Brazilian Portuguese units (`B`, `KB`, `MB`).
 */
export function formatFileSizeBR(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${kbSizeFormatter.format(bytes / 1024)} KB`;
  }

  return `${mbSizeFormatter.format(bytes / (1024 * 1024))} MB`;
}
