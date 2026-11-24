import type { QuotePaymentLike } from "./quotePayments.ts";

export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "evp";

export interface SanitizedPixKey {
  key: string;
  type: PixKeyType;
}

export interface StaticPixInput {
  pixKey: string | null | undefined;
  merchantName: string | null | undefined;
  merchantBusinessName?: string | null | undefined;
  merchantCity: string | null | undefined;
  totalCents: number;
  txid?: string | null;
  quoteNumber?: number | null;
}

export interface QuoteStaticPixTargetPayment {
  installment_number: number;
  label: string;
  amount_cents: number;
  due_date: string | null;
}

export interface StaticPixPayload {
  payload: string;
  pixKey: string;
  pixKeyType: PixKeyType;
  merchantName: string;
  merchantCity: string;
  amount: string;
  txid: string;
  targetPayment?: QuoteStaticPixTargetPayment | null;
}

export interface QuoteStaticPixQuoteInput {
  quote_number: number;
  total_cents: number;
  payments?: readonly QuotePaymentLike[];
}

export interface QuoteStaticPixProfileInput {
  pix_key?: string | null;
  owner_name?: string | null;
  business_name?: string | null;
  city_state?: string | null;
}

const textEncoder = new TextEncoder();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPEATED_DIGITS_REGEX = /^(\d)\1+$/;
const NUMERIC_KEY_ALLOWED_CHARS_REGEX = /^[\d\s()+.\-/]+$/;
const VALID_DDD_PREFIX_REGEX = /^[1-9]\d/;

function isValidCpfDigits(digits: string): boolean {
  if (!/^\d{11}$/.test(digits) || REPEATED_DIGITS_REGEX.test(digits)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }
  if (remainder !== Number(digits[9])) {
    return false;
  }

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }

  return remainder === Number(digits[10]);
}

function isValidCnpjDigits(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || REPEATED_DIGITS_REGEX.test(digits)) {
    return false;
  }

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number(digits[index]) * firstWeights[index];
  }
  let remainder = sum % 11;
  const firstCheck = remainder < 2 ? 0 : 11 - remainder;
  if (firstCheck !== Number(digits[12])) {
    return false;
  }

  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let index = 0; index < 13; index += 1) {
    sum += Number(digits[index]) * secondWeights[index];
  }
  remainder = sum % 11;
  const secondCheck = remainder < 2 ? 0 : 11 - remainder;

  return secondCheck === Number(digits[13]);
}

function isValidBrazilianNationalPhone(nationalDigits: string): boolean {
  if (
    (nationalDigits.length !== 10 && nationalDigits.length !== 11) ||
    REPEATED_DIGITS_REGEX.test(nationalDigits) ||
    !VALID_DDD_PREFIX_REGEX.test(nationalDigits)
  ) {
    return false;
  }

  if (nationalDigits.length === 11 && nationalDigits[2] !== "9") {
    return false;
  }

  return true;
}

/**
 * Sanitizes and validates a Pix key into one of the five BACEN key formats.
 * Returns `null` for empty, malformed, or ambiguous invalid inputs.
 */
