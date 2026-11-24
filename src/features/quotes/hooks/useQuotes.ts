import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CLIENTS_QUERY_KEY } from "@/features/catalog/hooks/useClients";
import { MATERIALS_QUERY_KEY } from "@/features/catalog/hooks/useMaterials";
import { NOTIFICATIONS_QUERY_KEY } from "@/features/notifications/hooks/useNotifications";
import { QUOTE_STATUS_META } from "@/features/quotes/constants/quoteStatus";
import { getTodayISODate } from "@/lib/dates";
import { ensureClientFromQuote } from "@/services/clients.service";
import { updateMaterial } from "@/services/materials.service";
import {
  addQuoteItem,
  createQuote,
  deleteQuote,
  deleteQuoteItem,
  getQuoteById,
  listQuotes,
  saveQuotePaymentPlan,
  setQuotePaymentStatus,
  updateQuote,
  updateQuoteItem,
  updateQuoteStatus,
  type Quote,
  type QuoteInsert,
  type QuoteItemInsert,
  type QuoteItemUpdate,
  type QuoteStatus,
  type QuoteUpdate,
  type SaveQuotePaymentPlanInput,
} from "@/services/quotes.service";

export const QUOTES_QUERY_KEY = ["quotes"] as const;
export const FINANCIAL_TRANSACTIONS_QUERY_KEY = [
  "financial-transactions",
] as const;

export function quoteDetailQueryKey(id: string) {
  return ["quotes", id] as const;
}

export function useQuotes() {
  return useQuery({
    queryKey: QUOTES_QUERY_KEY,
    queryFn: listQuotes,
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: quoteDetailQueryKey(id ?? ""),
    queryFn: () => getQuoteById(id!),
    enabled: Boolean(id),
  });
}

export type QuotePaymentPlanDraftInput = Omit<
  SaveQuotePaymentPlanInput,
  "quoteId"
>;

export interface CreateQuoteVariables {
  payload: QuoteInsert;
  paymentPlan?: QuotePaymentPlanDraftInput;
  autoEnsureClient?: boolean;
}

export interface SaveQuoteMutationResult {
  quote: Quote;
  clientCreated: boolean;
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payload,
      paymentPlan,
      autoEnsureClient = true,
    }: CreateQuoteVariables): Promise<SaveQuoteMutationResult> => {
      let resolvedClientId = payload.client_id ?? null;
      let clientCreated = false;

      if (!resolvedClientId && autoEnsureClient) {
        const ensured = await ensureClientFromQuote({
          name: payload.client_name,
          phone: payload.client_phone ?? null,
          address: payload.client_address ?? null,
        });
        if (ensured.client) {
          resolvedClientId = ensured.client.id;
          clientCreated = ensured.created;
        }
      }

      const created = await createQuote({
        ...payload,
        client_id: resolvedClientId,
      });

      if (paymentPlan) {
        await saveQuotePaymentPlan({
          quoteId: created.id,
          ...paymentPlan,
        });
      }

      return { quote: created, clientCreated };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      if (result.clientCreated || result.quote.client_id) {
        void queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      }
      toast.success(
        result.clientCreated
          ? "Orçamento criado e cliente cadastrado."
          : "Orçamento criado.",
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível criar o orçamento.";
      toast.error(message);
    },
  });
}

export interface UpdateQuoteVariables {
  id: string;
  payload: QuoteUpdate;
  paymentPlan?: QuotePaymentPlanDraftInput;
  autoEnsureClient?: boolean;
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
      paymentPlan,
      autoEnsureClient = false,
    }: UpdateQuoteVariables): Promise<SaveQuoteMutationResult> => {
      let resolvedClientId = payload.client_id;
      let clientCreated = false;

      if (
        autoEnsureClient &&
        !resolvedClientId &&
        typeof payload.client_name === "string"
      ) {
        const ensured = await ensureClientFromQuote({
          name: payload.client_name,
          phone: payload.client_phone ?? null,
          address: payload.client_address ?? null,
        });
        if (ensured.client) {
          resolvedClientId = ensured.client.id;
          clientCreated = ensured.created;
        }
      }

      const updated = await updateQuote(id, {
        ...payload,
        ...(resolvedClientId !== undefined
          ? { client_id: resolvedClientId }
          : {}),
      });

      if (paymentPlan) {
        await saveQuotePaymentPlan({
          quoteId: id,
          ...paymentPlan,
        });
      }

      return { quote: updated, clientCreated };
    },
    onSuccess: (result, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: quoteDetailQueryKey(variables.id),
      });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      if (result.clientCreated || result.quote.client_id) {
        void queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      }
      toast.success(
        result.clientCreated
          ? "Orçamento atualizado e cliente cadastrado."
          : "Orçamento atualizado.",
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o orçamento.";
      toast.error(message);
    },
  });
}

