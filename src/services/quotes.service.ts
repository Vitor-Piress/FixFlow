import type { QuotePaymentDraft } from "@/lib/quotePayments";
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
export type QuotePayment = Tables<"quote_payments">;
export type PaymentMode = Enums<"payment_mode">;

export type QuotePaymentSummary = Pick<
  QuotePayment,
  | "id"
  | "installment_number"
  | "label"
  | "amount_cents"
  | "due_date"
  | "status"
>;

export type QuoteListItem = Quote & {
  items_count: number;
  payments: QuotePaymentSummary[];
};

export type QuoteWithItems = Quote & {
  items: QuoteItem[];
  payments: QuotePayment[];
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

export interface SaveQuotePaymentPlanInput {
  quoteId: string;
  paymentMode: PaymentMode;
  depositPercent: number;
  installmentsCount: number;
  paymentTerms: string | null;
  installments: QuotePaymentDraft[];
}

function extractDomainErrorMessage(
  error: { code?: string | null; message?: string | null },
  fallback: string,
): string {
  const message = error.message?.trim();
  if (
    message &&
    (error.code === "P0001" ||
      message.includes("parcela") ||
      message.includes("orçamento") ||
      message.includes("Orçamentos"))
  ) {
    return message;
  }

  return fallback;
}

function sortQuoteItems(items: QuoteItem[]): QuoteItem[] {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    return a.created_at.localeCompare(b.created_at);
  });
}

function sortQuotePayments<T extends { installment_number: number }>(
  payments: T[],
): T[] {
  return [...payments].sort(
    (a, b) => a.installment_number - b.installment_number,
  );
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
    .select(
      "*, quote_items(count), quote_payments(id, installment_number, label, amount_cents, due_date, status)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar os orçamentos.");
  }

  return data.map(({ quote_items, quote_payments, ...quote }) => ({
    ...quote,
    items_count: quote_items?.[0]?.count ?? 0,
    payments: sortQuotePayments(quote_payments ?? []),
  }));
}

export async function getQuoteById(id: string): Promise<QuoteWithItems | null> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*, items:quote_items(*), payments:quote_payments(*)")
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
    payments: sortQuotePayments(data.payments ?? []),
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
    throw new Error(
      extractDomainErrorMessage(
        error,
        "Não foi possível atualizar o orçamento.",
      ),
    );
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
    throw new Error(
      extractDomainErrorMessage(
        error,
        "Não foi possível alterar o status do orçamento.",
      ),
    );
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
    throw new Error(
      extractDomainErrorMessage(
        error,
        "Não foi possível adicionar o item ao orçamento.",
      ),
    );
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
    throw new Error(
      extractDomainErrorMessage(
        error,
        "Não foi possível atualizar o item do orçamento.",
      ),
    );
  }

  return data;
}

export async function deleteQuoteItem(id: string): Promise<void> {
  const { error } = await supabase.from("quote_items").delete().eq("id", id);

  if (error) {
    throw new Error(
      extractDomainErrorMessage(
        error,
        "Não foi possível remover o item do orçamento.",
      ),
    );
  }
}

export async function saveQuotePaymentPlan(
  input: SaveQuotePaymentPlanInput,
): Promise<QuotePayment[]> {
  const { data, error } = await supabase.rpc("save_quote_payment_plan", {
    p_quote_id: input.quoteId,
    p_payment_mode: input.paymentMode,
    p_deposit_percent: input.depositPercent,
    p_installments_count: input.installmentsCount,
    ...(input.paymentTerms ? { p_payment_terms: input.paymentTerms } : {}),
    p_installments: input.installments.map((item) => ({
      ...(item.id ? { id: item.id } : {}),
      installment_number: item.installment_number,
      label: item.label,
      amount_cents: item.amount_cents,
      due_date: item.due_date,
    })),
  });

  if (error) {
    throw new Error(
      extractDomainErrorMessage(
        error,
        "Não foi possível salvar as condições de pagamento.",
      ),
    );
  }

  return sortQuotePayments(data ?? []);
}

export async function setQuotePaymentStatus(
  quotePaymentId: string,
  status: Enums<"transaction_status">,
): Promise<QuotePayment> {
  const { data, error } = await supabase.rpc("set_quote_payment_status", {
    p_quote_payment_id: quotePaymentId,
    p_status: status,
  });

  if (error) {
    throw new Error(
      extractDomainErrorMessage(
        error,
        status === "paid"
          ? "Não foi possível confirmar o recebimento da parcela."
          : "Não foi possível reabrir a parcela.",
      ),
    );
  }

  return data;
}
