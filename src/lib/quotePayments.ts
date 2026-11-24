import { addMonths, format, isValid, parseISO } from "date-fns";
import { formatDateBR } from "./dates.ts";
import { formatCentsToBRL } from "./money.ts";

export type PaymentMode = "cash" | "split" | "installments" | "custom";
export type QuotePaymentStatus = "pending" | "paid";

export interface QuotePaymentLike {
  id?: string;
  installment_number: number;
  label: string;
  amount_cents: number;
  due_date: string | null;
  status: QuotePaymentStatus;
  paid_at?: string | null;
}

export interface QuotePaymentDraft {
  id?: string;
  installment_number: number;
  label: string;
  amount_cents: number;
  due_date: string | null;
}

export interface PaymentModeMeta {
  value: PaymentMode;
  label: string;
  description: string;
}

export const PAYMENT_MODE_OPTIONS: readonly PaymentModeMeta[] = [
  {
    value: "cash",
    label: "À vista",
    description: "Pagamento único",
  },
  {
    value: "split",
    label: "Entrada + Saldo",
    description: "50/50 ou outro %",
  },
  {
    value: "installments",
    label: "Parcelado",
    description: "2x a 12x mensais",
  },
  {
    value: "custom",
    label: "Personalizado",
    description: "Datas e valores livres",
  },
];

export const SPLIT_PERCENT_PRESETS = [
  { depositPercent: 50, label: "50/50" },
  { depositPercent: 40, label: "40/60" },
  { depositPercent: 30, label: "30/70" },
] as const;

export const INSTALLMENT_COUNT_OPTIONS = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeIsoDateOrNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!ISO_DATE_REGEX.test(trimmed)) {
    return null;
  }

  const parsed = parseISO(trimmed);
  return isValid(parsed) ? trimmed : null;
}

/**
 * Adds calendar months to an ISO `YYYY-MM-DD` date without timezone drift.
 * Month-end clamping (e.g. Jan 31 + 1 month -> Feb 28/29) matches date-fns `addMonths`.
 */
export function addMonthsToISODate(
  isoDate: string | null | undefined,
  deltaMonths: number,
): string | null {
  const validIso = normalizeIsoDateOrNull(isoDate);
  if (!validIso) {
    return null;
  }

  const safeMonths = Number.isFinite(deltaMonths) ? Math.trunc(deltaMonths) : 0;
  return format(addMonths(parseISO(validIso), safeMonths), "yyyy-MM-dd");
}

/**
 * Splits integer cents into `[depositCents, balanceCents]` matching PostgreSQL `round((total * pct) / 100.0)`.
 */
export function calculateSplitAmounts(
  totalCents: number,
  depositPercent: number,
): [number, number] {
  const safeTotal = Number.isFinite(totalCents)
    ? Math.max(0, Math.round(totalCents))
    : 0;
  const safePct = clampInteger(depositPercent, 1, 99);
  const depositCents = Math.round((safeTotal * safePct) / 100);
  const balanceCents = Math.max(0, safeTotal - depositCents);

  return [depositCents, balanceCents];
}

/**
 * Splits integer cents across `count` installments, placing any remainder cents on the first installment.
 */
export function calculateInstallmentAmounts(
  totalCents: number,
  count: number,
): number[] {
  const safeTotal = Number.isFinite(totalCents)
    ? Math.max(0, Math.round(totalCents))
    : 0;
  const safeCount = clampInteger(count, 1, 24);
  const baseAmount = Math.floor(safeTotal / safeCount);
  const remainder = safeTotal % safeCount;

  return Array.from({ length: safeCount }, (_unused, index) =>
    index === 0 ? baseAmount + remainder : baseAmount,
  );
}

export interface BuildScheduleDraftInput {
  mode: PaymentMode;
  totalCents: number;
  depositPercent: number;
  installmentsCount: number;
  firstDueDate?: string | null;
  secondDueDate?: string | null;
}

