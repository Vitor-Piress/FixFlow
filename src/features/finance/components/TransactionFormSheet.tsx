import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input } from "@/components/ui/Input";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/SegmentedControl";
import { Textarea } from "@/components/ui/Textarea";
import {
  useCreateTransaction,
  useUpdateTransaction,
} from "@/features/finance/hooks/useFinance";
import {
  transactionSchema,
  type TransactionFormValues,
} from "@/features/finance/schemas/transactionSchema";
import { formatMonthYearBR, getTodayISODate } from "@/lib/dates";
import {
  deriveBillingMonthFromDate,
  EXPENSE_CATEGORY_PRESETS,
  getDefaultDueDateForBillingMonth,
  getTransactionSourceKind,
  INCOME_CATEGORY_PRESETS,
} from "@/lib/finance";
import { cn, emptyStringToNull } from "@/lib/utils";
import type {
  FinancialTransaction,
  TransactionStatus,
  TransactionType,
} from "@/services/finance.service";

interface TransactionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: FinancialTransaction | null;
  defaultBillingMonth: string;
  defaultType?: TransactionType;
}

const TRANSACTION_TYPE_OPTIONS: readonly SegmentedOption<TransactionType>[] = [
  { value: "income", label: "Receita" },
  { value: "expense", label: "Despesa" },
];

function buildCreateDefaults(
  defaultBillingMonth: string,
  defaultType: TransactionType,
): TransactionFormValues {
  return {
    type: defaultType,
    description: "",
    category: "",
    amount_cents: 0,
    due_date: getDefaultDueDateForBillingMonth(
      defaultBillingMonth,
      getTodayISODate(),
    ),
    status: "pending",
    notes: "",
  };
}

function mapTransactionToFormValues(
  transaction: FinancialTransaction,
): TransactionFormValues {
  return {
    type: transaction.type,
    description: transaction.description,
    category: transaction.category ?? "",
    amount_cents: transaction.amount_cents,
    due_date: transaction.due_date,
    status: transaction.status,
    notes: transaction.notes ?? "",
  };
}