export function useSaveQuotePaymentPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveQuotePaymentPlanInput) =>
      saveQuotePaymentPlan(input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: quoteDetailQueryKey(variables.quoteId),
      });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      toast.success("Condições de pagamento salvas.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as condições de pagamento.";
      toast.error(message);
    },
  });
}

export interface SetQuotePaymentStatusVariables {
  paymentId: string;
  quoteId: string | null;
  status: "pending" | "paid";
}

export function useSetQuotePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, status }: SetQuotePaymentStatusVariables) =>
      setQuotePaymentStatus(paymentId, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      if (variables.quoteId) {
        void queryClient.invalidateQueries({
          queryKey: quoteDetailQueryKey(variables.quoteId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

      toast.success(
        variables.status === "paid"
          ? "Parcela marcada como recebida."
          : "Parcela reaberta como pendente.",
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a situação da parcela.";
      toast.error(message);
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      updateQuoteStatus(id, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: quoteDetailQueryKey(variables.id),
      });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

      if (variables.status === "paid") {
        toast.success("Orçamento pago e lançado no Livro-Caixa.");
        return;
      }

      if (variables.status === "approved") {
        toast.success("Orçamento aprovado. Parcelas sincronizadas no Livro-Caixa.");
        return;
      }

      toast.success(
        `Status alterado para ${QUOTE_STATUS_META[variables.status].label}.`,
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o status do orçamento.";
      toast.error(message);
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: quoteDetailQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      toast.success("Orçamento excluído.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o orçamento.";
      toast.error(message);
    },
  });
}

export function useAddQuoteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: QuoteItemInsert) => addQuoteItem(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: quoteDetailQueryKey(variables.quote_id),
      });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      toast.success("Item adicionado ao orçamento.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o item ao orçamento.";
      toast.error(message);
    },
  });
}

export interface UpdateQuoteItemVariables {
  id: string;
  quoteId: string;
  payload: QuoteItemUpdate;
  updateCatalogPrice?: boolean;
  materialId?: string | null;
}

export function useUpdateQuoteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
      updateCatalogPrice,
      materialId,
    }: UpdateQuoteItemVariables) => {
      const updatedItem = await updateQuoteItem(id, payload);

      if (
        updateCatalogPrice &&
        materialId &&
        typeof payload.unit_price_snapshot_cents === "number"
      ) {
        try {
          await updateMaterial(materialId, {
            unit_price_cents: payload.unit_price_snapshot_cents,
            price_updated_at: getTodayISODate(),
          });
          return { item: updatedItem, catalogSync: "updated" as const };
        } catch {
          return { item: updatedItem, catalogSync: "failed" as const };
        }
      }

      return { item: updatedItem, catalogSync: "skipped" as const };
    },
    onSuccess: (result, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: quoteDetailQueryKey(variables.quoteId),
      });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

      if (result.catalogSync === "updated") {
        void queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
        toast.success("Item atualizado e preço salvo no catálogo.");
        return;
      }

      if (result.catalogSync === "failed") {
        toast.warning(
          "Item atualizado no orçamento, mas não foi possível atualizar o catálogo.",
        );
        return;
      }

      toast.success("Item atualizado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o item.";
      toast.error(message);
    },
  });
}

export function useDeleteQuoteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; quoteId: string }) => deleteQuoteItem(id),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: quoteDetailQueryKey(variables.quoteId),
      });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      toast.success("Item removido.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível remover o item.";
      toast.error(message);
    },
  });
}
