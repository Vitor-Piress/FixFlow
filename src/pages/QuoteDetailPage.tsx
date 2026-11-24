import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  FileText,
  Lock,
  MessageCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuoteAdjustmentsSheet } from "@/features/quotes/components/QuoteAdjustmentsSheet";
import { QuoteFormSheet } from "@/features/quotes/components/QuoteFormSheet";
import { QuoteItemFormSheet } from "@/features/quotes/components/QuoteItemFormSheet";
import { QuotePaymentsSheet } from "@/features/quotes/components/QuotePaymentsSheet";
import { QuotePreviewSheet } from "@/features/quotes/components/QuotePreviewSheet";
import { QuoteStatusSheet } from "@/features/quotes/components/QuoteStatusSheet";
import {
  formatQuoteNumber,
  isQuoteEditable,
  isQuotePaid,
  QUOTE_STATUS_META,
} from "@/features/quotes/constants/quoteStatus";
import {
  useDeleteQuote,
  useDeleteQuoteItem,
  useQuote,
  useSetQuotePaymentStatus,
  useUpdateQuoteStatus,
} from "@/features/quotes/hooks/useQuotes";
import { formatDateBR, getTodayISODate } from "@/lib/dates";
import { formatCentsToBRL } from "@/lib/money";
import {
  formatPaymentModeHeadline,
  getQuotePaymentProgress,
  isQuotePaymentOverdue,
} from "@/lib/quotePayments";
import { formatQuantityBR, formatUnitShort } from "@/lib/units";
import { buildWhatsAppUrl, formatPhoneBR } from "@/lib/utils";
import type {
  QuoteItem,
  QuoteItemType,
  QuotePayment,
} from "@/services/quotes.service";

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: quote, isLoading, isError, refetch } = useQuote(id);
  const updateStatus = useUpdateQuoteStatus();
  const deleteQuote = useDeleteQuote();
  const deleteQuoteItem = useDeleteQuoteItem();
  const setPaymentStatus = useSetQuotePaymentStatus();

  const [headerSheetOpen, setHeaderSheetOpen] = useState(false);
  const [adjustmentsSheetOpen, setAdjustmentsSheetOpen] = useState(false);
  const [paymentsSheetOpen, setPaymentsSheetOpen] = useState(false);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [settlingPaymentId, setSettlingPaymentId] = useState<string | null>(
    null,
  );

  const [itemSheetOpen, setItemSheetOpen] = useState(false);
  const [defaultItemType, setDefaultItemType] =
    useState<QuoteItemType>("service");
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<QuoteItem | null>(null);

  const [confirmMarkPaidOpen, setConfirmMarkPaidOpen] = useState(false);
  const [confirmDeleteQuoteOpen, setConfirmDeleteQuoteOpen] = useState(false);

  useEffect(() => {
    if (!quote) {
      return;
    }

    document.title = `Orçamento ${formatQuoteNumber(quote.quote_number)} | FixFlow`;
  }, [quote]);

  function handleOpenAddItem(itemType: QuoteItemType) {
    setEditingItem(null);
    setDefaultItemType(itemType);
    setItemSheetOpen(true);
  }

  function handleOpenEditItem(item: QuoteItem) {
    setEditingItem(item);
    setDefaultItemType(item.item_type);
    setItemSheetOpen(true);
  }

  async function handleConfirmMarkPaid() {
    if (!quote || quote.total_cents <= 0) {
      return;
    }

    try {
      await updateStatus.mutateAsync({
        id: quote.id,
        status: "paid",
      });
      setConfirmMarkPaidOpen(false);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  async function handleConfirmDeleteItem() {
    if (!quote || !deletingItem) {
      return;
    }

    try {
      await deleteQuoteItem.mutateAsync({
        id: deletingItem.id,
        quoteId: quote.id,
      });
      setDeletingItem(null);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  async function handleTogglePaymentStatus(payment: QuotePayment) {
    if (!quote) {
      return;
    }

    const nextStatus = payment.status === "paid" ? "pending" : "paid";
    setSettlingPaymentId(payment.id);
    try {
      await setPaymentStatus.mutateAsync({
        paymentId: payment.id,
        quoteId: quote.id,
        status: nextStatus,
      });
    } catch {
      // Mutation onError already notifies the user via toast.
    } finally {
      setSettlingPaymentId(null);
    }
  }

  async function handleConfirmDeleteQuote() {
    if (!quote || isQuotePaid(quote.status)) {
      return;
    }

    try {
      await deleteQuote.mutateAsync(quote.id);
      setConfirmDeleteQuoteOpen(false);
      navigate("/quotes", { replace: true });
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">Carregando orçamento</span>
        <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-zinc-200/80" />
        <div className="h-32 animate-pulse motion-reduce:animate-none rounded-xl bg-zinc-200/80" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl border border-zinc-200 bg-white" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl border border-zinc-200 bg-white" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          to="/quotes"
          className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          Voltar para orçamentos
        </Link>

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
            <span>Não foi possível carregar este orçamento.</span>
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
      </div>
    );
  }

  if (!quote) {
    return (
      <EmptyState
        icon={
          <FileText className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        }
        title="Orçamento não encontrado"
        description="Este orçamento pode ter sido excluído ou o endereço informado não existe."
        action={
          <Link
            to="/quotes"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-500 bg-white px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
          >
            Voltar para orçamentos
          </Link>
        }
      />
    );
  }

  const statusMeta = QUOTE_STATUS_META[quote.status];
  const editable = isQuoteEditable(quote.status);
  const paid = isQuotePaid(quote.status);
  const canceled = quote.status === "canceled";
  const todayIso = getTodayISODate();
  const paymentProgress = getQuotePaymentProgress(
    quote.payments,
    quote.total_cents,
    todayIso,
  );
  const paymentProgressPercent =
    quote.total_cents > 0
      ? Math.min(
          100,
          Math.round((paymentProgress.paidCents / quote.total_cents) * 100),
        )
      : 0;
  const paymentHeadline = formatPaymentModeHeadline(
    quote.payment_mode,
    quote.payment_deposit_percent,
    quote.payment_installments_count,
    quote.payment_terms,
  );
  const nextSortOrder =
    quote.items.length > 0
      ? Math.max(...quote.items.map((item) => item.sort_order)) + 1
      : 0;
  const clientWhatsappUrl = buildWhatsAppUrl(quote.client_phone);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/quotes"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg pr-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          <span>Orçamentos</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-600 tabular-nums">
            {formatQuoteNumber(quote.quote_number)}
          </span>
          <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="rounded-xl bg-neutral-950 p-4 text-white">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-white">
              {quote.client_name}
            </h2>
            {quote.title ? (
              <p className="mt-0.5 text-sm text-zinc-300">{quote.title}</p>
            ) : null}
          </div>

          <div className="mt-4 border-t border-zinc-800 pt-3">
            <p className="text-xs font-medium text-zinc-300">Valor total</p>
            <p className="mt-0.5 text-3xl font-semibold tracking-tight text-white tabular-nums">
              {formatCentsToBRL(quote.total_cents)}
            </p>
            <p
              className={`mt-1 text-xs tabular-nums ${
                (paid && quote.paid_at) || paymentProgress.isPartiallyPaid
                  ? "text-emerald-300"
                  : "text-zinc-300"
              }`}
            >
              {paid && quote.paid_at
                ? `Pago em ${formatDateBR(quote.paid_at)}`
                : paymentProgress.isPartiallyPaid
                  ? `${paymentProgress.paidCount}/${paymentProgress.totalCount} pago · Recebido ${formatCentsToBRL(paymentProgress.paidCents)} · Restam ${formatCentsToBRL(paymentProgress.remainingCents)}`
                  : quote.status === "completed"
                    ? "Serviço concluído, aguardando pagamento"
                    : quote.show_item_prices
                      ? "Preços unitários visíveis na prévia do cliente"
                      : "Somente o valor total visível na prévia do cliente"}
            </p>
          </div>
        </div>

        {paid ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs leading-relaxed text-emerald-800">
            <Lock
              className="mt-0.5 h-4 w-4 shrink-0"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>
              Orçamento pago e lançado no Livro-Caixa. Edição de itens, ajustes
              e exclusão estão bloqueados.
            </span>
          </div>
        ) : null}

        {canceled ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-700">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>
              Orçamento cancelado em modo somente leitura. Use Alterar status
              para reabrir como rascunho.
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            className="flex-1"
            onClick={() => setPreviewSheetOpen(true)}
          >
            <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Prévia do cliente</span>
          </Button>

          {!paid ? (
            <Button
              variant="secondary"
              className="flex-1 bg-white"
              onClick={() => setStatusSheetOpen(true)}
            >
              Alterar status
            </Button>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-950">
            Itens do orçamento
          </h3>
          <span className="text-xs font-medium text-zinc-600 tabular-nums">
            {quote.items.length === 1
              ? "1 item"
              : `${quote.items.length} itens`}
          </span>
        </div>

        {editable ? (
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="secondary"
              className="bg-white"
              onClick={() => handleOpenAddItem("service")}
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Serviço</span>
            </Button>
            <Button
              variant="secondary"
              className="bg-white"
              onClick={() => handleOpenAddItem("material")}
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Material</span>
            </Button>
          </div>
        ) : null}

        {quote.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-7 text-center">
            <p className="text-sm font-medium text-zinc-950">
              Nenhum item adicionado
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {editable
                ? "Adicione serviços ou materiais acima para calcular o valor do orçamento."
                : "Este orçamento não possui itens registrados."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {quote.items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-950">
                      {item.description_snapshot}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600 tabular-nums">
                      {item.item_type === "service" ? "Serviço" : "Material"} ·{" "}
                      {formatQuantityBR(item.quantity)}{" "}
                      {formatUnitShort(item.unit_snapshot)} ×{" "}
                      {formatCentsToBRL(item.unit_price_snapshot_cents)}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-semibold text-zinc-950 tabular-nums">
                    {formatCentsToBRL(item.subtotal_cents)}
                  </p>
                </div>

                {editable ? (
                  <div className="mt-2.5 flex items-center justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleOpenEditItem(item)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="icon"
                      aria-label={`Remover ${item.description_snapshot}`}
                      onClick={() => setDeletingItem(item)}
                    >
                      <Trash2
                        className="h-4 w-4"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-950">
            Resumo financeiro
          </h3>
          {editable ? (
            <Button
              variant="secondary"
              className="bg-white"
              onClick={() => setAdjustmentsSheetOpen(true)}
            >
              Ajustar valores
            </Button>
          ) : null}
        </div>

        <dl className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white px-4 text-sm">
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-zinc-600">Subtotal dos itens</dt>
            <dd className="font-medium text-zinc-950 tabular-nums">
              {formatCentsToBRL(quote.subtotal_cents)}
            </dd>
          </div>

          {quote.adversity_fee_cents > 0 ? (
            <div className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <dt className="text-zinc-600">Taxa de adversidades</dt>
                {quote.adversity_reason ? (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {quote.adversity_reason}
                  </p>
                ) : null}
              </div>
              <dd className="shrink-0 font-medium text-zinc-950 tabular-nums">
                + {formatCentsToBRL(quote.adversity_fee_cents)}
              </dd>
            </div>
          ) : null}

          {quote.discount_cents > 0 ? (
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-zinc-600">Desconto</dt>
              <dd className="font-medium text-zinc-950 tabular-nums">
                - {formatCentsToBRL(quote.discount_cents)}
              </dd>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="font-semibold text-zinc-950">Total global</dt>
            <dd className="text-base font-semibold text-zinc-950 tabular-nums">
              {formatCentsToBRL(quote.total_cents)}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-zinc-600">Exibição ao cliente</dt>
            <dd className="text-right font-medium text-zinc-950">
              {quote.show_item_prices
                ? "Preços por item e total"
                : "Somente valor total"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-950">Pagamentos</h3>
          {editable ? (
            <Button
              variant="secondary"
              className="bg-white"
              onClick={() => setPaymentsSheetOpen(true)}
            >
              Configurar
            </Button>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-950">
                {paymentHeadline}
              </p>
              {quote.payment_terms && quote.payment_mode !== "custom" ? (
                <p className="mt-0.5 text-xs text-zinc-600">
                  {quote.payment_terms}
                </p>
              ) : null}
            </div>
            {paymentProgress.totalCount > 1 ? (
              <span className="shrink-0 text-xs font-medium text-zinc-600 tabular-nums">
                {paymentProgress.paidCount}/{paymentProgress.totalCount} pagas
              </span>
            ) : null}
          </div>

          {paymentProgress.totalCount > 1 && quote.total_cents > 0 ? (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-emerald-800 transition-[width] duration-300"
                  style={{ width: `${paymentProgressPercent}%` }}
                />
              </div>
            </div>
          ) : null}

          {quote.payments.length === 0 ? (
            <p className="mt-3 border-t border-zinc-200 pt-3 text-xs leading-relaxed text-zinc-600">
              {quote.total_cents === 0
                ? "Adicione itens ao orçamento para calcular os valores das parcelas."
                : "Nenhuma parcela estruturada ainda. Toque em Configurar para definir datas e entradas."}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-200 border-t border-zinc-200">
              {quote.payments.map((payment) => {
                const isPaymentPaid = payment.status === "paid";
                const isPaymentOverdue = isQuotePaymentOverdue(
                  payment,
                  todayIso,
                );
                const canToggle =
                  !canceled &&
                  quote.total_cents > 0 &&
                  payment.amount_cents > 0;

                return (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-3 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-zinc-950">
                          {payment.label}
                        </span>
                        {isPaymentPaid ? (
                          <Badge variant="success">Recebido</Badge>
                        ) : isPaymentOverdue ? (
                          <Badge variant="danger">Atrasado</Badge>
                        ) : (
                          <Badge variant="warning">Pendente</Badge>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-zinc-600 tabular-nums">
                        {isPaymentPaid && payment.paid_at
                          ? `Recebido em ${formatDateBR(payment.paid_at)}`
                          : payment.due_date
                            ? `Vence ${formatDateBR(payment.due_date)}`
                            : "Data não definida"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className="text-sm font-semibold text-zinc-950 tabular-nums">
                        {quote.total_cents > 0
                          ? formatCentsToBRL(payment.amount_cents)
                          : "A calcular"}
                      </span>

                      {canToggle ? (
                        isPaymentPaid ? (
                          <Button
                            variant="secondary"
                            aria-label={`Reabrir ${payment.label}`}
                            isLoading={settlingPaymentId === payment.id}
                            onClick={() => {
                              void handleTogglePaymentStatus(payment);
                            }}
                          >
                            Reabrir
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            aria-label={`Confirmar recebimento de ${payment.label}`}
                            isLoading={settlingPaymentId === payment.id}
                            onClick={() => {
                              void handleTogglePaymentStatus(payment);
                            }}
                          >
                            <Check
                              className="h-4 w-4 shrink-0"
                              strokeWidth={1.75}
                              aria-hidden="true"
                            />
                            <span>Receber</span>
                          </Button>
                        )
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-950">
            Cliente e condições
          </h3>
          {editable ? (
            <Button
              variant="secondary"
              className="bg-white"
              onClick={() => setHeaderSheetOpen(true)}
            >
              Editar dados
            </Button>
          ) : null}
        </div>

        <dl className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white px-4 text-sm">
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-zinc-600">Telefone</dt>
            <dd className="flex items-center gap-2 text-right font-medium text-zinc-950 tabular-nums">
              <span>
                {quote.client_phone
                  ? formatPhoneBR(quote.client_phone)
                  : "Não informado"}
              </span>
              {clientWhatsappUrl ? (
                <a
                  href={clientWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Conversar com ${quote.client_name} no WhatsApp`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-500 bg-zinc-100 text-zinc-950 transition-colors hover:bg-zinc-200 active:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                >
                  <MessageCircle
                    className="h-4 w-4"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </a>
              ) : null}
            </dd>
          </div>

          {quote.client_address ? (
            <div className="flex flex-col gap-1 py-3">
              <dt className="text-xs text-zinc-600">Endereço</dt>
              <dd className="text-zinc-950">{quote.client_address}</dd>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-zinc-600">Emissão</dt>
            <dd className="font-medium text-zinc-950 tabular-nums">
              {formatDateBR(quote.created_at)}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-zinc-600">Validade</dt>
            <dd className="font-medium text-zinc-950 tabular-nums">
              {quote.valid_until
                ? formatDateBR(quote.valid_until)
                : "Não definida"}
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-3">
            <dt className="text-xs text-zinc-600">
              Condições de pagamento
            </dt>
            <dd className="text-zinc-950">{paymentHeadline}</dd>
            {quote.payment_terms && quote.payment_mode !== "custom" ? (
              <dd className="text-xs text-zinc-600">{quote.payment_terms}</dd>
            ) : null}
          </div>

          {quote.notes ? (
            <div className="flex flex-col gap-1 py-3">
              <dt className="text-xs text-zinc-600">Observações</dt>
              <dd className="whitespace-pre-line text-zinc-950">
                {quote.notes}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {!paid ? (
        <section className="pt-2">
          <Button
            variant="danger"
            className="w-full"
            onClick={() => setConfirmDeleteQuoteOpen(true)}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Excluir orçamento</span>
          </Button>
        </section>
      ) : null}

      <QuoteFormSheet
        open={headerSheetOpen}
        onOpenChange={setHeaderSheetOpen}
        quote={quote}
      />

      <QuoteItemFormSheet
        open={itemSheetOpen}
        onOpenChange={setItemSheetOpen}
        quoteId={quote.id}
        quoteStatus={quote.status}
        defaultItemType={defaultItemType}
        item={editingItem}
        nextSortOrder={nextSortOrder}
      />

      <QuoteAdjustmentsSheet
        open={adjustmentsSheetOpen}
        onOpenChange={setAdjustmentsSheetOpen}
        quote={quote}
      />

      <QuotePaymentsSheet
        open={paymentsSheetOpen}
        onOpenChange={setPaymentsSheetOpen}
        quote={quote}
      />

      <QuoteStatusSheet
        open={statusSheetOpen}
        onOpenChange={setStatusSheetOpen}
        quote={quote}
        onRequestMarkPaid={() => setConfirmMarkPaidOpen(true)}
      />

      <QuotePreviewSheet
        open={previewSheetOpen}
        onOpenChange={setPreviewSheetOpen}
        quote={quote}
      />

      <ConfirmSheet
        open={confirmMarkPaidOpen}
        onOpenChange={setConfirmMarkPaidOpen}
        title="Marcar orçamento como pago"
        description={
          paymentProgress.pendingCount > 1
            ? `Confirmar recebimento integral de ${formatCentsToBRL(quote.total_cents)}? As ${paymentProgress.pendingCount} parcelas em aberto serão quitadas no Livro-Caixa e este orçamento ficará bloqueado para edições.`
            : `Confirmar recebimento de ${formatCentsToBRL(quote.total_cents)}? Uma receita paga será registrada automaticamente no Livro-Caixa e este orçamento ficará bloqueado em modo somente leitura.`
        }
        confirmLabel="Confirmar pagamento"
        confirmVariant="primary"
        isLoading={updateStatus.isPending}
        onConfirm={handleConfirmMarkPaid}
      />

      <ConfirmSheet
        open={deletingItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingItem(null);
          }
        }}
        title="Remover item"
        description={
          deletingItem
            ? `Deseja remover "${deletingItem.description_snapshot}" deste orçamento? O total será recalculado automaticamente.`
            : ""
        }
        confirmLabel="Remover"
        isLoading={deleteQuoteItem.isPending}
        onConfirm={handleConfirmDeleteItem}
      />

      <ConfirmSheet
        open={confirmDeleteQuoteOpen}
        onOpenChange={setConfirmDeleteQuoteOpen}
        title="Excluir orçamento"
        description={`Deseja excluir o orçamento ${formatQuoteNumber(quote.quote_number)} de "${quote.client_name}"? Todos os itens vinculados também serão removidos.`}
        confirmLabel="Excluir"
        isLoading={deleteQuote.isPending}
        onConfirm={handleConfirmDeleteQuote}
      />
    </div>
  );
}
