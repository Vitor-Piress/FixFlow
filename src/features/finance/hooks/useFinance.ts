import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FINANCIAL_TRANSACTIONS_QUERY_KEY } from "@/features/quotes/hooks/useQuotes";
import { formatMonthYearBR, getCurrentBillingMonth } from "@/lib/dates";
import { isValidBillingMonth } from "@/lib/finance";
import {
  createFinancialTransaction,
  createRecurringExpense,
  deleteManualFinancialTransaction,
  listFinancialTransactionsByMonth,
  listRecurringExpenses,
  setFinancialTransactionStatus,
  setRecurringExpenseActive,
  syncMonthlyRecurringTransactions,
  updateFinancialTransaction,
  updateRecurringExpense,
  type FinancialTransactionInsert,
  type FinancialTransactionUpdate,
  type ListRecurringExpensesOptions,
  type RecurringExpense,
  type RecurringExpenseInsert,
  type RecurringExpenseUpdate,
  type TransactionStatus,
  type TransactionType,
} from "@/services/finance.service";

export { FINANCIAL_TRANSACTIONS_QUERY_KEY };

export const RECURRING_EXPENSES_QUERY_KEY = ["recurring-expenses"] as const;

export function monthlyTransactionsQueryKey(billingMonth: string) {
  return [...FINANCIAL_TRANSACTIONS_QUERY_KEY, billingMonth] as const;
}

export function useMonthlyTransactions(billingMonth: string) {
  return useQuery({
    queryKey: monthlyTransactionsQueryKey(billingMonth),
    queryFn: () =>
      listFinancialTransactionsByMonth(billingMonth, { syncRecurring: true }),
    enabled: isValidBillingMonth(billingMonth),
  });
}

export interface CreateTransactionVariables {
  payload: FinancialTransactionInsert;
  viewedBillingMonth?: string;
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload }: CreateTransactionVariables) =>
      createFinancialTransaction(payload),
    onSuccess: (created, variables) => {
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });

      if (
        variables.viewedBillingMonth &&
        created.billing_month !== variables.viewedBillingMonth
      ) {
        toast.success(
          `Lançamento registrado em ${formatMonthYearBR(created.billing_month)}.`,
        );
        return;
      }

      toast.success("Lançamento registrado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o lançamento.";
      toast.error(message);
    },
  });
}

export interface UpdateTransactionVariables {
  id: string;
  payload: FinancialTransactionUpdate;
  viewedBillingMonth?: string;
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateTransactionVariables) =>
      updateFinancialTransaction(id, payload),
    onSuccess: (updated, variables) => {
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });

      if (
        variables.viewedBillingMonth &&
        updated.billing_month !== variables.viewedBillingMonth
      ) {
        toast.success(
          `Lançamento atualizado em ${formatMonthYearBR(updated.billing_month)}.`,
        );
        return;
      }

      toast.success("Lançamento atualizado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o lançamento.";
      toast.error(message);
    },
  });
}

export interface SetTransactionStatusVariables {
  id: string;
  status: TransactionStatus;
  type: TransactionType;
}

export function useSetTransactionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: SetTransactionStatusVariables) =>
      setFinancialTransactionStatus(id, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });

      if (variables.status === "paid") {
        toast.success(
          variables.type === "income"
            ? "Recebimento confirmado."
            : "Pagamento confirmado.",
        );
        return;
      }

      toast.success("Lançamento reaberto como pendente.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a situação do lançamento.";
      toast.error(message);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteManualFinancialTransaction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });
      toast.success("Lançamento excluído.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o lançamento.";
      toast.error(message);
    },
  });
}

export function useRecurringExpenses(options?: ListRecurringExpensesOptions) {
  const activeOnly = Boolean(options?.activeOnly);

  return useQuery({
    queryKey: [...RECURRING_EXPENSES_QUERY_KEY, { activeOnly }] as const,
    queryFn: () => listRecurringExpenses({ activeOnly }),
  });
}

export interface RecurringExpenseMutationResult {
  expense: RecurringExpense;
  recurringSyncFailed: boolean;
}

export function useCreateRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: RecurringExpenseInsert,
    ): Promise<RecurringExpenseMutationResult> => {
      const expense = await createRecurringExpense(payload);
      let recurringSyncFailed = false;

      if (expense.is_active) {
        try {
          await syncMonthlyRecurringTransactions(getCurrentBillingMonth());
        } catch {
          recurringSyncFailed = true;
        }
      }

      return { expense, recurringSyncFailed };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: RECURRING_EXPENSES_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });

      if (result.recurringSyncFailed) {
        toast.warning(
          "Despesa fixa cadastrada, mas não foi possível gerar o lançamento deste mês.",
        );
        return;
      }

      toast.success("Despesa fixa cadastrada.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar a despesa fixa.";
      toast.error(message);
    },
  });
}

export interface UpdateRecurringExpenseVariables {
  id: string;
  payload: RecurringExpenseUpdate;
}

export function useUpdateRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: UpdateRecurringExpenseVariables): Promise<RecurringExpenseMutationResult> => {
      const expense = await updateRecurringExpense(id, payload);
      let recurringSyncFailed = false;

      if (expense.is_active) {
        try {
          await syncMonthlyRecurringTransactions(getCurrentBillingMonth());
        } catch {
          recurringSyncFailed = true;
        }
      }

      return { expense, recurringSyncFailed };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: RECURRING_EXPENSES_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });

      if (result.recurringSyncFailed) {
        toast.warning(
          "Despesa fixa atualizada, mas não foi possível atualizar os lançamentos do mês.",
        );
        return;
      }

      toast.success("Despesa fixa atualizada.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a despesa fixa.";
      toast.error(message);
    },
  });
}

export interface ToggleRecurringExpenseActiveVariables {
  id: string;
  isActive: boolean;
}

export function useToggleRecurringExpenseActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: ToggleRecurringExpenseActiveVariables): Promise<RecurringExpenseMutationResult> => {
      const expense = await setRecurringExpenseActive(id, isActive);
      let recurringSyncFailed = false;

      if (isActive) {
        try {
          await syncMonthlyRecurringTransactions(getCurrentBillingMonth());
        } catch {
          recurringSyncFailed = true;
        }
      }

      return { expense, recurringSyncFailed };
    },
    onSuccess: (result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: RECURRING_EXPENSES_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });

      if (!variables.isActive) {
        toast.success("Despesa fixa desativada.");
        return;
      }

      if (result.recurringSyncFailed) {
        toast.warning(
          "Despesa fixa reativada, mas não foi possível atualizar os lançamentos do mês.",
        );
        return;
      }

      toast.success("Despesa fixa reativada.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a situação da despesa fixa.";
      toast.error(message);
    },
  });
}
