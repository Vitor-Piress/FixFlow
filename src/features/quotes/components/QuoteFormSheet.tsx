import { useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CheckboxRow } from "@/components/ui/CheckboxRow";
import { Input } from "@/components/ui/Input";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useClients } from "@/features/catalog/hooks/useClients";
import { useBusinessProfile } from "@/features/profile/hooks/useBusinessProfile";
import { ClientAutocompleteField } from "@/features/quotes/components/ClientAutocompleteField";
import {
  useCreateQuote,
  useUpdateQuote,
} from "@/features/quotes/hooks/useQuotes";
import {
  quoteHeaderSchema,
  type QuoteHeaderFormValues,
} from "@/features/quotes/schemas/quoteSchema";
import { addDaysToISODate } from "@/lib/dates";
import { maskPhoneBR, PHONE_INPUT_MAX_LENGTH } from "@/lib/masks";
import { formatCentsToBRL } from "@/lib/money";
import {
  buildPaymentScheduleDraft,
  calculateInstallmentAmounts,
  calculateSplitAmounts,
  INSTALLMENT_COUNT_OPTIONS,
  PAYMENT_MODE_OPTIONS,
  SPLIT_PERCENT_PRESETS,
  type PaymentMode,
} from "@/lib/quotePayments";
import { cn, emptyStringToNull } from "@/lib/utils";
import type { BusinessProfile } from "@/services/businessProfile.service";
import type { Client } from "@/services/clients.service";
import type { Quote, QuoteWithItems } from "@/services/quotes.service";

interface QuoteFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteWithItems | null;
  onCreated?: (quote: Quote) => void;
}

const FALLBACK_VALIDITY_DAYS = 15;

function buildCreateDefaults(
  profile?: BusinessProfile | null,
): QuoteHeaderFormValues {
  const validityDays =
    profile?.default_quote_validity_days ?? FALLBACK_VALIDITY_DAYS;

  return {
    client_id: null,
    client_name: "",
    client_phone: "",
    client_address: "",
    title: "",
    valid_until: addDaysToISODate(validityDays),
    payment_mode: "cash",
    payment_deposit_percent: 50,
    payment_installments_count: 2,
    payment_first_due_date: "",
    payment_second_due_date: "",
    payment_terms: profile?.default_payment_terms ?? "",
    notes: profile?.default_notes ?? "",
    show_item_prices: true,
  };
}

