import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function stripNonDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Formats a Brazilian phone number for display (`(DD) 99999-9999` or `(DD) 9999-9999`).
 */
export function formatPhoneBR(phone: string | null | undefined): string {
  if (!phone) {
    return "";
  }

  let digits = stripNonDigits(phone);
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone.trim();
}

/**
 * Builds a `https://wa.me/...` link from a Brazilian phone number and optional pre-filled text.
 */
export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message?: string,
): string | null {
  if (!phone) {
    return null;
  }

  let digits = stripNonDigits(phone);
  if (digits.length < 10) {
    return null;
  }

  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }

  const baseUrl = `https://wa.me/${digits}`;
  if (!message?.trim()) {
    return baseUrl;
  }

  return `${baseUrl}?text=${encodeURIComponent(message.trim())}`;
}

/**
 * Formats a CPF (11 digits) or CNPJ (14 digits) for display.
 */
export function formatDocumentBR(document: string | null | undefined): string {
  if (!document) {
    return "";
  }

  const digits = stripNonDigits(document);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  return document.trim();
}

/**
 * Normalizes optional text fields to `null` when empty/whitespace-only before persistence.
 */
export function emptyStringToNull(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
