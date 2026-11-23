export const INCOME_CATEGORY_PRESETS = [
  "Serviços / Orçamentos",
  "Contratos Mensais",
  "Manutenção Avulsa",
  "Outros Recebimentos",
] as const;

export const EXPENSE_CATEGORY_PRESETS = [
  "Despesa Fixa",
  "Combustível",
  "Materiais e Peças",
  "Ferramentas",
  "Impostos / MEI",
  "Aluguel / Espaço",
  "Telefone / Internet",
  "Outros Gastos",
] as const;

export type TransactionSourceKind =
  | "quote"
  | "contract"
  | "recurring_expense"
  | "manual";

export interface CashbookTransactionLike {
  type: "income" | "expense";
  status: "pending" | "paid";
  amount_cents: number;
  due_date: string;
  quote_id: string | null;
  contract_id: string | null;
  recurring_expense_id: string | null;
}

export interface CashbookSummary {
  receivedIncomeCents: number;
  pendingIncomeCents: number;
  paidExpenseCents: number;
  pendingExpenseCents: number;
  realizedBalanceCents: number;
  projectedBalanceCents: number;
  pendingCount: number;
  overdueCount: number;
}

const BILLING_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE_REGEX = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function getDaysInCalendarMonth(year: number, month: number): number {
  if (month === 2) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeapYear ? 29 : 28;
  }

  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }

  return 31;
}

export function isValidBillingMonth(value: string): boolean {
  return BILLING_MONTH_REGEX.test(value.trim());
}

// Validates YYYY-MM-DD strictly by calendar bounds to avoid Date timezone drift.
export function isValidIsoCalendarDate(value: string): boolean {
  const match = ISO_DATE_REGEX.exec(value.trim());
  if (!match) {
    return false;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  return day <= getDaysInCalendarMonth(year, month);
}

export function deriveBillingMonthFromDate(isoDate: string): string {
  const trimmed = isoDate.trim();
  if (!isValidIsoCalendarDate(trimmed)) {
    return "";
  }

  return trimmed.slice(0, 7);
}

// Recurring expenses lack started_at, so auto-sync runs only for current/future months.
export function shouldAutoSyncRecurringForMonth(
  billingMonth: string,
  currentBillingMonth: string,
): boolean {
  const target = billingMonth.trim();
  const current = currentBillingMonth.trim();

  if (!isValidBillingMonth(target) || !isValidBillingMonth(current)) {
    return false;
  }

  return target >= current;
}

export function isTransactionOverdue(
  transaction: Pick<CashbookTransactionLike, "status" | "due_date">,
  todayIsoDate: string,
): boolean {
  if (transaction.status !== "pending") {
    return false;
  }

  const due = transaction.due_date.trim();
  const today = todayIsoDate.trim();

  if (!isValidIsoCalendarDate(due) || !isValidIsoCalendarDate(today)) {
    return false;
  }

  return due < today;
}

export function getTransactionSourceKind(
  transaction: Pick<
    CashbookTransactionLike,
    "quote_id" | "contract_id" | "recurring_expense_id"
  >,
): TransactionSourceKind {
  if (transaction.quote_id) {
    return "quote";
  }

  if (transaction.contract_id) {
    return "contract";
  }

  if (transaction.recurring_expense_id) {
    return "recurring_expense";
  }

  return "manual";
}

export function getDefaultDueDateForBillingMonth(
  billingMonth: string,
  todayIsoDate: string,
): string {
  const trimmedMonth = billingMonth.trim();
  const trimmedToday = todayIsoDate.trim();

  if (
    isValidBillingMonth(trimmedMonth) &&
    deriveBillingMonthFromDate(trimmedToday) === trimmedMonth
  ) {
    return trimmedToday;
  }

  if (isValidBillingMonth(trimmedMonth)) {
    return `${trimmedMonth}-01`;
  }

  return trimmedToday;
}

export function calculateCashbookSummary(
  transactions: readonly CashbookTransactionLike[],
  todayIsoDate: string,
): CashbookSummary {
  let receivedIncomeCents = 0;
  let pendingIncomeCents = 0;
  let paidExpenseCents = 0;
  let pendingExpenseCents = 0;
  let pendingCount = 0;
  let overdueCount = 0;

  for (const transaction of transactions) {
    const amountCents = Number.isFinite(transaction.amount_cents)
      ? Math.round(transaction.amount_cents)
      : 0;

    if (transaction.type === "income") {
      if (transaction.status === "paid") {
        receivedIncomeCents += amountCents;
      } else {
        pendingIncomeCents += amountCents;
      }
    } else if (transaction.status === "paid") {
      paidExpenseCents += amountCents;
    } else {
      pendingExpenseCents += amountCents;
    }

    if (transaction.status === "pending") {
      pendingCount += 1;
      if (isTransactionOverdue(transaction, todayIsoDate)) {
        overdueCount += 1;
      }
    }
  }

  const realizedBalanceCents = receivedIncomeCents - paidExpenseCents;
  const projectedBalanceCents =
    receivedIncomeCents +
    pendingIncomeCents -
    (paidExpenseCents + pendingExpenseCents);

  return {
    receivedIncomeCents,
    pendingIncomeCents,
    paidExpenseCents,
    pendingExpenseCents,
    realizedBalanceCents,
    projectedBalanceCents,
    pendingCount,
    overdueCount,
  };
}
