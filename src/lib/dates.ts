import { addMonths, format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formats an ISO date (`YYYY-MM-DD` or timestamp) as `dd/MM/yyyy` without timezone drift.
 */
export function formatDateBR(isoDate: string): string {
  const parsed = parseISO(isoDate);
  if (!isValid(parsed)) {
    return "";
  }

  return format(parsed, "dd/MM/yyyy", { locale: ptBR });
}

/**
 * Formats a `YYYY-MM` billing month as `"Novembro de 2026"`.
 */
export function formatMonthYearBR(billingMonth: string): string {
  const parsed = parseISO(`${billingMonth}-01`);
  if (!isValid(parsed)) {
    return billingMonth;
  }

  const formatted = format(parsed, "MMMM 'de' yyyy", { locale: ptBR });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getCurrentBillingMonth(date: Date = new Date()): string {
  return format(date, "yyyy-MM");
}

export function getTodayISODate(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export function shiftBillingMonth(
  billingMonth: string,
  deltaMonths: number,
): string {
  const parsed = parseISO(`${billingMonth}-01`);
  if (!isValid(parsed)) {
    return getCurrentBillingMonth();
  }

  return format(addMonths(parsed, deltaMonths), "yyyy-MM");
}
