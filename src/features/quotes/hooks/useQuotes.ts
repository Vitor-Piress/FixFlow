import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MATERIALS_QUERY_KEY } from "@/features/catalog/hooks/useMaterials";
import { QUOTE_STATUS_META } from "@/features/quotes/constants/quoteStatus";
import { getTodayISODate } from "@/lib/dates";
import { updateMaterial } from "@/services/materials.service";
import {
  addQuoteItem,
  createQuote,
  deleteQuote,
  deleteQuoteItem,
  getQuoteById,
  listQuotes,
  updateQuote,
  updateQuoteItem,
  updateQuoteStatus,
  type QuoteInsert,
  type QuoteItemInsert,
  type QuoteItemUpdate,
  type QuoteStatus,
  type QuoteUpdate,
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

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: QuoteInsert) => createQuote(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      toast.success("Orçamento criado.");
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

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: QuoteUpdate }) =>
      updateQuote(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: quoteDetailQueryKey(variables.id),
      });
      toast.success("Orçamento atualizado.");
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

      if (variables.status === "paid") {
        void queryClient.invalidateQueries({
          queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
        });
        toast.success("Orçamento pago e lançado no Livro-Caixa.");
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