export function sanitizeAndValidatePixKey(
  rawKey: string | null | undefined,
): SanitizedPixKey | null {
  if (typeof rawKey !== "string") {
    return null;
  }

  const trimmed = rawKey.trim();
  if (trimmed === "") {
    return null;
  }

  if (trimmed.includes("@")) {
    if (
      EMAIL_REGEX.test(trimmed) &&
      textEncoder.encode(trimmed).length <= 77
    ) {
      return { key: trimmed, type: "email" };
    }
    return null;
  }

  if (UUID_REGEX.test(trimmed)) {
    return { key: trimmed, type: "evp" };
  }

  if (!NUMERIC_KEY_ALLOWED_CHARS_REGEX.test(trimmed)) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.includes("+")) {
    if (
      !trimmed.startsWith("+") ||
      !digits.startsWith("55") ||
      (digits.length !== 12 && digits.length !== 13)
    ) {
      return null;
    }

    const nationalDigits = digits.slice(2);
    if (!isValidBrazilianNationalPhone(nationalDigits)) {
      return null;
    }

    return { key: `+55${nationalDigits}`, type: "phone" };
  }

  if (digits.length === 14) {
    return isValidCnpjDigits(digits) ? { key: digits, type: "cnpj" } : null;
  }

  const hasPhoneHint = /[()\s]/.test(trimmed);
  const hasBrazilianCountryPrefix =
    (digits.length === 12 || digits.length === 13) && digits.startsWith("55");

  if (hasPhoneHint || digits.length === 10 || hasBrazilianCountryPrefix) {
    const nationalDigits = hasBrazilianCountryPrefix ? digits.slice(2) : digits;
    if (!isValidBrazilianNationalPhone(nationalDigits)) {
      return null;
    }

    return { key: `+55${nationalDigits}`, type: "phone" };
  }

  if (digits.length === 11) {
    if (isValidCpfDigits(digits)) {
      return { key: digits, type: "cpf" };
    }

    if (!trimmed.includes(".") && isValidBrazilianNationalPhone(digits)) {
      return { key: `+55${digits}`, type: "phone" };
    }

    return null;
  }

  return null;
}

/**
 * Normalizes text to uppercase ASCII alphanumeric + single spaces, capped at `maxLength`.
 */
export function normalizePixAsciiText(
  value: string,
  maxLength: number,
): string {
  if (maxLength <= 0) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, maxLength)
    .trim();
}

export function formatPixMerchantName(
  ownerName: string | null | undefined,
  businessName?: string | null | undefined,
): string {
  const normalizedOwner = ownerName
    ? normalizePixAsciiText(ownerName, 25)
    : "";
  if (normalizedOwner) {
    return normalizedOwner;
  }

  const normalizedBusiness = businessName
    ? normalizePixAsciiText(businessName, 25)
    : "";
  if (normalizedBusiness) {
    return normalizedBusiness;
  }

  return "FIXFLOW";
}

export function extractPixCity(cityState: string | null | undefined): string {
  if (!cityState) {
    return "BRASIL";
  }

  const separatorIndex = cityState.search(/[-/]/);
  const cityPart =
    separatorIndex >= 0 ? cityState.slice(0, separatorIndex) : cityState;
  const normalized = normalizePixAsciiText(cityPart, 15);

  return normalized || "BRASIL";
}

function sanitizePixTxid(rawTxid: string | null | undefined): string {
  if (!rawTxid) {
    return "***";
  }

  const trimmed = rawTxid.trim();
  if (trimmed === "" || trimmed === "***") {
    return "***";
  }

  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 25);

  return normalized || "***";
}

export function buildQuotePixTxid(quoteNumber: number): string {
  if (!Number.isFinite(quoteNumber) || quoteNumber <= 0) {
    return "***";
  }

  const raw = `FIXFLOW${String(Math.trunc(quoteNumber)).padStart(4, "0")}`;
  return sanitizePixTxid(raw);
}

export function buildQuotePaymentPixTxid(
  quoteNumber: number,
  installmentNumber: number,
): string {
  if (
    !Number.isFinite(quoteNumber) ||
    quoteNumber <= 0 ||
    !Number.isFinite(installmentNumber) ||
    installmentNumber <= 0
  ) {
    return buildQuotePixTxid(quoteNumber);
  }

  const raw = `FIXFLOW${String(Math.trunc(quoteNumber)).padStart(4, "0")}P${Math.trunc(installmentNumber)}`;
  return sanitizePixTxid(raw);
}

/**
 * Formats positive integer cents as a fixed 2-decimal string without floating-point math.
 */
export function formatPixAmountFromCents(totalCents: number): string | null {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    return null;
  }

  const whole = Math.floor(totalCents / 100);
  const cents = String(totalCents % 100).padStart(2, "0");

  return `${whole}.${cents}`;
}