function mapQuoteToFormValues(quote: QuoteWithItems): QuoteHeaderFormValues {
  const sortedPayments = [...quote.payments].sort(
    (a, b) => a.installment_number - b.installment_number,
  );
  const firstDue = sortedPayments[0]?.due_date ?? "";
  const secondDue = sortedPayments[1]?.due_date ?? "";

  return {
    client_id: quote.client_id ?? null,
    client_name: quote.client_name,
    client_phone: maskPhoneBR(quote.client_phone ?? ""),
    client_address: quote.client_address ?? "",
    title: quote.title ?? "",
    valid_until: quote.valid_until ?? "",
    payment_mode: quote.payment_mode,
    payment_deposit_percent: quote.payment_deposit_percent,
    payment_installments_count: Math.max(
      2,
      quote.payment_installments_count || 2,
    ),
    payment_first_due_date: firstDue,
    payment_second_due_date: secondDue,
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
  const hasPaidInstallments =
    quote?.payments.some((payment) => payment.status === "paid") ?? false;

  const { data: profile } = useBusinessProfile({
    enabled: open && !isEditing,
  });
  const { data: clients = [] } = useClients({ enabled: open });

  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const isSaving = createQuote.isPending || updateQuote.isPending;

  const initStageRef = useRef<"none" | "fallback" | "hydrated">("none");
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty, dirtyFields },
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

  const watchedClientId = useWatch({ control, name: "client_id" }) ?? null;
  const watchedPaymentMode =
    useWatch({ control, name: "payment_mode" }) ?? "cash";
  const watchedDepositPercent =
    useWatch({ control, name: "payment_deposit_percent" }) ?? 50;
  const watchedInstallmentsCount =
    useWatch({ control, name: "payment_installments_count" }) ?? 2;

  const isClientLocked = watchedClientId !== null;
  const quoteTotalCents = quote?.total_cents ?? 0;

  function handleSelectClient(client: Client) {
    setValue("client_id", client.id, { shouldDirty: true });
    setValue("client_name", client.name, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("client_phone", maskPhoneBR(client.phone ?? ""), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("client_address", client.address ?? "", { shouldDirty: true });
  }

  function handleClearSelectedClient() {
    setValue("client_id", null, { shouldDirty: true });
    setValue("client_name", "", { shouldDirty: true });
    setValue("client_phone", "", { shouldDirty: true });
    setValue("client_address", "", { shouldDirty: true });
  }

  function handleSelectPaymentMode(mode: PaymentMode) {
    setValue("payment_mode", mode, { shouldDirty: true, shouldValidate: true });
    if (mode === "installments" && watchedInstallmentsCount < 2) {
      setValue("payment_installments_count", 2, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  async function onSubmit(values: QuoteHeaderFormValues) {
    const effectiveInstallmentsCount =
      values.payment_mode === "installments"
        ? Math.max(2, values.payment_installments_count)
        : values.payment_mode === "split"
          ? 2
          : 1;

    const headerPayload = {
      client_id: values.client_id,
      client_name: values.client_name.trim(),
      client_phone: emptyStringToNull(values.client_phone),
      client_address: emptyStringToNull(values.client_address),
      title: emptyStringToNull(values.title),
      valid_until: emptyStringToNull(values.valid_until),
      payment_terms: emptyStringToNull(values.payment_terms),
      notes: emptyStringToNull(values.notes),
      show_item_prices: values.show_item_prices,
    };

    const paymentChangedOnEdit = Boolean(
      dirtyFields.payment_mode ||
        dirtyFields.payment_deposit_percent ||
        dirtyFields.payment_installments_count ||
        dirtyFields.payment_first_due_date ||
        dirtyFields.payment_second_due_date ||
        dirtyFields.payment_terms,
    );

    const buildPlanForTotal = (totalCents: number) => ({
      paymentMode: values.payment_mode,
      depositPercent: values.payment_deposit_percent,
      installmentsCount: effectiveInstallmentsCount,
      paymentTerms: emptyStringToNull(values.payment_terms),
      installments:
        values.payment_mode === "custom"
          ? []
          : buildPaymentScheduleDraft({
              mode: values.payment_mode,
              totalCents,
              depositPercent: values.payment_deposit_percent,
              installmentsCount: effectiveInstallmentsCount,
              firstDueDate: values.payment_first_due_date,
              secondDueDate: values.payment_second_due_date,
            }),
    });

    try {
      if (quote) {
        const shouldSavePlan =
          !hasPaidInstallments &&
          (paymentChangedOnEdit ||
            (quote.payments.length === 0 && values.payment_mode !== "custom"));

        await updateQuote.mutateAsync({
          id: quote.id,
          payload: headerPayload,
          autoEnsureClient: values.client_id === null,
          paymentPlan: shouldSavePlan
            ? buildPlanForTotal(quote.total_cents)
            : undefined,
        });
        onOpenChange(false);
        return;
      }

      const result = await createQuote.mutateAsync({
        payload: {
          ...headerPayload,
          payment_mode: values.payment_mode,
          payment_deposit_percent: values.payment_deposit_percent,
          payment_installments_count: effectiveInstallmentsCount,
        },
        autoEnsureClient: true,
        paymentPlan: buildPlanForTotal(0),
      });
      onOpenChange(false);
      onCreated?.(result.quote);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  const [splitDepositPreview, splitBalancePreview] = calculateSplitAmounts(
    quoteTotalCents,
    watchedDepositPercent,
  );
  const installmentAmountsPreview = calculateInstallmentAmounts(
    quoteTotalCents,
    Math.max(2, watchedInstallmentsCount),
  );

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
          : "Preencha cliente, pagamento e adicione os itens na próxima tela"
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
        <Controller
          control={control}
          name="client_name"
          render={({ field }) => (
            <ClientAutocompleteField
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              clients={clients}
              selectedClientId={watchedClientId}
              onSelectClient={handleSelectClient}
              onClearSelectedClient={handleClearSelectedClient}
              onConfirmNewClient={() => phoneInputRef.current?.focus()}
              error={errors.client_name?.message}
            />
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="client_phone"
            render={({ field }) => (
              <MaskedInput
                ref={(element) => {
                  field.ref(element);
                  phoneInputRef.current = element;
                }}
                name={field.name}
                label="Telefone / WhatsApp (opcional)"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={PHONE_INPUT_MAX_LENGTH}
                placeholder={
                  isClientLocked ? "Sem telefone" : "(48) 99999-9999"
                }
                readOnly={isClientLocked}
                aria-readonly={isClientLocked || undefined}
                className={
                  isClientLocked
                    ? "cursor-not-allowed border-neutral-300 bg-neutral-100 text-neutral-700"
                    : undefined
                }
                rightElement={
                  isClientLocked ? (
                    <Lock
                      className="mr-2 h-4 w-4 text-neutral-500"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  ) : undefined
                }
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                mask={maskPhoneBR}
                error={errors.client_phone?.message}
              />
            )}
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

        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-medium text-neutral-900">
            Condições de pagamento
          </span>

          {hasPaidInstallments ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-xs leading-relaxed text-neutral-600">
              Este orçamento já possui parcelas recebidas. Para ajustar datas ou
              valores pendentes, use a seção Pagamentos na tela do orçamento.
            </div>
          ) : (
            <>
              <div
                role="group"
                aria-label="Modalidade de pagamento"
                className="grid grid-cols-2 gap-2"
              >
                {PAYMENT_MODE_OPTIONS.map((option) => {
                  const isSelected = watchedPaymentMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleSelectPaymentMode(option.value)}
                      className={cn(
                        "flex min-h-11 flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
                        isSelected
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-zinc-500 bg-white text-zinc-950 hover:bg-zinc-50 active:bg-zinc-100",
                      )}
                    >
                      <span className="text-xs font-semibold">
                        {option.label}
                      </span>
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

              {watchedPaymentMode === "cash" ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                  <Input
                    label="Data prevista do pagamento (opcional)"
                    type="date"
                    className="tabular-nums"
                    error={errors.payment_first_due_date?.message}
                    {...register("payment_first_due_date")}
                  />
                </div>
              ) : null}

              {watchedPaymentMode === "split" ? (
                <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {SPLIT_PERCENT_PRESETS.map((preset) => {
                      const isPresetActive =
                        watchedDepositPercent === preset.depositPercent;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          aria-pressed={isPresetActive}
                          onClick={() => {
                            setValue(
                              "payment_deposit_percent",
                              preset.depositPercent,
                              { shouldDirty: true, shouldValidate: true },
                            );
                          }}
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
                        error={errors.payment_deposit_percent?.message}
                        {...register("payment_deposit_percent", {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label={`Data da entrada (${watchedDepositPercent}%)`}
                      type="date"
                      className="tabular-nums"
                      error={errors.payment_first_due_date?.message}
                      {...register("payment_first_due_date")}
                    />
                    <Input
                      label={`Data do saldo (${100 - watchedDepositPercent}%)`}
                      type="date"
                      className="tabular-nums"
                      error={errors.payment_second_due_date?.message}
                      {...register("payment_second_due_date")}
                    />
                  </div>

                  <p className="text-xs text-zinc-600 tabular-nums">
                    {quoteTotalCents > 0
                      ? `Entrada: ${formatCentsToBRL(splitDepositPreview)} · Saldo: ${formatCentsToBRL(splitBalancePreview)}`
                      : "As duas entradas serão calculadas automaticamente quando você adicionar os itens."}
                  </p>
                </div>
              ) : null}

              {watchedPaymentMode === "installments" ? (
                <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Select
                      label="Número de parcelas"
                      options={INSTALLMENT_COUNT_OPTIONS.map((count) => ({
                        value: String(count),
                        label: `${count}x mensais`,
                      }))}
                      value={String(Math.max(2, watchedInstallmentsCount))}
                      onChange={(event) => {
                        const parsed = Number.parseInt(event.target.value, 10);
                        setValue(
                          "payment_installments_count",
                          Number.isFinite(parsed) ? parsed : 2,
                          { shouldDirty: true, shouldValidate: true },
                        );
                      }}
                      error={errors.payment_installments_count?.message}
                    />

                    <Input
                      label="1º vencimento (opcional)"
                      type="date"
                      className="tabular-nums"
                      error={errors.payment_first_due_date?.message}
                      {...register("payment_first_due_date")}
                    />
                  </div>

                  <p className="text-xs text-zinc-600 tabular-nums">
                    {quoteTotalCents > 0
                      ? `${Math.max(2, watchedInstallmentsCount)}x com 1ª parcela de ${formatCentsToBRL(installmentAmountsPreview[0] ?? 0)}. Datas seguintes avançam mês a mês.`
                      : "Parcelas calculadas automaticamente ao adicionar os itens. Você poderá ajustar cada data individualmente depois."}
                  </p>
                </div>
              ) : null}

              {watchedPaymentMode === "custom" ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs leading-relaxed text-zinc-600">
                  Descreva as condições abaixo ou configure datas e valores livres
                  na seção Pagamentos após criar o orçamento.
                </div>
              ) : null}
            </>
          )}

          <Input
            label="Observação de pagamento (opcional)"
            placeholder="Ex.: Pix, transferência ou combinar na entrega"
            error={errors.payment_terms?.message}
            {...register("payment_terms")}
          />
        </div>

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
