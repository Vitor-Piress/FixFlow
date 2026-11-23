export const MAX_PHONE_DIGITS = 11;
export const PHONE_INPUT_MAX_LENGTH = 15;
export const MAX_CPF_DIGITS = 11;
export const MAX_CNPJ_DIGITS = 14;
export const DOCUMENT_INPUT_MAX_LENGTH = 18;

export function extractDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizePhoneDigitsBR(raw: string): string {
  let digits = extractDigits(raw);
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  return digits.slice(0, MAX_PHONE_DIGITS);
}

/**
 * Progressively formats a Brazilian phone number up to 11 digits:
 * `(00) 0000-0000` (10 digits) or `(00) 00000-0000` (11 digits).
 */
export function maskPhoneBR(raw: string): string {
  const digits = normalizePhoneDigitsBR(raw);
  if (digits.length === 0) {
    return "";
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Progressively formats a Brazilian CPF (up to 11 digits) or CNPJ (12 to 14 digits).
 */
export function maskDocumentBR(raw: string): string {
  const digits = extractDigits(raw).slice(0, MAX_CNPJ_DIGITS);
  if (digits.length === 0) {
    return "";
  }

  if (digits.length <= MAX_CPF_DIGITS) {
    if (digits.length <= 3) {
      return digits;
    }

    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function isValidPhoneBR(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") {
    return true;
  }

  let digits = extractDigits(trimmed);
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  return digits.length === 10 || digits.length === 11;
}

export function isValidDocumentBR(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") {
    return true;
  }

  const digits = extractDigits(trimmed);
  return digits.length === MAX_CPF_DIGITS || digits.length === MAX_CNPJ_DIGITS;
}
