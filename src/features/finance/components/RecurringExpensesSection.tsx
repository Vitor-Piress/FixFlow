import { useMemo, useState } from "react";
import { AlertCircle, Plus, Repeat, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecurringExpenseFormSheet } from "@/features/finance/components/RecurringExpenseFormSheet";
import {
  useRecurringExpenses,
  useToggleRecurringExpenseActive,
} from "@/features/finance/hooks/useFinance";
import { formatCentsToBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { RecurringExpense } from "@/services/finance.service";

type RecurringStatusFilter = "active" | "inactive";

export function RecurringExpensesSection() {
  const {
    data: expenses = [],
    isLoading,
    isError,
    refetch,
  } = useRecurringExpenses();
  const toggleActive = useToggleRecurringExpenseActive();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<RecurringStatusFilter>("active");

  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [deactivatingExpense, setDeactivatingExpense] =
    useState<RecurringExpense | null>(null);

  const summary = useMemo(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    let activeMonthlyTotalCents = 0;

    for (const expense of expenses) {
      if (expense.is_active) {
        activeCount += 1;
        activeMonthlyTotalCents += expense.amount_cents;
      } else {
        inactiveCount += 1;
      }
    }

    return {
      activeCount,
      inactiveCount,
      activeMonthlyTotalCents,
    };
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const targetActive = statusFilter === "active";
    const query = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      if (expense.is_active !== targetActive) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = `${expense.description} ${expense.category}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [expenses, statusFilter, search]);

  const editingExpense = useMemo(
    () => expenses.find((item) => item.id === editingExpenseId) ?? null,
    [expenses, editingExpenseId],
  );

  function handleOpenCreate() {
    setEditingExpenseId(null);
    setFormSheetOpen(true);
  }

  function handleOpenEdit(expense: RecurringExpense) {
    setEditingExpenseId(expense.id);
    setFormSheetOpen(true);
  }

  async function handleReactivate(expense: RecurringExpense) {
    setReactivatingId(expense.id);
    try {
      await toggleActive.mutateAsync({
        id: expense.id,
        isActive: true,
      });
    } catch {
      // Mutation onError already notifies the user via toast.
    } finally {
      setReactivatingId(null);
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivatingExpense) {
      return;
    }

    try {
      await toggleActive.mutateAsync({
        id: deactivatingExpense.id,
        isActive: false,
      });
      setDeactivatingExpense(null);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Carregando despesas fixas</span>
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl bg-zinc-200/80" />
        <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-zinc-200/80" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl border border-zinc-200 bg-white" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl border border-zinc-200 bg-white" />
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
          <span>Não foi possível carregar as despesas fixas.</span>
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
  const activeCountLabel =
    summary.activeCount === 1 ? "1 ativa" : `${summary.activeCount} ativas`;
  const inactiveCountLabel =
    summary.inactiveCount === 1
      ? "1 inativa"
      : `${summary.inactiveCount} inativas`;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl bg-neutral-950 p-4 text-white">
        <p className="text-xs font-medium text-zinc-300">
          Despesas fixas mensais
        </p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-white tabular-nums">
          {formatCentsToBRL(summary.activeMonthlyTotalCents)}
        </p>
        <p className="mt-1.5 text-xs text-zinc-300 tabular-nums">
          {expenses.length === 0
            ? "Cadastre gastos fixos para gerar pendências automaticamente todo mês."
            : summary.activeCount === 0
              ? `${inactiveCountLabel} no momento`
              : summary.inactiveCount > 0
                ? `${activeCountLabel} · ${inactiveCountLabel}`
                : activeCountLabel}
        </p>
      </section>

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
              placeholder="Buscar despesa ou categoria..."
              aria-label="Buscar despesa fixa por descrição ou categoria"
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
            onClick={handleOpenCreate}
            aria-label="Nova despesa fixa"
            className="shrink-0 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Nova</span>
          </Button>
        </div>

        <div
          role="group"
          aria-label="Filtrar despesas fixas por situação"
          className="flex items-center gap-2 py-1"
        >
          <button
            type="button"
            aria-pressed={statusFilter === "active"}
            onClick={() => setStatusFilter("active")}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors tabular-nums",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
              statusFilter === "active"
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100",
            )}
          >
            <span>Ativas</span>
            <span
              className={
                statusFilter === "active"
                  ? "text-zinc-200"
                  : "text-zinc-600"
              }
            >
              ({summary.activeCount})
            </span>
          </button>

          <button
            type="button"
            aria-pressed={statusFilter === "inactive"}
            onClick={() => setStatusFilter("inactive")}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors tabular-nums",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
              statusFilter === "inactive"
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100",
            )}
          >
            <span>Inativas</span>
            <span
              className={
                statusFilter === "inactive"
                  ? "text-zinc-200"
                  : "text-zinc-600"
              }
            >
              ({summary.inactiveCount})
            </span>
          </button>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon={
            <Repeat className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          }
          title={
            expenses.length === 0
              ? "Nenhuma despesa fixa cadastrada"
              : hasSearch
                ? "Nenhuma despesa encontrada"
                : statusFilter === "active"
                  ? "Nenhuma despesa fixa ativa"
                  : "Nenhuma despesa fixa inativa"
          }
          description={
            expenses.length === 0
              ? "Cadastre custos recorrentes como MEI, internet ou aluguel para lançá-los automaticamente todo mês."
              : hasSearch
                ? "Nenhuma despesa fixa corresponde à sua busca."
                : statusFilter === "active"
                  ? "Todas as despesas fixas cadastradas estão inativas no momento."
                  : "Despesas fixas desativadas ficam guardadas aqui caso precise reativá-las."
          }
          action={
            expenses.length === 0 ? (
              <Button onClick={handleOpenCreate}>Cadastrar despesa fixa</Button>
            ) : hasSearch ? (
              <Button variant="secondary" onClick={() => setSearch("")}>
                Limpar busca
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "active" ? "inactive" : "active",
                  )
                }
              >
                {statusFilter === "active" ? "Ver inativas" : "Ver ativas"}
              </Button>
            )
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filteredExpenses.map((expense) => {
            const dueDayLabel = `Dia ${String(expense.due_day).padStart(2, "0")}`;

            return (
              <li
                key={expense.id}
                className="rounded-xl border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-base font-medium text-neutral-950">
                        {expense.description}
                      </h2>
                      {!expense.is_active ? (
                        <Badge variant="warning">Inativa</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-neutral-600">
                      {expense.category}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-neutral-950 tabular-nums">
                      {formatCentsToBRL(expense.amount_cents)}
                    </p>
                    <p className="text-xs text-neutral-500 tabular-nums">
                      / mês · {dueDayLabel}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    aria-label={`Editar despesa fixa ${expense.description}`}
                    onClick={() => handleOpenEdit(expense)}
                  >
                    Editar
                  </Button>

                  {expense.is_active ? (
                    <Button
                      variant="ghost"
                      aria-label={`Desativar despesa fixa ${expense.description}`}
                      onClick={() => setDeactivatingExpense(expense)}
                    >
                      Desativar
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      aria-label={`Reativar despesa fixa ${expense.description}`}
                      isLoading={reactivatingId === expense.id}
                      onClick={() => {
                        void handleReactivate(expense);
                      }}
                    >
                      Reativar
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <RecurringExpenseFormSheet
        open={formSheetOpen}
        onOpenChange={(nextOpen) => {
          setFormSheetOpen(nextOpen);
          if (!nextOpen) {
            setEditingExpenseId(null);
          }
        }}
        expense={editingExpense}
      />

      <ConfirmSheet
        open={deactivatingExpense !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeactivatingExpense(null);
          }
        }}
        title="Desativar despesa fixa"
        description={
          deactivatingExpense
            ? `Deseja desativar "${deactivatingExpense.description}"? Novos lançamentos mensais deixarão de ser gerados, e os lançamentos já existentes no Livro-Caixa serão preservados.`
            : ""
        }
        confirmLabel="Desativar"
        confirmVariant="danger"
        isLoading={toggleActive.isPending}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
