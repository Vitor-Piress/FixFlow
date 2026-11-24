import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/Badge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useSaveQuotePaymentPlan } from "@/features/quotes/hooks/useQuotes";
import {
  quotePaymentPlanFormSchema,
  type QuotePaymentPlanFormValues,
  type QuotePaymentRowFormValue,
} from "@/features/quotes/schemas/quoteSchema";
import { formatDateBR, getTodayISODate } from "@/lib/dates";
import { formatCentsToBRL } from "@/lib/money";
import {
  addMonthsToISODate,
  buildPaymentScheduleDraft,
  calculateInstallmentAmounts,
  INSTALLMENT_COUNT_OPTIONS,
  PAYMENT_MODE_OPTIONS,
  SPLIT_PERCENT_PRESETS,
  type PaymentMode,
} from "@/lib/quotePayments";
import { cn, emptyStringToNull } from "@/lib/utils";
import type { QuoteWithItems } from "@/services/quotes.service";

interface QuotePaymentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteWithItems;
}

function buildInitialFormValues(
  quote: QuoteWithItems,
): QuotePaymentPlanFormValues {
  const sortedPayments = [...quote.payments].sort(
    (a, b) => a.installment_number - b.installment_number,
  );

  let rows: QuotePaymentRowFormValue[] = sortedPayments.map((payment) => ({
    id: payment.id,
    installment_number: payment.installment_number,
    label: payment.label,
    amount_cents: payment.amount_cents,
    due_date: payment.due_date ?? "",
    status: payment.status,
  }));

  if (rows.length === 0 && quote.payment_mode !== "custom") {
    const draft = buildPaymentScheduleDraft({
      mode: quote.payment_mode,
      totalCents: quote.total_cents,
      depositPercent: quote.payment_deposit_percent,
      installmentsCount: Math.max(2, quote.payment_installments_count || 2),
    });

    rows = draft.map((item) => ({
      installment_number: item.installment_number,
      label: item.label,
      amount_cents: item.amount_cents,
      due_date: item.due_date ?? "",
      status: "pending",
    }));
  }

  return {
    payment_mode: quote.payment_mode,
    payment_deposit_percent: quote.payment_deposit_percent,
    payment_installments_count: Math.max(
      2,
      quote.payment_installments_count || 2,
    ),
    payment_terms: quote.payment_terms ?? "",
    installments: rows,
  };
}

