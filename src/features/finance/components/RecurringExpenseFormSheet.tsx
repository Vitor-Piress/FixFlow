import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input } from "@/components/ui/Input";
import {
  useCreateRecurringExpense,
  useUpdateRecurringExpense,
} from "@/features/finance/hooks/useFinance";
import {
  recurringExpenseSchema,
  type RecurringExpenseFormValues,
} from "@/features/finance/schemas/recurringExpenseSchema";
import { EXPENSE_CATEGORY_PRESETS } from "@/lib/finance";
import { cn } from "@/lib/utils";
import type { RecurringExpense } from "@/services/finance.service";

interface RecurringExpenseFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: RecurringExpense | null;
}

function buildCreateDefaults(): RecurringExpenseFormValues {
  return {
    description: "",
    category: "Despesa Fixa",
    amount_cents: 0,
    due_day: new Date().getDate(),
  };
}

function mapExpenseToFormValues(
  expense: RecurringExpense,
): RecurringExpenseFormValues {
  return {
    description: expense.description,
    category: expense.category,
    amount_cents: expense.amount_cents,
    due_day: expense.due_day,
  };
}

export function RecurringExpenseFormSheet({
  open,
  onOpenChange,
  expense,
}: RecurringExpenseFormSheetProps) {
  const createRecurringExpense = useCreateRecurringExpense();
  const updateRecurringExpense = useUpdateRecurringExpense();

  const isEditing = expense !== null;
  const isSaving =
    createRecurringExpense.isPending || updateRecurringExpense.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<RecurringExpenseFormValues>({
    resolver: zodResolver(recurringExpenseSchema),
    defaultValues: buildCreateDefaults(),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(expense ? mapExpenseToFormValues(expense) : buildCreateDefaults());
  }, [open, expense, reset]);

  const currentCategory = useWatch({ control, name: "category" }) ?? "";

  async function onSubmit(values: RecurringExpenseFormValues) {
    const payload = {
      description: values.description.trim(),
      category: values.category.trim(),
      amount_cents: values.amount_cents,
      due_day: values.due_day,
    };

    try {
      if (expense) {
        await updateRecurringExpense.mutateAsync({
          id: expense.id,
          payload,
        });
      } else {
        await createRecurringExpense.mutateAsync(payload);
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
      title={isEditing ? "Editar despesa fixa" : "Nova despesa fixa"}
      description="Valor mensal e dia de vencimento para geração automática no Livro-Caixa"
      fullHeight
      footer={
        <Button
          type="submit"
          form="recurring-expense-form"
          size="lg"
          className="w-full"
          isLoading={isSaving}
          disabled={isEditing && !isDirty}
        >
          {isEditing ? "Salvar alterações" : "Cadastrar despesa fixa"}
        </Button>
      }
    >
      <form
        id="recurring-expense-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 pb-6"
      >
        <Input
          label="Descrição"
          placeholder="Ex.: DAS MEI, internet ou aluguel do depósito"
          error={errors.description?.message}
          {...register("description")}
        />

        <div className="flex flex-col gap-2">
          <Input
            label="Categoria"
            placeholder="Ex.: Despesa Fixa"
            error={errors.category?.message}
            {...register("category")}
          />

          <div
            role="group"
            aria-label="Sugestões de categoria"
            className="flex flex-wrap gap-1.5"
          >
            {EXPENSE_CATEGORY_PRESETS.map((preset) => {
              const isSelected =
                currentCategory.trim().toLowerCase() === preset.toLowerCase();

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
                label="Valor mensal"
                valueCents={field.value}
                onChangeCents={field.onChange}
                onBlur={field.onBlur}
                error={errors.amount_cents?.message}
              />
            )}
          />

          <Input
            label="Dia de vencimento"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            placeholder="10"
            className="tabular-nums"
            hint="Em meses mais curtos, vence no último dia."
            error={errors.due_day?.message}
            {...register("due_day", {
              valueAsNumber: true,
            })}
          />
        </div>
      </form>
    </BottomSheet>
  );
}