export function formatEmvTlv(id: string, value: string): string {
  if (!/^\d{2}$/.test(id)) {
    throw new RangeError(`EMV tag id must be 2 digits, received "${id}".`);
  }

  const byteLength = textEncoder.encode(value).length;
  if (byteLength < 1 || byteLength > 99) {
    throw new RangeError(
      `EMV tag "${id}" byte length must be between 1 and 99, received ${byteLength}.`,
    );
  }

  return `${id}${String(byteLength).padStart(2, "0")}${value}`;
}

/**
 * Computes CRC16-CCITT (polynomial 0x1021, initial value 0xFFFF, no final XOR)
 * over the UTF-8 representation of `payload`.
 */
export function computeCrc16Ccitt(payload: string): string {
  const bytes = textEncoder.encode(payload);
  let crc = 0xffff;

  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function generateStaticPix(
  input: StaticPixInput,
): StaticPixPayload | null {
  const sanitized = sanitizeAndValidatePixKey(input.pixKey);
  const amount = formatPixAmountFromCents(input.totalCents);
  if (!sanitized || !amount) {
    return null;
  }

  const merchantName = formatPixMerchantName(
    input.merchantName,
    input.merchantBusinessName,
  );
  const merchantCity = extractPixCity(input.merchantCity);
  const txid =
    input.txid !== undefined &&
    input.txid !== null &&
    input.txid.trim() !== ""
      ? sanitizePixTxid(input.txid)
      : input.quoteNumber !== undefined && input.quoteNumber !== null
        ? buildQuotePixTxid(input.quoteNumber)
        : "***";

  const merchantAccountInfo =
    formatEmvTlv("00", "br.gov.bcb.pix") + formatEmvTlv("01", sanitized.key);
  const additionalDataField = formatEmvTlv("05", txid);

  const payloadWithoutCrc =
    [
      formatEmvTlv("00", "01"),
      formatEmvTlv("26", merchantAccountInfo),
      formatEmvTlv("52", "0000"),
      formatEmvTlv("53", "986"),
      formatEmvTlv("54", amount),
      formatEmvTlv("58", "BR"),
      formatEmvTlv("59", merchantName),
      formatEmvTlv("60", merchantCity),
      formatEmvTlv("62", additionalDataField),
    ].join("") + "6304";

  const crc = computeCrc16Ccitt(payloadWithoutCrc);

  return {
    payload: `${payloadWithoutCrc}${crc}`,
    pixKey: sanitized.key,
    pixKeyType: sanitized.type,
    merchantName,
    merchantCity,
    amount,
    txid,
  };
}

export function generateQuoteStaticPix(
  quote: QuoteStaticPixQuoteInput | null | undefined,
  profile: QuoteStaticPixProfileInput | null | undefined,
): StaticPixPayload | null {
  if (!quote || !profile) {
    return null;
  }

  const payments = quote.payments
    ? [...quote.payments].sort(
        (a, b) => a.installment_number - b.installment_number,
      )
    : [];

  let targetCents = quote.total_cents;
  let txid = buildQuotePixTxid(quote.quote_number);
  let targetPayment: QuoteStaticPixTargetPayment | null = null;

  if (payments.length > 1) {
    const nextUnpaid = payments.find(
      (item) => item.status === "pending" && item.amount_cents > 0,
    );
    if (nextUnpaid) {
      targetCents = nextUnpaid.amount_cents;
      txid = buildQuotePaymentPixTxid(
        quote.quote_number,
        nextUnpaid.installment_number,
      );
      targetPayment = {
        installment_number: nextUnpaid.installment_number,
        label: nextUnpaid.label,
        amount_cents: nextUnpaid.amount_cents,
        due_date: nextUnpaid.due_date ?? null,
      };
    }
  }

  const generated = generateStaticPix({
    pixKey: profile.pix_key,
    merchantName: profile.owner_name,
    merchantBusinessName: profile.business_name,
    merchantCity: profile.city_state,
    totalCents: targetCents,
    txid,
  });

  if (!generated) {
    return null;
  }

  return {
    ...generated,
    targetPayment,
  };
}
