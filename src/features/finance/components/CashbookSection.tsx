import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionFormSheet } from "@/features/finance/components/TransactionFormSheet";
import {
  useDeleteTransaction,
  useMonthlyTransactions,
  useSetTransactionStatus,
} from "@/features/finance/hooks/useFinance";
import {
  formatDateBR,
  formatMonthYearBR,
  getCurrentBillingMonth,
  getTodayISODate,
  shiftBillingMonth,
} from "@/lib/dates";
import {
  calculateCashbookSummary,
  getTransactionSourceKind,
  isTransactionOverdue,
  isValidBillingMonth,
} from "@/lib/finance";
import { formatCentsToBRL } from "@/lib/money";
import { DIRECTIONAL_SHIFT_PX, PAGE_TRANSITION } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { FinancialTransaction } from "@/services/finance.service";

type CashbookFilter =
  | "all"
  | "pending"
  | "overdue"
  | "paid"
  | "income"
  | "expense";

const CASHBOOK_FILTER_OPTIONS: ReadonlyArray<{
  value: CashbookFilter;
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "overdue", label: "Atrasados" },
  { value: "paid", label: "Quitados" },
  { value: "income", label: "Receitas" },
  { value: "expense", label: "Despesas" },
];

const EMPTY_FILTER_LABELS: Record<Exclude<CashbookFilter, "all">, string> = {
  pending: "Nenhum lançamento pendente",
  overdue: "Nenhum lançamento atrasado",
  paid: "Nenhum lançamento quitado",
  income: "Nenhuma receita neste mês",
  expense: "Nenhuma despesa neste mês",
};

function parseCashbookFilter(raw: string | null): CashbookFilter | null {
  if (
    raw === "all" ||
    raw === "pending" ||
    raw === "overdue" ||
    raw === "paid" ||
    raw === "income" ||
    raw === "expense"
  ) {
    return raw;
  }
  return null;
}

