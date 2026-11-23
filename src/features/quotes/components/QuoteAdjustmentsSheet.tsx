import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CheckboxRow } from "@/components/ui/CheckboxRow";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input } from "@/components/ui/Input";
import { useUpdateQuote } from "@/features/quotes/hooks/useQuotes";
import {
  quoteAdjustmentsSchema,
  type QuoteAdjustmentsFormValues,
} from "@/features/quotes/schemas/quoteSchema";
import { formatCentsToBRL } from "@/lib/money";
import { emptyStringToNull } from "@/lib/utils";
import type { Quote } from "@/services/quotes.service";

interface QuoteAdjustmentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote;
}

export function QuoteAdjustmentsSheet({
  open,
  onOpenChange,
  quote,
}: QuoteAdjustmentsSheetProps) {
  const updateQuote = useUpdateQuote();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<QuoteAdjustmentsFormValues>({
    resolver: zodResolver(quoteAdjustmentsSchema),
    defaultValues: {
      adversity_fee_cents: quote.adversity_fee_cents,
      adversity_reason: quote.adversity_reason ?? "",
      discount_cents: quote.discount_cents,
      show_item_prices: quote.show_item_prices,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      adversity_fee_cents: quote.adversity_fee_cents,
      adversity_reason: quote.adversity_reason ?? "",
      discount_cents: quote.discount_cents,
      show_item_prices: quote.show_item_prices,
    });
  }, [open, quote, reset]);

  const watchedFee =
    useWatch({ control, name: "adversity_fee_cents" }) ?? 0;
  const watchedDiscount =
    useWatch({ control, name: "discount_cents" }) ?? 0;

  const rawTotal = quote.subtotal_cents + watchedFee - watchedDiscount;
  const previewTotal = Math.max(0, rawTotal);

  async function onSubmit(values: QuoteAdjustmentsFormValues) {
    try {
      await updateQuote.mutateAsync({
        id: quote.id,
        payload: {
          adversity_fee_cents: values.adversity_fee_cents,
          adversity_reason:
            values.adversity_fee_cents > 0
              ? emptyStringToNull(values.adversity_reason)
              : null,
          discount_cents: values.discount_cents,
          show_item_prices: values.show_item_prices,
        },
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
        if (!updateQuote.isPending) {
          onOpenChange(nextOpen);
        }
      }}
      title="Ajustar valores e exibição"
      description="Taxa de adversidades, desconto e transparência de preços"
      fullHeight
      footer={
        <Button
          type="submit"
          form="quote-adjustments-form"
          size="lg"
          className="w-full"
          isLoading={updateQuote.isPending}
          disabled={!isDirty}
        >
          Salvar ajustes
        </Button>
      }
    >
      <form
        id="quote-adjustments-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 pb-6"
      >
        <Controller
          control={control}
          name="adversity_fee_cents"
          render={({ field }) => (
            <CurrencyInput
              label="Taxa de adversidades"
              valueCents={field.value}
              onChangeCents={field.onChange}
              onBlur={field.onBlur}
              hint="Acesso difícil, trabalho em altura, deslocamento extra ou urgência."
              error={errors.adversity_fee_cents?.message}
            />
          )}
        />

        <Input
          label={
            watchedFee > 0
              ? "Motivo da taxa de adversidades"
              : "Motivo da taxa (opcional)"
          }
          placeholder="Ex.: Instalação externa acima de 4 metros"
          error={errors.adversity_reason?.message}
          {...register("adversity_reason")}
        />

        <Controller
          control={control}
          name="discount_cents"
          render={({ field }) => (
            <CurrencyInput
              label="Desconto"
              valueCents={field.value}
              onChangeCents={field.onChange}
              onBlur={field.onBlur}
              error={errors.discount_cents?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="show_item_prices"
          render={({ field }) => (
            <CheckboxRow
              label="Exibir preços unitários ao cliente"
              hint="Quando desmarcado, o cliente vê os serviços, materiais e quantidades apenas com o valor total global."
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm">
          <div className="flex items-center justify-between gap-2 text-neutral-600">
            <span>Subtotal dos itens</span>
            <span className="tabular-nums">
              {formatCentsToBRL(quote.subtotal_cents)}
            </span>
          </div>

          {watchedFee > 0 ? (
            <div className="flex items-center justify-between gap-2 text-neutral-600">
              <span>Taxa de adversidades</span>
              <span className="tabular-nums">
                + {formatCentsToBRL(watchedFee)}
              </span>
            </div>
          ) : null}

          {watchedDiscount > 0 ? (
            <div className="flex items-center justify-between gap-2 text-neutral-600">
              <span>Desconto</span>
              <span className="tabular-nums">
                - {formatCentsToBRL(watchedDiscount)}
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t border-neutral-200 pt-2 font-semibold text-neutral-950">
            <span>Total global previsto</span>
            <span className="text-base tabular-nums">
              {formatCentsToBRL(previewTotal)}
            </span>
          </div>

          {rawTotal < 0 ? (
            <p className="text-xs text-amber-800">
              O desconto supera o subtotal. O valor final será limitado a R$
              0,00.
            </p>
          ) : null}
        </div>
      </form>
    </BottomSheet>
  );
}
