import type { BadgeVariant } from "@/components/ui/Badge";
import { formatDateBR } from "@/lib/dates";
import { formatCentsToBRL } from "@/lib/money";
import { formatQuantityBR, formatUnitShort } from "@/lib/units";
import type { QuoteStatus, QuoteWithItems } from "@/services/quotes.service";

export const QUOTE_STATUS_VALUES = [
  "draft",
  "sent",
  "approved",
  "completed",
  "paid",
  "canceled",
] as const satisfies readonly QuoteStatus[];

export interface QuoteStatusMeta {
  value: QuoteStatus;
  label: string;
  badgeVariant: BadgeVariant;
  description: string;
}

export const QUOTE_STATUS_META: Record<QuoteStatus, QuoteStatusMeta> = {
  draft: {
    value: "draft",
    label: "Rascunho",
    badgeVariant: "neutral",
    description: "Em elaboração, ainda não enviado ao cliente.",
  },
  sent: {
    value: "sent",
    label: "Enviado",
    badgeVariant: "info",
    description: "Proposta enviada ao cliente, aguardando resposta.",
  },
  approved: {
    value: "approved",
    label: "Aprovado",
    badgeVariant: "info",
    description: "Cliente aprovou o orçamento, pronto para execução.",
  },
  completed: {
    value: "completed",
    label: "Concluído",
    badgeVariant: "warning",
    description: "Serviço finalizado, aguardando pagamento. Não entra no caixa ainda.",
  },
  paid: {
    value: "paid",
    label: "Pago",
    badgeVariant: "success",
    description:
      "Pagamento recebido. Lança receita automática no Livro-Caixa e bloqueia edições.",
  },
  canceled: {
    value: "canceled",
    label: "Cancelado",
    badgeVariant: "danger",
    description: "Orçamento cancelado. Pode ser reaberto como rascunho.",
  },
};

export type QuoteStatusFilter = "all" | QuoteStatus;

export const QUOTE_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: QuoteStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Rascunho" },
  { value: "sent", label: "Enviado" },
  { value: "approved", label: "Aprovado" },
  { value: "completed", label: "Concluído" },
  { value: "paid", label: "Pago" },
  { value: "canceled", label: "Cancelado" },
];

const STATUS_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ["sent", "approved", "completed", "paid", "canceled"],
  sent: ["approved", "completed", "paid", "draft", "canceled"],
  approved: ["completed", "paid", "sent", "draft", "canceled"],
  completed: ["paid", "approved", "canceled"],
  paid: [],
  canceled: ["draft"],
};

export function formatQuoteNumber(quoteNumber: number): string {
  return `#${String(quoteNumber).padStart(3, "0")}`;
}

export function isQuoteEditable(status: QuoteStatus): boolean {
  return status !== "paid" && status !== "canceled";
}

export function isQuotePaid(status: QuoteStatus): boolean {
  return status === "paid";
}

export function canSyncMaterialPriceToCatalog(status: QuoteStatus): boolean {
  return status === "draft" || status === "sent";
}

export function getNextStatusTransitions(
  status: QuoteStatus,
): readonly QuoteStatus[] {
  return STATUS_TRANSITIONS[status];
}

export function buildQuoteWhatsAppMessage(
  quote: QuoteWithItems,
  businessName?: string | null,
): string {
  const quoteLabel = formatQuoteNumber(quote.quote_number);
  const titleSuffix = quote.title ? `: ${quote.title}` : "";
  const lines: string[] = [
    `Olá, ${quote.client_name}! Segue o orçamento ${quoteLabel}${titleSuffix}.`,
  ];

  if (quote.items.length > 0) {
    lines.push("", "Itens:");
    for (const item of quote.items) {
      const qtyUnit = `${formatQuantityBR(item.quantity)} ${formatUnitShort(item.unit_snapshot)}`;
      if (quote.show_item_prices) {
        lines.push(
          `- ${item.description_snapshot} (${qtyUnit}): ${formatCentsToBRL(item.subtotal_cents)}`,
        );
      } else {
        lines.push(`- ${item.description_snapshot} (${qtyUnit})`);
      }
    }
  }

  lines.push("");

  if (
    quote.show_item_prices &&
    (quote.adversity_fee_cents > 0 || quote.discount_cents > 0)
  ) {
    lines.push(`Subtotal: ${formatCentsToBRL(quote.subtotal_cents)}`);

    if (quote.adversity_fee_cents > 0) {
      const reasonSuffix = quote.adversity_reason
        ? ` (${quote.adversity_reason})`
        : "";
      lines.push(
        `Taxa de adversidades${reasonSuffix}: ${formatCentsToBRL(quote.adversity_fee_cents)}`,
      );
    }

    if (quote.discount_cents > 0) {
      lines.push(`Desconto: -${formatCentsToBRL(quote.discount_cents)}`);
    }
  }

  lines.push(`Valor total: ${formatCentsToBRL(quote.total_cents)}`);

  if (quote.valid_until) {
    lines.push(`Validade: ${formatDateBR(quote.valid_until)}`);
  }

  if (quote.payment_terms) {
    lines.push(`Condições de pagamento: ${quote.payment_terms}`);
  }

  if (quote.notes) {
    lines.push(`Observações: ${quote.notes}`);
  }

  const trimmedBusiness = businessName?.trim();
  if (trimmedBusiness) {
    lines.push("", trimmedBusiness);
  }

  return lines.join("\n");
}