export function CashbookSection() {
  const currentBillingMonth = getCurrentBillingMonth();
  const todayIso = getTodayISODate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawMonthParam = searchParams.get("month");
  const billingMonth =
    rawMonthParam && isValidBillingMonth(rawMonthParam)
      ? rawMonthParam
      : currentBillingMonth;
  const filter = parseCashbookFilter(searchParams.get("filter")) ?? "all";

  const [monthDirection, setMonthDirection] = useState<-1 | 0 | 1>(0);
  const [search, setSearch] = useState("");

  function setBillingMonth(nextMonth: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextMonth === currentBillingMonth) {
      nextParams.delete("month");
    } else {
      nextParams.set("month", nextMonth);
    }
    setSearchParams(nextParams, { replace: true });
  }

  function setFilter(nextFilter: CashbookFilter) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextFilter === "all") {
      nextParams.delete("filter");
    } else {
      nextParams.set("filter", nextFilter);
    }
    setSearchParams(nextParams, { replace: true });
  }

  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<FinancialTransaction | null>(null);

  const {
    data: transactions = [],
    isLoading,
    isError,
    refetch,
  } = useMonthlyTransactions(billingMonth);
  const setTransactionStatus = useSetTransactionStatus();
  const deleteTransaction = useDeleteTransaction();

  const summary = useMemo(
    () => calculateCashbookSummary(transactions, todayIso),
    [transactions, todayIso],
  );

  const totalExpectedIncomeCents =
    summary.receivedIncomeCents + summary.pendingIncomeCents;
  const receivedRatioPercent =
    totalExpectedIncomeCents > 0
      ? Math.min(
          100,
          Math.round(
            (summary.receivedIncomeCents / totalExpectedIncomeCents) * 100,
          ),
        )
      : 0;

  const filterCounts = useMemo(() => {
    const counts: Record<CashbookFilter, number> = {
      all: transactions.length,
      pending: 0,
      overdue: 0,
      paid: 0,
      income: 0,
      expense: 0,
    };

    for (const transaction of transactions) {
      if (transaction.status === "pending") {
        counts.pending += 1;
        if (isTransactionOverdue(transaction, todayIso)) {
          counts.overdue += 1;
        }
      } else {
        counts.paid += 1;
      }

      if (transaction.type === "income") {
        counts.income += 1;
      } else {
        counts.expense += 1;
      }
    }

    return counts;
  }, [transactions, todayIso]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      if (filter === "pending" && transaction.status !== "pending") {
        return false;
      }

      if (filter === "overdue" && !isTransactionOverdue(transaction, todayIso)) {
        return false;
      }

      if (filter === "paid" && transaction.status !== "paid") {
        return false;
      }

      if (filter === "income" && transaction.type !== "income") {
        return false;
      }

      if (filter === "expense" && transaction.type !== "expense") {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = `${transaction.description} ${transaction.category ?? ""} ${transaction.notes ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [transactions, filter, search, todayIso]);

  const editingTransaction = useMemo(
    () => transactions.find((item) => item.id === editingTransactionId) ?? null,
    [transactions, editingTransactionId],
  );

  const monthLabel = formatMonthYearBR(billingMonth);
  const isCurrentMonth = billingMonth === currentBillingMonth;
  const hasSearch = search.trim().length > 0;

  function handleOpenCreate() {
    setEditingTransactionId(null);
    setFormSheetOpen(true);
  }

  function handleOpenEdit(transaction: FinancialTransaction) {
    if (transaction.quote_id) {
      return;
    }

    setEditingTransactionId(transaction.id);
    setFormSheetOpen(true);
  }

  async function handleToggleStatus(transaction: FinancialTransaction) {
    if (transaction.quote_id) {
      return;
    }

    const nextStatus = transaction.status === "paid" ? "pending" : "paid";
    setSettlingId(transaction.id);

    try {
      await setTransactionStatus.mutateAsync({
        id: transaction.id,
        status: nextStatus,
        type: transaction.type,
      });
    } catch {
      // Mutation onError already notifies the user via toast.
    } finally {
      setSettlingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTransaction) {
      return;
    }

    try {
      await deleteTransaction.mutateAsync(deletingTransaction.id);
      setDeletingTransaction(null);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="bg-white"
            aria-label="Mês anterior"
            onClick={() => {
              setMonthDirection(-1);
              setBillingMonth(shiftBillingMonth(billingMonth, -1));
            }}
          >
            <ChevronLeft
              className="h-4 w-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </Button>

          <motion.h2
            key={billingMonth}
            initial={
              monthDirection === 0
                ? false
                : { opacity: 0, x: monthDirection * DIRECTIONAL_SHIFT_PX }
            }
            animate={{ opacity: 1, x: 0 }}
            transition={PAGE_TRANSITION}
            className="min-w-0 flex-1 text-center text-base font-semibold text-zinc-950 tabular-nums"
          >
            {monthLabel}
          </motion.h2>

          <Button
            variant="secondary"
            size="icon"
            className="bg-white"
            aria-label="Próximo mês"
            onClick={() => {
              setMonthDirection(1);
              setBillingMonth(shiftBillingMonth(billingMonth, 1));
            }}
          >
            <ChevronRight
              className="h-4 w-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </Button>
        </div>

        {!isCurrentMonth ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                setMonthDirection(billingMonth > currentBillingMonth ? -1 : 1);
                setBillingMonth(currentBillingMonth);
              }}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-medium text-zinc-700 underline underline-offset-4 transition-colors hover:bg-zinc-200 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
            >
              Mês atual
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando Livro-Caixa</span>
          <div className="h-36 animate-pulse motion-reduce:animate-none rounded-xl bg-zinc-200/80" />
          <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-zinc-200/80" />
          <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl border border-zinc-200 bg-white" />
          <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl border border-zinc-200 bg-white" />
        </div>
      ) : isError ? (
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
            <span>Não foi possível carregar o Livro-Caixa.</span>
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
      ) : (
        <>
          <motion.section
            key={`summary-${billingMonth}`}
            initial={
              monthDirection === 0
                ? false
                : { opacity: 0, x: monthDirection * DIRECTIONAL_SHIFT_PX }
            }
            animate={{ opacity: 1, x: 0 }}
            transition={PAGE_TRANSITION}
            className="rounded-xl bg-neutral-950 p-4 text-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-zinc-300">
                  Saldo realizado
                </p>
                <p
                  className={cn(
                    "mt-1 text-3xl font-semibold tracking-tight tabular-nums",
                    summary.realizedBalanceCents < 0
                      ? "text-red-300"
                      : "text-white",
                  )}
                >
                  {formatCentsToBRL(summary.realizedBalanceCents)}
                </p>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-zinc-800 pt-3">
              <div>
                <dt className="text-xs text-zinc-300">Entradas</dt>
                <dd className="mt-0.5 text-sm font-semibold text-emerald-300 tabular-nums">
                  {formatCentsToBRL(summary.receivedIncomeCents)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-300">Saídas</dt>
                <dd className="mt-0.5 text-sm font-semibold text-white tabular-nums">
                  {formatCentsToBRL(summary.paidExpenseCents)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-300">Previsto</dt>
                <dd
                  className={cn(
                    "mt-0.5 text-sm font-semibold tabular-nums",
                    summary.projectedBalanceCents < 0
                      ? "text-red-300"
                      : "text-zinc-300",
                  )}
                >
                  {formatCentsToBRL(summary.projectedBalanceCents)}
                </dd>
              </div>
            </dl>

            <div className="mt-3.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-zinc-300">Recebido no mês</span>
                <span className="font-semibold text-white tabular-nums">
                  {receivedRatioPercent}% de{" "}
                  {formatCentsToBRL(totalExpectedIncomeCents)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-300 transition-[width] duration-300"
                  style={{ width: `${receivedRatioPercent}%` }}
                />
              </div>
            </div>

            {summary.overdueCount > 0 ? (
              <div
                role="status"
                className="mt-3 flex min-h-11 items-center justify-between gap-2 rounded-lg bg-red-800 px-3 py-1 text-xs text-red-100"
              >
                <div className="flex min-w-0 items-center gap-2 font-medium">
                  <AlertCircle
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="tabular-nums">
                    {summary.overdueCount === 1
                      ? "1 lançamento atrasado neste mês"
                      : `${summary.overdueCount} lançamentos atrasados neste mês`}
                  </span>
                </div>
                {filter !== "overdue" ? (
                  <button
                    type="button"
                    onClick={() => setFilter("overdue")}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-xs font-semibold text-red-100 underline underline-offset-2 hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                  >
                    Filtrar
                  </button>
                ) : null}
              </div>
            ) : null}
          </motion.section>

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
                  placeholder="Buscar lançamento ou categoria..."
                  aria-label="Buscar lançamento por descrição, categoria ou observação"
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
                    <X
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
              </div>

              <Button
                onClick={handleOpenCreate}
                aria-label="Novo lançamento"
                className="shrink-0 whitespace-nowrap"
              >
                <Plus
                  className="h-4 w-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>Novo</span>
              </Button>
            </div>

            <div
              role="group"
              aria-label="Filtrar lançamentos do mês"
              className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto scroll-smooth px-4 py-1"
            >
              {CASHBOOK_FILTER_OPTIONS.map((option) => {
                const isSelected = filter === option.value;
                const count = filterCounts[option.value];

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors tabular-nums",
                      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
                      isSelected
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100",
                    )}
                  >
                    <span>{option.label}</span>
                    <span
                      className={
                        isSelected ? "text-zinc-200" : "text-zinc-600"
                      }
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <EmptyState
              icon={
                <Wallet
                  className="h-5 w-5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              }
              title={
                transactions.length === 0
                  ? `Nenhum lançamento em ${monthLabel}`
                  : hasSearch
                    ? "Nenhum lançamento encontrado"
                    : filter === "all"
                      ? `Nenhum lançamento em ${monthLabel}`
                      : EMPTY_FILTER_LABELS[filter]
              }
              description={
                transactions.length === 0
                  ? "Registre receitas ou despesas manuais para acompanhar o saldo desta competência."
                  : hasSearch
                    ? "Nenhum lançamento deste mês corresponde à sua busca."
                    : "Não há lançamentos com este filtro no mês selecionado."
              }
              action={
                transactions.length === 0 ? (
                  <Button onClick={handleOpenCreate}>
                    Registrar lançamento
                  </Button>
                ) : hasSearch ? (
                  <Button variant="secondary" onClick={() => setSearch("")}>
                    Limpar busca
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setFilter("all")}
                  >
                    Ver todos
                  </Button>
                )
              }
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {filteredTransactions.map((transaction) => {
                const sourceKind = getTransactionSourceKind(transaction);
                const overdue = isTransactionOverdue(transaction, todayIso);
                const isIncome = transaction.type === "income";
                const isPaid = transaction.status === "paid";

                return (
                  <li
                    key={transaction.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isPaid ? (
                            <Badge variant="success">
                              {isIncome ? "Recebido" : "Pago"}
                            </Badge>
                          ) : overdue ? (
                            <Badge variant="danger">Atrasado</Badge>
                          ) : (
                            <Badge variant="warning">Pendente</Badge>
                          )}

                          {sourceKind === "quote" ? (
                            <Badge variant="info">Orçamento</Badge>
                          ) : null}
                          {sourceKind === "contract" ? (
                            <Badge variant="neutral">Contrato</Badge>
                          ) : null}
                          {sourceKind === "recurring_expense" ? (
                            <Badge variant="neutral">Despesa fixa</Badge>
                          ) : null}
                        </div>

                        <h3 className="mt-1.5 break-words text-base font-medium text-neutral-950">
                          {transaction.description}
                        </h3>

                        {transaction.category ? (
                          <p className="mt-0.5 text-xs text-neutral-600">
                            {transaction.category}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            "text-base font-semibold tabular-nums",
                            isIncome ? "text-emerald-800" : "text-neutral-950",
                          )}
                        >
                          {isIncome ? "+" : "-"}{" "}
                          {formatCentsToBRL(transaction.amount_cents)}
                        </p>
                      </div>
                    </div>

                    {transaction.notes ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-600">
                        {transaction.notes}
                      </p>
                    ) : null}

                    <p className="mt-2 text-xs text-neutral-500 tabular-nums">
                      Vence {formatDateBR(transaction.due_date)}
                      {isPaid && transaction.paid_at
                        ? ` · ${isIncome ? "Recebido" : "Pago"} em ${formatDateBR(transaction.paid_at)}`
                        : ""}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      {sourceKind === "manual" ? (
                        <Button
                          variant="danger"
                          size="icon"
                          aria-label={`Excluir lançamento ${transaction.description}`}
                          onClick={() => setDeletingTransaction(transaction)}
                        >
                          <Trash2
                            className="h-4 w-4"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                        </Button>
                      ) : (
                        <div aria-hidden="true" />
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {sourceKind === "quote" && transaction.quote_id ? (
                          <Link
                            to={`/quotes/${transaction.quote_id}`}
                            aria-label={`Abrir orçamento de ${transaction.description}`}
                            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-zinc-500 bg-zinc-100 px-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 active:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                          >
                            <FileText
                              className="h-4 w-4 shrink-0"
                              strokeWidth={1.75}
                              aria-hidden="true"
                            />
                            <span>Abrir orçamento</span>
                          </Link>
                        ) : (
                          <>
                            {!isPaid ? (
                              <Button
                                variant="primary"
                                aria-label={
                                  isIncome
                                    ? `Confirmar recebimento de ${transaction.description}`
                                    : `Confirmar pagamento de ${transaction.description}`
                                }
                                isLoading={settlingId === transaction.id}
                                onClick={() => {
                                  void handleToggleStatus(transaction);
                                }}
                              >
                                <Check
                                  className="h-4 w-4 shrink-0"
                                  strokeWidth={1.75}
                                  aria-hidden="true"
                                />
                                <span>{isIncome ? "Receber" : "Pagar"}</span>
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                aria-label={`Reabrir lançamento ${transaction.description}`}
                                isLoading={settlingId === transaction.id}
                                onClick={() => {
                                  void handleToggleStatus(transaction);
                                }}
                              >
                                Reabrir
                              </Button>
                            )}

                            <Button
                              variant="secondary"
                              aria-label={`Editar lançamento ${transaction.description}`}
                              onClick={() => handleOpenEdit(transaction)}
                            >
                              Editar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <TransactionFormSheet
        open={formSheetOpen}
        onOpenChange={(nextOpen) => {
          setFormSheetOpen(nextOpen);
          if (!nextOpen) {
            setEditingTransactionId(null);
          }
        }}
        transaction={editingTransaction}
        defaultBillingMonth={billingMonth}
        defaultType={filter === "expense" ? "expense" : "income"}
      />

      <ConfirmSheet
        open={deletingTransaction !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeletingTransaction(null);
          }
        }}
        title="Excluir lançamento"
        description={
          deletingTransaction
            ? `Deseja excluir "${deletingTransaction.description}" do Livro-Caixa? Esta ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Excluir"
        confirmVariant="danger"
        isLoading={deleteTransaction.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
