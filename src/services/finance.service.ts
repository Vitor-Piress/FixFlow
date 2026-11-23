import { getCurrentBillingMonth } from "@/lib/dates";
import {
  isValidBillingMonth,
  shouldAutoSyncRecurringForMonth,
} from "@/lib/finance";
import { supabase } from "@/lib/supabase";
import type {
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database.types";

export type FinancialTransaction = Tables<"financial_transactions">;

export type FinancialTransactionInsert = Omit<
  TablesInsert<"financial_transactions">,
  "id" | "created_at" | "updated_at"
>;

export type FinancialTransactionUpdate = Omit<
  TablesUpdate<"financial_transactions">,
  "id" | "created_at" | "updated_at"
>;

export type TransactionType = Enums<"transaction_type">;
export type TransactionStatus = Enums<"transaction_status">;

export type RecurringExpense = Tables<"recurring_expenses">;

export type RecurringExpenseInsert = Omit<
  TablesInsert<"recurring_expenses">,
  "id" | "created_at" | "updated_at"
>;

export type RecurringExpenseUpdate = Omit<
  TablesUpdate<"recurring_expenses">,
  "id" | "created_at" | "updated_at"
>;

export interface ListMonthlyTransactionsOptions {
  syncRecurring?: boolean;
}

export interface ListRecurringExpensesOptions {
  activeOnly?: boolean;
}

export async function syncMonthlyRecurringTransactions(
  targetMonth?: string,
): Promise<number> {
  const resolvedMonth = targetMonth ?? getCurrentBillingMonth();
  if (!isValidBillingMonth(resolvedMonth)) {
    throw new Error("Competência mensal inválida.");
  }

  const { data, error } = await supabase.rpc(
    "generate_monthly_recurring_transactions",
    {
      target_month: resolvedMonth,
    },
  );

  if (error) {
    throw new Error(
      "Não foi possível atualizar os lançamentos recorrentes do mês.",
    );
  }

  return data ?? 0;
}

export async function listFinancialTransactionsByMonth(
  billingMonth: string,
  options?: ListMonthlyTransactionsOptions,
): Promise<FinancialTransaction[]> {
  if (!isValidBillingMonth(billingMonth)) {
    throw new Error("Competência mensal inválida.");
  }

  if (
    options?.syncRecurring &&
    shouldAutoSyncRecurringForMonth(billingMonth, getCurrentBillingMonth())
  ) {
    await syncMonthlyRecurringTransactions(billingMonth);
  }

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("billing_month", billingMonth)
    .order("status", { ascending: true })
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar o Livro-Caixa.");
  }

  return data;
}

export async function createFinancialTransaction(
  payload: FinancialTransactionInsert,
): Promise<FinancialTransaction> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível registrar o lançamento.");
  }

  return data;
}

export async function updateFinancialTransaction(
  id: string,
  payload: FinancialTransactionUpdate,
): Promise<FinancialTransaction> {
  // Block edits to quote-backed entries at the query boundary as well as the UI.
  const { data, error } = await supabase
    .from("financial_transactions")
    .update(payload)
    .eq("id", id)
    .is("quote_id", null)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Já existe um lançamento desta recorrência para a competência informada.",
      );
    }

    throw new Error("Não foi possível atualizar o lançamento.");
  }

  return data;
}

export async function setFinancialTransactionStatus(
  id: string,
  status: TransactionStatus,
): Promise<FinancialTransaction> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .update({
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .is("quote_id", null)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      status === "paid"
        ? "Não foi possível confirmar a baixa do lançamento."
        : "Não foi possível reabrir o lançamento.",
    );
  }

  return data;
}

export async function deleteManualFinancialTransaction(
  id: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .delete()
    .eq("id", id)
    .is("quote_id", null)
    .is("contract_id", null)
    .is("recurring_expense_id", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível excluir o lançamento.");
  }

  if (!data) {
    throw new Error("Somente lançamentos manuais podem ser excluídos.");
  }
}

export async function listRecurringExpenses(
  options?: ListRecurringExpensesOptions,
): Promise<RecurringExpense[]> {
  let query = supabase
    .from("recurring_expenses")
    .select("*")
    .order("is_active", { ascending: false })
    .order("due_day", { ascending: true })
    .order("description", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Não foi possível carregar as despesas fixas.");
  }

  return data;
}

export async function createRecurringExpense(
  payload: RecurringExpenseInsert,
): Promise<RecurringExpense> {
  const { data, error } = await supabase
    .from("recurring_expenses")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível cadastrar a despesa fixa.");
  }

  return data;
}

export async function updateRecurringExpense(
  id: string,
  payload: RecurringExpenseUpdate,
): Promise<RecurringExpense> {
  const { data, error } = await supabase
    .from("recurring_expenses")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível atualizar a despesa fixa.");
  }

  return data;
}

export async function setRecurringExpenseActive(
  id: string,
  isActive: boolean,
): Promise<RecurringExpense> {
  const { data, error } = await supabase
    .from("recurring_expenses")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      isActive
        ? "Não foi possível reativar a despesa fixa."
        : "Não foi possível desativar a despesa fixa.",
    );
  }

  return data;
}