export function QuotePaymentsSheet({
  open,
  onOpenChange,
  quote,
}: QuotePaymentsSheetProps) {
  const savePlan = useSaveQuotePaymentPlan();

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<QuotePaymentPlanFormValues>({
    resolver: zodResolver(quotePaymentPlanFormSchema),
    defaultValues: buildInitialFormValues(quote),
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "installments",
    keyName: "fieldKey",
  });

  useEffect(() => {
    if (open) {
      reset(buildInitialFormValues(quote));
    }
  }, [open, quote, reset]);

  const watchedMode = useWatch({ control, name: "payment_mode" }) ?? "cash";
  const watchedDepositPercent =
    useWatch({ control, name: "payment_deposit_percent" }) ?? 50;
  const watchedInstallmentsCount =
    useWatch({ control, name: "payment_installments_count" }) ?? 2;
  const watchedInstallments = useWatch({ control, name: "installments" }) ?? [];

  const paidRows = watchedInstallments.filter((row) => row.status === "paid");
  const pendingRows = watchedInstallments.filter(
    (row) => row.status !== "paid",
  );
  const paidSumCents = paidRows.reduce(
    (acc, row) => acc + (row.amount_cents || 0),
    0,
  );
  const pendingSumCents = pendingRows.reduce(
    (acc, row) => acc + (row.amount_cents || 0),
    0,
  );
  const totalScheduledCents = paidSumCents + pendingSumCents;
  const remainingTargetCents = Math.max(0, quote.total_cents - paidSumCents);
  const diffCents = quote.total_cents - totalScheduledCents;

  const hasPaidRows = paidRows.length > 0;
  const isCustomEmptyAllowed =
    watchedMode === "custom" &&
    watchedInstallments.length === 0 &&
    paidRows.length === 0;
  const isBalanced =
    quote.total_cents === 0 || isCustomEmptyAllowed || diffCents === 0;

  function rebuildPendingSchedule(
    nextMode: PaymentMode,
    nextDepositPercent: number,
    nextCount: number,
  ) {
    const existingPendingDates = pendingRows.map((row) => row.due_date);
    const firstDate =
      existingPendingDates[0] ||
      watchedInstallments[0]?.due_date ||
      getTodayISODate();
    const secondDate = existingPendingDates[1] || "";

    if (nextMode === "custom") {
      if (pendingRows.length === 0 && remainingTargetCents > 0) {
        replace([
          ...paidRows,
          {
            installment_number: paidRows.length + 1,
            label: paidRows.length > 0 ? "Saldo restante" : "Parcela 1",
            amount_cents: remainingTargetCents,
            due_date: firstDate,
            status: "pending",
          },
        ]);
      }
      return;
    }

    const generated = buildPaymentScheduleDraft({
      mode: nextMode,
      totalCents: remainingTargetCents,
      depositPercent: nextDepositPercent,
      installmentsCount: Math.max(2, nextCount),
      firstDueDate: firstDate,
      secondDueDate: secondDate,
    });

    const nextPending: QuotePaymentRowFormValue[] = generated.map(
      (item, index) => {
        const preservedDate =
          nextMode === "installments"
            ? (addMonthsToISODate(firstDate, index) ?? "")
            : (existingPendingDates[index] ?? item.due_date ?? "");

        return {
          installment_number: paidRows.length + index + 1,
          label:
            hasPaidRows && nextMode === "cash"
              ? "Saldo restante"
              : item.label,
          amount_cents: quote.total_cents === 0 ? 0 : item.amount_cents,
          due_date: preservedDate,
          status: "pending",
        };
      },
    );

    replace([...paidRows, ...nextPending]);
  }

  function handleSelectMode(nextMode: PaymentMode) {
    const normalizedCount =
      nextMode === "installments" ? Math.max(2, watchedInstallmentsCount) : 2;
    setValue("payment_mode", nextMode, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (nextMode === "installments" && watchedInstallmentsCount < 2) {
      setValue("payment_installments_count", normalizedCount, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    rebuildPendingSchedule(nextMode, watchedDepositPercent, normalizedCount);
  }

  function handleChangeDepositPercent(nextPct: number) {
    const safePct = Math.min(99, Math.max(1, Math.round(nextPct) || 50));
    setValue("payment_deposit_percent", safePct, {
      shouldDirty: true,
      shouldValidate: true,
    });
    rebuildPendingSchedule(
      watchedMode,
      safePct,
      watchedInstallmentsCount,
    );
  }

  function handleChangeInstallmentsCount(nextCount: number) {
    const safeCount = Math.min(24, Math.max(2, Math.round(nextCount) || 2));
    setValue("payment_installments_count", safeCount, {
      shouldDirty: true,
      shouldValidate: true,
    });
    rebuildPendingSchedule(
      "installments",
      watchedDepositPercent,
      safeCount,
    );
  }

  function handleDistributeRemainingEqually() {
    if (pendingRows.length === 0) {
      return;
    }

    const amounts = calculateInstallmentAmounts(
      remainingTargetCents,
      pendingRows.length,
    );
    let pendingIdx = 0;
    const nextRows = watchedInstallments.map((row) => {
      if (row.status === "paid") {
        return row;
      }

      const nextAmount = amounts[pendingIdx] ?? 0;
      pendingIdx += 1;
      return {
        ...row,
        amount_cents: quote.total_cents === 0 ? 0 : nextAmount,
      };
    });

    replace(nextRows);
  }

  function handleAddCustomRow() {
    const lastDate =
      watchedInstallments[watchedInstallments.length - 1]?.due_date || "";
    const suggestedDate = lastDate ? (addMonthsToISODate(lastDate, 1) ?? "") : "";
    const nextAmount = diffCents > 0 ? diffCents : 0;

    append({
      installment_number: watchedInstallments.length + 1,
      label: `Parcela ${watchedInstallments.length + 1}`,
      amount_cents: quote.total_cents === 0 ? 0 : nextAmount,
      due_date: suggestedDate,
      status: "pending",
    });
  }

  async function onSubmit(values: QuotePaymentPlanFormValues) {
    if (!isBalanced) {
      return;
    }

    const effectiveInstallmentsCount =
      values.payment_mode === "installments"
        ? Math.max(2, values.payment_installments_count)
        : values.payment_mode === "split"
          ? 2
          : Math.max(1, values.installments.length);

    const pendingPayload = values.installments
      .filter((row) => row.status !== "paid")
      .map((row, index) => ({
        ...(row.id ? { id: row.id } : {}),
        installment_number: paidRows.length + index + 1,
        label: row.label.trim(),
        amount_cents: quote.total_cents === 0 ? 0 : row.amount_cents,
        due_date: emptyStringToNull(row.due_date),
      }));

    try {
      await savePlan.mutateAsync({
        quoteId: quote.id,
        paymentMode: values.payment_mode,
        depositPercent: values.payment_deposit_percent,
        installmentsCount: effectiveInstallmentsCount,
        paymentTerms: emptyStringToNull(values.payment_terms),
        installments: pendingPayload,
      });
      onOpenChange(false);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!savePlan.isPending) {
          onOpenChange(nextOpen);
        }
      }}
      title="Condições e parcelas"
      description="Escolha a forma de pagamento, datas e valores de cada entrada"
      fullHeight
      footer={
        <div className="flex flex-col gap-2">
          {!isBalanced ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span className="tabular-nums">
                {diffCents > 0
                  ? `Faltam ${formatCentsToBRL(diffCents)} para fechar o total.`
                  : `Excede o total em ${formatCentsToBRL(Math.abs(diffCents))}.`}
              </span>
              {pendingRows.length > 0 ? (
                <button
                  type="button"
                  onClick={handleDistributeRemainingEqually}
                  className="shrink-0 font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
                >
                  Ajustar
                </button>
              ) : null}
            </div>
          ) : null}

          <Button
            type="submit"
            form="quote-payments-form"
            size="lg"
            className="w-full"
            isLoading={savePlan.isPending}
            disabled={!isBalanced}
          >
            Salvar condições
          </Button>
        </div>
      }
    >
      <form
        id="quote-payments-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-5 pb-6"
      >
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-sm">
          <div>
            <p className="text-xs text-zinc-600">Total do orçamento</p>
            <p className="mt-0.5 font-semibold text-zinc-950 tabular-nums">
              {formatCentsToBRL(quote.total_cents)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-600">
              {hasPaidRows ? "Restante a receber" : "Soma das parcelas"}
            </p>
            <p className="mt-0.5 font-semibold text-zinc-950 tabular-nums">
              {quote.total_cents > 0
                ? formatCentsToBRL(
                    hasPaidRows ? remainingTargetCents : totalScheduledCents,
                  )
                : "Sem itens"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-900">
            Modalidade
          </span>
          <div
            role="group"
            aria-label="Modalidade de pagamento"
            className="grid grid-cols-2 gap-2"
          >
            {PAYMENT_MODE_OPTIONS.map((option) => {
              const isSelected = watchedMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectMode(option.value)}
                  className={cn(
                    "flex min-h-11 flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
                    isSelected
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-zinc-500 bg-white text-zinc-950 hover:bg-zinc-50 active:bg-zinc-100",
                  )}
                >
                  <span className="text-xs font-semibold">{option.label}</span>
                  <span
                    className={cn(
                      "text-[11px]",
                      isSelected ? "text-zinc-300" : "text-zinc-600",
                    )}
                  >
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {watchedMode === "split" ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
            {SPLIT_PERCENT_PRESETS.map((preset) => {
              const isPresetActive =
                watchedDepositPercent === preset.depositPercent;
              return (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={isPresetActive}
                  onClick={() => handleChangeDepositPercent(preset.depositPercent)}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-semibold transition-colors tabular-nums",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
                    isPresetActive
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-zinc-500 bg-white text-zinc-950 hover:bg-zinc-100",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}

            <div className="min-w-[110px] flex-1">
              <Input
                label="% Entrada"
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                className="tabular-nums"
                value={watchedDepositPercent}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  if (Number.isFinite(parsed)) {
                    handleChangeDepositPercent(parsed);
                  }
                }}
                error={errors.payment_deposit_percent?.message}
              />
            </div>
          </div>
        ) : null}

        {watchedMode === "installments" ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
            <Select
              label="Quantidade de parcelas"
              options={INSTALLMENT_COUNT_OPTIONS.map((count) => ({
                value: String(count),
                label: `${count}x mensais`,
              }))}
              value={String(Math.max(2, watchedInstallmentsCount))}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(parsed)) {
                  handleChangeInstallmentsCount(parsed);
                }
              }}
              error={errors.payment_installments_count?.message}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-neutral-900">
              Parcelas e datas
            </span>
            {watchedMode === "custom" ? (
              <Button
                variant="secondary"
                className="bg-white"
                onClick={handleAddCustomRow}
              >
                <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Adicionar parcela</span>
              </Button>
            ) : null}
          </div>

          {fields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center text-xs text-zinc-600">
              Nenhuma parcela definida ainda. Adicione parcelas para acompanhar
              datas e lançar automaticamente no Livro-Caixa.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {fields.map((field, index) => {
                const currentRow = watchedInstallments[index] ?? field;
                const isRowPaid = currentRow.status === "paid";

                if (isRowPaid) {
                  return (
                    <li
                      key={field.fieldKey}
                      className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Lock
                            className="h-3.5 w-3.5 shrink-0 text-emerald-800"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                          <p className="truncate text-sm font-semibold text-neutral-950">
                            {currentRow.label}
                          </p>
                          <Badge variant="success">Recebido</Badge>
                        </div>
                        {currentRow.due_date ? (
                          <p className="mt-1 text-xs text-neutral-600 tabular-nums">
                            Vencimento {formatDateBR(currentRow.due_date)}
                          </p>
                        ) : null}
                      </div>

                      <span className="shrink-0 text-sm font-semibold text-neutral-950 tabular-nums">
                        {formatCentsToBRL(currentRow.amount_cents)}
                      </span>
                    </li>
                  );
                }

                const rowErrors = errors.installments?.[index];

                return (
                  <li
                    key={field.fieldKey}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3.5"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <Input
                          label={`Descrição (${index + 1})`}
                          placeholder="Ex.: Entrada ou Parcela 1/3"
                          error={rowErrors?.label?.message}
                          {...register(`installments.${index}.label`)}
                        />
                      </div>

                      {watchedMode === "custom" ? (
                        <Button
                          variant="danger"
                          size="icon"
                          aria-label={`Remover ${currentRow.label || `parcela ${index + 1}`}`}
                          className="mt-[26px]"
                          onClick={() => remove(index)}
                        >
                          <Trash2
                            className="h-4 w-4"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Controller
                        control={control}
                        name={`installments.${index}.amount_cents`}
                        render={({ field: amountField }) => (
                          <CurrencyInput
                            label="Valor"
                            valueCents={amountField.value}
                            onChangeCents={amountField.onChange}
                            onBlur={amountField.onBlur}
                            disabled={quote.total_cents === 0}
                            error={rowErrors?.amount_cents?.message}
                          />
                        )}
                      />

                      <Input
                        label="Data de vencimento"
                        type="date"
                        className="tabular-nums"
                        error={rowErrors?.due_date?.message}
                        {...register(`installments.${index}.due_date`)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Input
          label="Observação de pagamento (opcional)"
          placeholder="Ex.: Pix, cartão ou combinar na entrega"
          error={errors.payment_terms?.message}
          {...register("payment_terms")}
        />
      </form>
    </BottomSheet>
  );
}
