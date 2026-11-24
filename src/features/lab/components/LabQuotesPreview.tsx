import { useMemo, useState } from "react";
import { Bell, ChevronRight, FileText, Plus, Search, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  LAB_QUOTES,
  type LabQuoteItem,
  type LabQuoteStatus,
} from "@/features/lab/labMockData";
import type { LabCardStyle, LabThemeSpec } from "@/features/lab/labThemes";
import { formatCentsToBRL } from "@/lib/money";

interface LabQuotesPreviewProps {
  theme: LabThemeSpec;
  cardStyle: LabCardStyle;
  onInspectQuote: (quote: LabQuoteItem) => void;
  onOpenBellNotice: () => void;
}

type LabFilter = "all" | LabQuoteStatus;

const FILTER_OPTIONS: ReadonlyArray<{ value: LabFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "completed", label: "Concluídos" },
  { value: "sent", label: "Enviados" },
  { value: "approved", label: "Aprovados" },
  { value: "paid", label: "Pagos" },
];

export function LabQuotesPreview({
  theme,
  cardStyle,
  onInspectQuote,
  onOpenBellNotice,
}: LabQuotesPreviewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LabFilter>("all");

  const filteredQuotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return LAB_QUOTES.filter((quote) => {
      if (filter !== "all" && quote.status !== filter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = `${quote.clientName} ${quote.title} ${quote.number}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [search, filter]);

  return (
    <section
      aria-label="Prévia da tela de Orçamentos"
      className="overflow-hidden rounded-2xl border"
      style={{
        backgroundColor: theme.canvasBg,
        borderColor: theme.borderSubtle,
        color: theme.textPrimary,
      }}
    >
      <div
        className="flex h-14 items-center justify-between gap-3 border-b px-4"
        style={{
          backgroundColor: theme.headerBg,
          borderColor: theme.borderSubtle,
        }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandLogo size="sm" className="shrink-0" />
          <span
            aria-hidden="true"
            className="h-4 w-px shrink-0"
            style={{ backgroundColor: theme.borderSubtle }}
          />
          <h2
            className="truncate text-base font-semibold"
            style={{ color: theme.textPrimary }}
          >
            Orçamentos
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenBellNotice}
            aria-label="Abrir prévia do painel"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.borderStrong,
              color: theme.textPrimary,
            }}
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute -top-1.5 -right-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-[11px] leading-none font-semibold text-white tabular-nums"
              style={{
                backgroundColor: theme.accentBg,
                borderColor: theme.headerBg,
              }}
            >
              2
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenBellNotice}
            aria-label="Prévia de perfil"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.borderStrong,
              color: theme.textPrimary,
            }}
          >
            <UserRound className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              strokeWidth={1.75}
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
              style={{ color: theme.textSecondary }}
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente, serviço ou #..."
              aria-label="Buscar orçamento na prévia"
              className="min-h-11 w-full rounded-lg border py-2.5 pr-11 pl-10 text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.borderStrong,
                color: theme.textPrimary,
              }}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpar busca na prévia"
                className="absolute top-1/2 right-0 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
                style={{ color: theme.textSecondary }}
              >
                <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => onInspectQuote(LAB_QUOTES[0])}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition-transform active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            style={{
              backgroundColor: theme.accentBg,
              color: theme.accentTextOnAccent,
              boxShadow: theme.tactileAccentShadow,
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            <span>Novo</span>
          </button>
        </div>

        <div
          role="group"
          aria-label="Filtrar orçamentos da prévia"
          className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5"
        >
          {FILTER_OPTIONS.map((option) => {
            const isSelected = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setFilter(option.value)}
                className="inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
                style={
                  isSelected
                    ? {
                        backgroundColor: theme.accentSoftBg,
                        borderColor: theme.accentInk,
                        color: theme.accentSoftText,
                      }
                    : {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.borderSubtle,
                        color: theme.textSecondary,
                      }
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {filteredQuotes.length === 0 ? (
          <EmptyState
            icon={
              <FileText className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            }
            title="Nenhum orçamento encontrado"
            description="Limpe a busca ou troque o filtro para visualizar os exemplos."
            action={
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                style={{
                  backgroundColor: theme.secondaryBtnBg,
                  borderColor: theme.secondaryBtnBorder,
                  color: theme.secondaryBtnText,
                }}
              >
                Limpar filtros
              </button>
            }
          />
        ) : cardStyle === "cards" ? (
          <ul className="flex flex-col gap-2.5">
            {filteredQuotes.map((quote) => (
              <li key={quote.id}>
                <button
                  type="button"
                  onClick={() => onInspectQuote(quote)}
                  className="flex min-h-11 w-full items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.borderSubtle,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-xs font-semibold tabular-nums"
                        style={{ color: theme.accentInk }}
                      >
                        {quote.number}
                      </span>
                      <Badge variant={quote.badgeVariant}>
                        {quote.statusLabel}
                      </Badge>
                    </div>

                    <p
                      className="mt-1.5 truncate text-base font-semibold"
                      style={{ color: theme.textPrimary }}
                    >
                      {quote.clientName}
                    </p>
                    <p
                      className="mt-0.5 truncate text-xs"
                      style={{ color: theme.textSecondary }}
                    >
                      {quote.title}
                    </p>
                    <p
                      className="mt-2 text-xs tabular-nums"
                      style={{ color: theme.textSecondary }}
                    >
                      {quote.itemsCount} itens · {quote.dateLabel}
                      {quote.validUntilLabel
                        ? ` · Válido até ${quote.validUntilLabel}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 pt-0.5">
                    <span
                      className="text-base font-semibold tabular-nums"
                      style={{ color: theme.textPrimary }}
                    >
                      {formatCentsToBRL(quote.totalCents)}
                    </span>
                    <ChevronRight
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                      style={{ color: theme.textSecondary }}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul
            className="divide-y overflow-hidden rounded-xl border"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.borderSubtle,
            }}
          >
            {filteredQuotes.map((quote) => (
              <li
                key={quote.id}
                style={{ borderColor: theme.borderSubtle }}
              >
                <button
                  type="button"
                  onClick={() => onInspectQuote(quote)}
                  className="flex min-h-11 w-full items-start justify-between gap-3 px-3.5 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-xs font-semibold tabular-nums"
                        style={{ color: theme.accentInk }}
                      >
                        {quote.number}
                      </span>
                      <Badge variant={quote.badgeVariant}>
                        {quote.statusLabel}
                      </Badge>
                    </div>

                    <p
                      className="mt-1.5 truncate text-base font-semibold"
                      style={{ color: theme.textPrimary }}
                    >
                      {quote.clientName}
                    </p>
                    <p
                      className="mt-0.5 truncate text-xs"
                      style={{ color: theme.textSecondary }}
                    >
                      {quote.title}
                    </p>
                    <p
                      className="mt-1.5 text-xs tabular-nums"
                      style={{ color: theme.textSecondary }}
                    >
                      {quote.itemsCount} itens · {quote.dateLabel}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 pt-0.5">
                    <span
                      className="text-base font-semibold tabular-nums"
                      style={{ color: theme.textPrimary }}
                    >
                      {formatCentsToBRL(quote.totalCents)}
                    </span>
                    <ChevronRight
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                      style={{ color: theme.textSecondary }}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