export function TransactionFormSheet({
  open,
  onOpenChange,
  transaction,
  defaultBillingMonth,
  defaultType = "income",
}: TransactionFormSheetProps) {
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();

  const isEditing = transaction !== null;
  const sourceKind = transaction
    ? getTransactionSourceKind(transaction)
    : "manual";
  const isLinkedRecurring =
    sourceKind === "contract" || sourceKind === "recurring_expense";
  const isSaving = createTransaction.isPending || updateTransaction.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: buildCreateDefaults(defaultBillingMonth, defaultType),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      transaction
        ? mapTransactionToFormValues(transaction)
        : buildCreateDefaults(defaultBillingMonth, defaultType),
    );
  }, [open, transaction, defaultBillingMonth, defaultType, reset]);

  const watchedType = useWatch({ control, name: "type" }) ?? defaultType;
  const watchedCategory = useWatch({ control, name: "category" }) ?? "";
  const watchedDueDate = useWatch({ control, name: "due_date" }) ?? "";
  const watchedStatus = useWatch({ control, name: "status" }) ?? "pending";

  const categoryPresets =
    watchedType === "income"
      ? INCOME_CATEGORY_PRESETS
      : EXPENSE_CATEGORY_PRESETS;

  const statusOptions: readonly SegmentedOption<TransactionStatus>[] = [
    { value: "pending", label: "Pendente" },
    { value: "paid", label: watchedType === "income" ? "Recebido" : "Pago" },
  ];

  const derivedBillingMonth = deriveBillingMonthFromDate(watchedDueDate);
  const derivedMonthLabel = derivedBillingMonth
    ? formatMonthYearBR(derivedBillingMonth)
    : "";

  async function onSubmit(values: TransactionFormValues) {
    if (transaction?.quote_id) {
      return;
    }

    const billingMonth = deriveBillingMonthFromDate(values.due_date);
    if (!billingMonth) {
      return;
    }

    const nextPaidAt =
      values.status === "paid"
        ? transaction?.status === "paid" && transaction.paid_at
          ? transaction.paid_at
          : new Date().toISOString()
        : null;

    const basePayload = {
      description: values.description.trim(),
      category: emptyStringToNull(values.category),
      amount_cents: values.amount_cents,
      due_date: values.due_date,
      billing_month: billingMonth,
      status: values.status,
      paid_at: nextPaidAt,
      notes: emptyStringToNull(values.notes),
    };

    try {
      if (transaction) {
        await updateTransaction.mutateAsync({
          id: transaction.id,
          payload: isLinkedRecurring
            ? basePayload
            : { ...basePayload, type: values.type },
          viewedBillingMonth: defaultBillingMonth,
        });
      } else {
        await createTransaction.mutateAsync({
          payload: {
            ...basePayload,
            type: values.type,
          },
          viewedBillingMonth: defaultBillingMonth,
        });
      }

      onOpenChange(false);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSaving) {
          onOpenChange(nextOpen);
        }
      }}
      title={isEditing ? "Editar lançamento" : "Novo lançamento"}
      description={
        isLinkedRecurring
          ? sourceKind === "contract"
            ? "Receita recorrente gerada por contrato mensal"
            : "Despesa recorrente gerada por despesa fixa"
          : "Registre uma entrada ou saída no Livro-Caixa"
      }
      fullHeight
      footer={
        <Button
          type="submit"
          form="transaction-form"
          size="lg"
          className="w-full"
          isLoading={isSaving}
          disabled={isEditing && !isDirty}
        >
          {isEditing ? "Salvar alterações" : "Registrar lançamento"}
        </Button>
      }
    >
      <form
        id="transaction-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 pb-6"
      >
        {isLinkedRecurring ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-xs leading-relaxed text-neutral-600">
            {sourceKind === "contract"
              ? "Este lançamento pertence a um contrato mensal. As alterações aqui valem apenas para esta competência. Para encerrar futuras cobranças, desative na aba Contratos."
              : "Este lançamento pertence a uma despesa fixa. As alterações aqui valem apenas para esta competência. Para encerrar futuros lançamentos, desative na aba Despesas Fixas."}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-900">Tipo</span>
            <SegmentedControl
              ariaLabel="Tipo de lançamento"
              options={TRANSACTION_TYPE_OPTIONS}
              value={watchedType}
              onChange={(nextType) => {
                setValue("type", nextType, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              idBase="transaction-type"
            />
          </div>
        )}

        <Input
          label="Descrição"
          placeholder={
            watchedType === "income"
              ? "Ex.: Manutenção avulsa de ar-condicionado"
              : "Ex.: Combustível da semana"
          }
          error={errors.description?.message}
          {...register("description")}
        />

        <div className="flex flex-col gap-2">
          <Input
            label="Categoria (opcional)"
            placeholder={
              watchedType === "income"
                ? "Ex.: Manutenção Avulsa"
                : "Ex.: Combustível"
            }
            error={errors.category?.message}
            {...register("category")}
          />

          <div
            role="group"
            aria-label="Sugestões de categoria"
            className="flex flex-wrap gap-1.5"
          >
            {categoryPresets.map((preset) => {
              const isSelected =
                watchedCategory.trim().toLowerCase() === preset.toLowerCase();

              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    setValue("category", preset, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-medium transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
                    isSelected
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-500 bg-white text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100",
                  )}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="amount_cents"
            render={({ field }) => (
              <CurrencyInput
                label="Valor"
                valueCents={field.value}
                onChangeCents={field.onChange}
                onBlur={field.onBlur}
                error={errors.amount_cents?.message}
              />
            )}
          />

          <Input
            label="Vencimento"
            type="date"
            className="tabular-nums"
            hint={
              derivedMonthLabel
                ? `Competência: ${derivedMonthLabel}`
                : "A competência acompanha o mês do vencimento."
            }
            error={errors.due_date?.message}
            {...register("due_date")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-900">Situação</span>
          <SegmentedControl
            ariaLabel="Situação do lançamento"
            options={statusOptions}
            value={watchedStatus}
            onChange={(nextStatus) => {
              setValue("status", nextStatus, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            idBase="transaction-status"
          />
        </div>

        <Textarea
          label="Observações (opcional)"
          placeholder="Forma de pagamento, referência ou anotação rápida"
          rows={3}
          error={errors.notes?.message}
          {...register("notes")}
        />
      </form>
    </BottomSheet>
  );
}
