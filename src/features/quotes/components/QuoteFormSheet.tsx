import { useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CheckboxRow } from "@/components/ui/CheckboxRow";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useBusinessProfile } from "@/features/profile/hooks/useBusinessProfile";
import {
  useCreateQuote,
  useUpdateQuote,
} from "@/features/quotes/hooks/useQuotes";
import {
  quoteHeaderSchema,
  type QuoteHeaderFormValues,
} from "@/features/quotes/schemas/quoteSchema";
import { addDaysToISODate } from "@/lib/dates";
import { emptyStringToNull } from "@/lib/utils";
import type { BusinessProfile } from "@/services/businessProfile.service";
import type { Quote } from "@/services/quotes.service";

interface QuoteFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
  onCreated?: (quote: Quote) => void;
}

const FALLBACK_VALIDITY_DAYS = 15;

function buildCreateDefaults(
  profile?: BusinessProfile | null,
): QuoteHeaderFormValues {
  const validityDays =
    profile?.default_quote_validity_days ?? FALLBACK_VALIDITY_DAYS;

  return {
    client_name: "",
    client_phone: "",
    client_address: "",
    title: "",
    valid_until: addDaysToISODate(validityDays),
    payment_terms: profile?.default_payment_terms ?? "",
    notes: profile?.default_notes ?? "",
    show_item_prices: true,
  };
}

function mapQuoteToFormValues(quote: Quote): QuoteHeaderFormValues {
  return {
    client_name: quote.client_name,
    client_phone: quote.client_phone ?? "",
    client_address: quote.client_address ?? "",
    title: quote.title ?? "",
    valid_until: quote.valid_until ?? "",
    payment_terms: quote.payment_terms ?? "",
    notes: quote.notes ?? "",
    show_item_prices: quote.show_item_prices,
  };
}

export function QuoteFormSheet({
  open,
  onOpenChange,
  quote,
  onCreated,
}: QuoteFormSheetProps) {
  const isEditing = quote !== null;
  const { data: profile } = useBusinessProfile({
    enabled: open && !isEditing,
  });

  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const isSaving = createQuote.isPending || updateQuote.isPending;

  const initStageRef = useRef<"none" | "fallback" | "hydrated">("none");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<QuoteHeaderFormValues>({
    resolver: zodResolver(quoteHeaderSchema),
    defaultValues: buildCreateDefaults(),
  });

  useEffect(() => {
    if (!open) {
      initStageRef.current = "none";
      return;
    }

    if (quote) {
      if (initStageRef.current === "none") {
        reset(mapQuoteToFormValues(quote));
        initStageRef.current = "hydrated";
      }
      return;
    }

    if (initStageRef.current === "none") {
      reset(buildCreateDefaults(profile));
      initStageRef.current = profile ? "hydrated" : "fallback";
      return;
    }

    // Apply business_profile defaults once when they finish loading on a fresh form.
    if (initStageRef.current === "fallback" && profile && !isDirty) {
      reset(buildCreateDefaults(profile));
      initStageRef.current = "hydrated";
    }
  }, [open, quote, profile, isDirty, reset]);

  async function onSubmit(values: QuoteHeaderFormValues) {
    const payload = {
      client_name: values.client_name.trim(),
      client_phone: emptyStringToNull(values.client_phone),
      client_address: emptyStringToNull(values.client_address),
      title: emptyStringToNull(values.title),
      valid_until: emptyStringToNull(values.valid_until),
      payment_terms: emptyStringToNull(values.payment_terms),
      notes: emptyStringToNull(values.notes),
      show_item_prices: values.show_item_prices,
    };

    try {
      if (quote) {
        await updateQuote.mutateAsync({
          id: quote.id,
          payload,
        });
        onOpenChange(false);
        return;
      }

      const created = await createQuote.mutateAsync(payload);
      onOpenChange(false);
      onCreated?.(created);
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
      title={isEditing ? "Editar dados do orçamento" : "Novo orçamento"}
      description={
        isEditing
          ? "Atualize dados do cliente, validade e condições"
          : "Preencha o cliente e adicione os itens na próxima tela"
      }
      fullHeight
      footer={
        <Button
          type="submit"
          form="quote-header-form"
          size="lg"
          className="w-full"
          isLoading={isSaving}
          disabled={isEditing && !isDirty}
        >
          {isEditing ? "Salvar alterações" : "Criar orçamento"}
        </Button>
      }
    >
      <form
        id="quote-header-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 pb-6"
      >
        <Input
          label="Nome do cliente"
          placeholder="Nome completo ou empresa"
          error={errors.client_name?.message}
          {...register("client_name")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Telefone / WhatsApp (opcional)"
            type="tel"
            inputMode="tel"
            placeholder="(48) 99999-9999"
            error={errors.client_phone?.message}
            {...register("client_phone")}
          />

          <Input
            label="Validade (opcional)"
            type="date"
            className="tabular-nums"
            error={errors.valid_until?.message}
            {...register("valid_until")}
          />
        </div>

        <Input
          label="Título ou escopo resumido (opcional)"
          placeholder="Ex.: Instalação de split 12.000 BTUs"
          error={errors.title?.message}
          {...register("title")}
        />

        <Input
          label="Endereço do serviço (opcional)"
          placeholder="Rua, número e bairro"
          error={errors.client_address?.message}
          {...register("client_address")}
        />

        <Input
          label="Condições de pagamento (opcional)"
          placeholder="Ex.: 50% na aprovação e 50% na conclusão"
          error={errors.payment_terms?.message}
          {...register("payment_terms")}
        />

        <Textarea
          label="Observações (opcional)"
          placeholder="Prazo de execução, garantia ou avisos ao cliente"
          rows={3}
          error={errors.notes?.message}
          {...register("notes")}
        />

        <Controller
          control={control}
          name="show_item_prices"
          render={({ field }) => (
            <CheckboxRow
              label="Exibir preços unitários ao cliente"
              hint="Se desmarcado, a prévia do cliente exibe itens e quantidades, mostrando apenas o valor total global."
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </form>
    </BottomSheet>
  );
}