export function buildPaymentScheduleDraft({
  mode,
  totalCents,
  depositPercent,
  installmentsCount,
  firstDueDate,
  secondDueDate,
}: BuildScheduleDraftInput): QuotePaymentDraft[] {
  const safeTotal = Number.isFinite(totalCents)
    ? Math.max(0, Math.round(totalCents))
    : 0;
  const firstDate = normalizeIsoDateOrNull(firstDueDate);
  const secondDate = normalizeIsoDateOrNull(secondDueDate);

  if (mode === "cash") {
    return [
      {
        installment_number: 1,
        label: "Pagamento à vista",
        amount_cents: safeTotal,
        due_date: firstDate,
      },
    ];
  }

  if (mode === "split") {
    const safePct = clampInteger(depositPercent, 1, 99);
    const [depositCents, balanceCents] = calculateSplitAmounts(
      safeTotal,
      safePct,
    );

    return [
      {
        installment_number: 1,
        label: `Entrada (${safePct}%)`,
        amount_cents: depositCents,
        due_date: firstDate,
      },
      {
        installment_number: 2,
        label: `Saldo (${100 - safePct}%)`,
        amount_cents: balanceCents,
        due_date: secondDate,
      },
    ];
  }

  if (mode === "installments") {
    const safeCount = clampInteger(installmentsCount, 2, 24);
    const amounts = calculateInstallmentAmounts(safeTotal, safeCount);

    return amounts.map((amountCents, index) => ({
      installment_number: index + 1,
      label: `Parcela ${index + 1}/${safeCount}`,
      amount_cents: amountCents,
      due_date: firstDate ? addMonthsToISODate(firstDate, index) : null,
    }));
  }

  return [];
}

export function isQuotePaymentOverdue(
  payment: Pick<QuotePaymentLike, "status" | "due_date">,
  todayIsoDate: string,
): boolean {
  if (payment.status !== "pending") {
    return false;
  }

  const due = normalizeIsoDateOrNull(payment.due_date);
  const today = normalizeIsoDateOrNull(todayIsoDate);
  if (!due || !today) {
    return false;
  }

  return due < today;
}

export interface QuotePaymentProgress<T extends QuotePaymentLike = QuotePaymentLike> {
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  paidCents: number;
  pendingCents: number;
  remainingCents: number;
  isPartiallyPaid: boolean;
  isFullyPaid: boolean;
  nextUnpaid: T | null;
}

export function getQuotePaymentProgress<T extends QuotePaymentLike>(
  payments: readonly T[],
  totalCents: number,
  todayIsoDate: string,
): QuotePaymentProgress<T> {
  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let paidCents = 0;
  let pendingCents = 0;
  let nextUnpaid: T | null = null;

  const sorted = [...payments].sort(
    (a, b) => a.installment_number - b.installment_number,
  );

  for (const payment of sorted) {
    if (payment.status === "paid") {
      paidCount += 1;
      paidCents += payment.amount_cents;
    } else {
      pendingCount += 1;
      pendingCents += payment.amount_cents;
      if (!nextUnpaid) {
        nextUnpaid = payment;
      }
      if (isQuotePaymentOverdue(payment, todayIsoDate)) {
        overdueCount += 1;
      }
    }
  }

  const safeTotal = Number.isFinite(totalCents)
    ? Math.max(0, Math.round(totalCents))
    : 0;
  const remainingCents = Math.max(0, safeTotal - paidCents);
  const totalCount = sorted.length;

  return {
    totalCount,
    paidCount,
    pendingCount,
    overdueCount,
    paidCents,
    pendingCents,
    remainingCents,
    isPartiallyPaid: paidCount > 0 && pendingCount > 0,
    isFullyPaid:
      totalCount > 0 &&
      paidCount === totalCount &&
      (safeTotal === 0 || paidCents >= safeTotal),
    nextUnpaid,
  };
}

export function formatPaymentModeHeadline(
  mode: PaymentMode,
  depositPercent: number,
  installmentsCount: number,
  paymentTerms?: string | null,
): string {
  switch (mode) {
    case "cash":
      return "À vista";
    case "split": {
      const safePct = clampInteger(depositPercent, 1, 99);
      return `Entrada de ${safePct}% + Saldo de ${100 - safePct}%`;
    }
    case "installments": {
      const safeCount = clampInteger(installmentsCount, 2, 24);
      return `Parcelado em ${safeCount}x`;
    }
    case "custom":
      return paymentTerms?.trim() || "Condições personalizadas";
  }
}

export function formatPaymentScheduleSummaryLine(
  payment: QuotePaymentLike,
  totalCents: number,
): string {
  const amountText =
    totalCents > 0 ? formatCentsToBRL(payment.amount_cents) : "a calcular";
  const dateText = payment.due_date ? formatDateBR(payment.due_date) : null;
  const parts = [amountText];
  if (dateText) {
    parts.push(`venc. ${dateText}`);
  }
  if (payment.status === "paid") {
    parts.push("pago");
  }

  return `${payment.label}: ${parts.join(" · ")}`;
}
