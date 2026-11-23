import { useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  FileText,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuoteFormSheet } from "@/features/quotes/components/QuoteFormSheet";
import {
  formatQuoteNumber,
  QUOTE_STATUS_FILTER_OPTIONS,
  QUOTE_STATUS_META,
  type QuoteStatusFilter,
} from "@/features/quotes/constants/quoteStatus";
import { useQuotes } from "@/features/quotes/hooks/useQuotes";
import { formatDateBR } from "@/lib/dates";
import { formatCentsToBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Quote } from "@/services/quotes.service";

export function QuotesPage() {
  const navigate = useNavigate();
  const { data: quotes = [], isLoading, isError, refetch } = useQuotes();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>("all");
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const statusCounts = useMemo(() => {
    const counts: Record<QuoteStatusFilter, number> = {
      all: quotes.length,
      draft: 0,
      sent: 0,
      approved: 0,
      completed: 0,
      paid: 0,
      canceled: 0,
    };

    for (const quote of quotes) {
      counts[quote.status] += 1;
    }

    return counts;
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return quotes.filter((quote) => {
      if (statusFilter !== "all" && quote.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const formattedNumber = formatQuoteNumber(quote.quote_number);
      const haystack = `${quote.client_name} ${quote.title ?? ""} ${formattedNumber} ${quote.quote_number} ${quote.client_phone ?? ""} ${quote.client_address ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [quotes, statusFilter, search]);

  function handleQuoteCreated(created: Quote) {
    navigate(`/quotes/${created.id}`);
  }

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Carregando orçamentos</span>
        <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle
            className="h-4 w-4 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>Não foi possível carregar os orçamentos.</span>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            void refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const hasSearch = search.trim().length > 0;
  const activeStatusLabel =
    statusFilter === "all"
      ? "Todos"
      : QUOTE_STATUS_META[statusFilter].label;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              strokeWidth={1.75}
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente, serviço ou #..."
              aria-label="Buscar orçamento por cliente, serviço ou número"
              className={cn(
                "min-h-11 w-full rounded-lg border border-neutral-500 bg-white py-2.5 pr-11 pl-10 text-base text-neutral-950",
                "placeholder:text-neutral-500 transition-colors",
                "focus:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
              )}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-0 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
              >
                <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <Button
            onClick={() => setCreateSheetOpen(true)}
            aria-label="Novo orçamento"
            className="shrink-0 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Novo</span>
          </Button>
        </div>

        <div
          role="group"
          aria-label="Filtrar orçamentos por status"
          className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1"
        >
          {QUOTE_STATUS_FILTER_OPTIONS.map((option) => {
            const isSelected = statusFilter === option.value;
            const count = statusCounts[option.value];

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors tabular-nums",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
                  isSelected
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-500 bg-white text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100",
                )}
              >
                <span>{option.label}</span>
                <span
                  className={isSelected ? "text-neutral-200" : "text-neutral-600"}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredQuotes.length === 0 ? (
        <EmptyState
          icon={
            <FileText
              className="h-5 w-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          }
          title={
            quotes.length === 0
              ? "Nenhum orçamento cadastrado"
              : hasSearch
                ? "Nenhum orçamento encontrado"
                : `Nenhum orçamento em ${activeStatusLabel}`
          }
          description={
            quotes.length === 0
              ? "Monte propostas com serviços e materiais do seu catálogo e acompanhe até o pagamento."
              : hasSearch
                ? "Nenhum orçamento corresponde à sua busca."
                : "Não há orçamentos com este status no momento."
          }
          action={
            quotes.length === 0 ? (
              <Button onClick={() => setCreateSheetOpen(true)}>
                Criar orçamento
              </Button>
            ) : hasSearch ? (
              <Button variant="secondary" onClick={() => setSearch("")}>
                Limpar busca
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setStatusFilter("all")}
              >
                Ver todos
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200 bg-white">
          {filteredQuotes.map((quote) => {
            const statusMeta = QUOTE_STATUS_META[quote.status];
            const itemsLabel =
              quote.items_count === 1
                ? "1 item"
                : `${quote.items_count} itens`;

            return (
              <li key={quote.id}>
                <Link
                  to={`/quotes/${quote.id}`}
                  className="flex min-h-11 items-start justify-between gap-3 py-4 transition-colors hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-600 tabular-nums">
                        {formatQuoteNumber(quote.quote_number)}
                      </span>
                      <Badge variant={statusMeta.badgeVariant}>
                        {statusMeta.label}
                      </Badge>
                    </div>

                    <h2 className="mt-1.5 truncate text-base font-medium text-neutral-950">
                      {quote.client_name}
                    </h2>

                    {quote.title ? (
                      <p className="mt-0.5 truncate text-sm text-neutral-600">
                        {quote.title}
                      </p>
                    ) : null}

                    <p className="mt-1.5 text-xs text-neutral-500 tabular-nums">
                      {itemsLabel} · {formatDateBR(quote.created_at)}
                      {quote.valid_until &&
                      quote.status !== "paid" &&
                      quote.status !== "canceled"
                        ? ` · Válido até ${formatDateBR(quote.valid_until)}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                    <span className="text-base font-semibold text-neutral-950 tabular-nums">
                      {formatCentsToBRL(quote.total_cents)}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 text-neutral-500"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <QuoteFormSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        quote={null}
        onCreated={handleQuoteCreated}
      />
    </div>
  );
}
