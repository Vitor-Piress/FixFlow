const brlCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const brlDecimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats an integer amount in cents to Brazilian Real (e.g. `25000` -> `"R$ 250,00"`).
 */
export function formatCentsToBRL(
  cents: number,
  options?: { showSymbol?: boolean },
): string {
  const safeCents = Number.isFinite(cents) ? Math.round(cents) : 0;
  const amount = safeCents / 100;

  if (options?.showSymbol === false) {
    return brlDecimalFormatter.format(amount);
  }

  return brlCurrencyFormatter.format(amount);
}

/**
 * Formats integer cents for masked numeric currency inputs without the `R$` prefix.
 */
export function formatCurrencyInputFromCents(cents: number): string {
  const safeCents = Number.isFinite(cents)
    ? Math.max(0, Math.round(cents))
    : 0;
  return brlDecimalFormatter.format(safeCents / 100);
}

/**
 * Converts a string of digits (ATM-style input) into non-negative integer cents.
 */
export function digitsToCents(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return 0;
  }

  const parsed = Number.parseInt(digits, 10);
  if (!Number.isSafeInteger(parsed)) {
    return 0;
  }

  return parsed;
}

/**
 * Parses a human-entered currency string (pt-BR or decimal) into integer cents.
 */
export function parseCurrencyToCents(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 0;
  }

  const isNegative = trimmed.startsWith("-");
  const cleaned = trimmed.replace(/[^\d.,]/g, "");
  if (!cleaned) {
    return 0;
  }

  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    const dotParts = cleaned.split(".");
    if (dotParts.length > 2 || (dotParts.length === 2 && dotParts[1].length === 3)) {
      normalized = cleaned.replace(/\./g, "");
    }
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const cents = Math.round(parsed * 100);
  return isNegative ? -cents : cents;
}

/**
 * Calculates quote item subtotal in integer cents, matching the PostgreSQL trigger rounding.
 */
export function calculateItemSubtotalCents(
  quantity: number,
  unitPriceCents: number,
): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPriceCents)) {
    return 0;
  }

  return Math.round(quantity * unitPriceCents);
}
