import { supabase } from "@/lib/supabase";
import type {
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database.types";

export type Quote = Tables<"quotes">;
export type QuoteStatus = Enums<"quote_status">;
export type QuoteItem = Tables<"quote_items">;
export type QuoteItemType = Enums<"quote_item_type">;

export type QuoteListItem = Quote & {
  items_count: number;
};

export type QuoteWithItems = Quote & {
  items: QuoteItem[];
};

export type QuoteInsert = Omit<
  TablesInsert<"quotes">,
  | "id"
  | "quote_number"
  | "subtotal_cents"
  | "total_cents"
  | "paid_at"
  | "created_at"
  | "updated_at"
>;

export type QuoteUpdate = Omit<
  TablesUpdate<"quotes">,
  | "id"
  | "quote_number"
  | "subtotal_cents"
  | "total_cents"
  | "paid_at"
  | "created_at"
  | "updated_at"
>;

export type QuoteItemInsert = Omit<
  TablesInsert<"quote_items">,
  "id" | "subtotal_cents" | "created_at"
>;

export type QuoteItemUpdate = Omit<
  TablesUpdate<"quote_items">,
  "id" | "quote_id" | "subtotal_cents" | "created_at"
>;

function sortQuoteItems(items: QuoteItem[]): QuoteItem[] {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    return a.created_at.localeCompare(b.created_at);
  });
}

function normalizeItemSource(
  itemType: QuoteItemType,
  serviceId: string | null | undefined,
  materialId: string | null | undefined,
): { service_id: string | null; material_id: string | null } {
  if (itemType === "service") {
    return {
      service_id: serviceId ?? null,
      material_id: null,
    };
  }

  return {
    service_id: null,
    material_id: materialId ?? null,
  };
}

export async function listQuotes(): Promise<QuoteListItem[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*, quote_items(count)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar os orçamentos.");
  }

  return data.map(({ quote_items, ...quote }) => ({
    ...quote,
    items_count: quote_items?.[0]?.count ?? 0,
  }));
}

export async function getQuoteById(id: string): Promise<QuoteWithItems | null> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*, items:quote_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    // Postgres returns 22P02 when the route param is not a valid UUID.
    if (error.code === "22P02") {
      return null;
    }
    throw new Error("Não foi possível carregar o orçamento.");
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    items: sortQuoteItems(data.items ?? []),
  };
}

export async function createQuote(payload: QuoteInsert): Promise<Quote> {
  const { data, error } = await supabase
    .from("quotes")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível criar o orçamento.");
  }

  return data;
}

export async function updateQuote(
  id: string,
  payload: QuoteUpdate,
): Promise<Quote> {
  const { data, error } = await supabase
    .from("quotes")
    .update(payload)
    .eq("id", id)
    .neq("status", "paid")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível atualizar o orçamento.");
  }

  if (!data) {
    throw new Error("Não é possível editar um orçamento já pago.");
  }

  return data;
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus,
): Promise<Quote> {
  const { data, error } = await supabase
    .from("quotes")
    .update({ status })
    .eq("id", id)
    .neq("status", "paid")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível alterar o status do orçamento.");
  }

  if (!data) {
    throw new Error("Orçamentos pagos não podem ter o status alterado.");
  }

  return data;
}

export async function deleteQuote(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .neq("status", "paid")
    .select("id");

  if (error) {
    throw new Error("Não foi possível excluir o orçamento.");
  }

  if (!data || data.length === 0) {
    throw new Error("Não é possível excluir um orçamento pago.");
  }
}

export async function addQuoteItem(
  payload: QuoteItemInsert,
): Promise<QuoteItem> {
  const source = normalizeItemSource(
    payload.item_type,
    payload.service_id,
    payload.material_id,
  );

  const { data, error } = await supabase
    .from("quote_items")
    .insert({
      ...payload,
      ...source,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível adicionar o item ao orçamento.");
  }

  return data;
}

export async function updateQuoteItem(
  id: string,
  payload: QuoteItemUpdate,
): Promise<QuoteItem> {
  const normalizedPayload: QuoteItemUpdate = payload.item_type
    ? {
        ...payload,
        ...normalizeItemSource(
          payload.item_type,
          payload.service_id,
          payload.material_id,
        ),
      }
    : payload;

  const { data, error } = await supabase
    .from("quote_items")
    .update(normalizedPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível atualizar o item do orçamento.");
  }

  return data;
}

export async function deleteQuoteItem(id: string): Promise<void> {
  const { error } = await supabase.from("quote_items").delete().eq("id", id);

  if (error) {
    throw new Error("Não foi possível remover o item do orçamento.");
  }
}
