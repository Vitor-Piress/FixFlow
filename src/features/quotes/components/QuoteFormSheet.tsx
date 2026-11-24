import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Lock, Plus } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CheckboxRow } from "@/components/ui/CheckboxRow";
import { Input } from "@/components/ui/Input";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { Textarea } from "@/components/ui/Textarea";
import { useClients } from "@/features/catalog/hooks/useClients";
import { useBusinessProfile } from "@/features/profile/hooks/useBusinessProfile";
import { ClientAutocompleteField } from "@/features/quotes/components/ClientAutocompleteField";
import {
  ClientPickerSearchBar,
  ClientPickerView,
} from "@/features/quotes/components/ClientPickerView";
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
import { emptyStringToNull } from "@/lib/utils";
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
    notes: profile?.default_notes ?? "",
    show_item_prices: true,
  };
}

function mapQuoteToFormValues(quote: QuoteWithItems): QuoteHeaderFormValues {
  return {
    client_id: quote.client_id ?? null,
    client_name: quote.client_name,
    client_phone: maskPhoneBR(quote.client_phone ?? ""),
    client_address: quote.client_address ?? "",
    title: quote.title ?? "",
    valid_until: quote.valid_until ?? "",
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
  const { data: clients = [] } = useClients({ enabled: open });

  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const isSaving = createQuote.isPending || updateQuote.isPending;

  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  const initStageRef = useRef<"none" | "fallback" | "hydrated">("none");
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
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

  const watchedClientId = useWatch({ control, name: "client_id" }) ?? null;
  const isClientLocked = watchedClientId !== null;
  const showClientPicker = open && isClientPickerOpen;

  const trimmedPickerSearch = clientSearchQuery.trim();
  const hasExactPickerMatch = useMemo(() => {
    if (!trimmedPickerSearch) {
      return false;
    }
    const lower = trimmedPickerSearch.toLowerCase();
    return clients.some((client) => client.name.trim().toLowerCase() === lower);
  }, [clients, trimmedPickerSearch]);

  function handleSheetOpenChange(nextOpen: boolean) {
    if (isSaving) {
      return;
    }
    if (!nextOpen) {
      setIsClientPickerOpen(false);
      setClientSearchQuery("");
    }
    onOpenChange(nextOpen);
  }

  function handleOpenClientPicker() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setClientSearchQuery("");
    setIsClientPickerOpen(true);
  }

  function handleCloseClientPicker() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsClientPickerOpen(false);
    setClientSearchQuery("");
  }

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
    setIsClientPickerOpen(false);
    setClientSearchQuery("");
  }

  function handleChooseNewClientFromPicker() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setValue("client_id", null, { shouldDirty: true });

    if (trimmedPickerSearch && !hasExactPickerMatch) {
      setValue("client_name", trimmedPickerSearch, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("client_phone", "", { shouldDirty: true });
      setValue("client_address", "", { shouldDirty: true });
      setIsClientPickerOpen(false);
      setClientSearchQuery("");
      window.requestAnimationFrame(() => {
        phoneInputRef.current?.focus();
      });
      return;
    }

    if (watchedClientId !== null) {
      setValue("client_name", "", { shouldDirty: true });
      setValue("client_phone", "", { shouldDirty: true });
      setValue("client_address", "", { shouldDirty: true });
    }

    setIsClientPickerOpen(false);
    setClientSearchQuery("");
    window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
  }

  async function onSubmit(values: QuoteHeaderFormValues) {
    const headerPayload = {
      client_id: values.client_id,
      client_name: values.client_name.trim(),
      client_phone: emptyStringToNull(values.client_phone),
      client_address: emptyStringToNull(values.client_address),
      title: emptyStringToNull(values.title),
      valid_until: emptyStringToNull(values.valid_until),
      notes: emptyStringToNull(values.notes),
      show_item_prices: values.show_item_prices,
    };

    try {
      if (quote) {
        await updateQuote.mutateAsync({
          id: quote.id,
          payload: headerPayload,
          autoEnsureClient: values.client_id === null,
        });
        setIsClientPickerOpen(false);
        setClientSearchQuery("");
        onOpenChange(false);
        return;
      }

      const result = await createQuote.mutateAsync({
        payload: {
          ...headerPayload,
          payment_terms: emptyStringToNull(profile?.default_payment_terms ?? ""),
        },
        autoEnsureClient: true,
      });
      setIsClientPickerOpen(false);
      setClientSearchQuery("");
      onOpenChange(false);
      onCreated?.(result.quote);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  const createNewButtonLabel =
    trimmedPickerSearch.length >= 2 && !hasExactPickerMatch
      ? `Cadastrar "${trimmedPickerSearch}"`
      : "Cadastrar novo cliente";

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleSheetOpenChange}
      title={
        showClientPicker
          ? "Selecionar cliente"
          : isEditing
            ? "Editar dados do orçamento"
            : "Novo orçamento"
      }
      description={
        showClientPicker
          ? "Toque em um cliente cadastrado ou cadastre um novo"
          : isEditing
            ? "Atualize dados do cliente, validade e observações"
            : "Escolha o cliente e adicione os itens e pagamento na próxima tela"
      }
      headerLeft={
        showClientPicker ? (
          <button
            type="button"
            onClick={handleCloseClientPicker}
            aria-label="Voltar para dados do orçamento"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : undefined
      }
      stickySubheader={
        showClientPicker ? (
          <ClientPickerSearchBar
            query={clientSearchQuery}
            onQueryChange={setClientSearchQuery}
          />
        ) : undefined
      }
      fullHeight
      footer={
        showClientPicker ? (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleChooseNewClientFromPicker}
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span className="truncate">{createNewButtonLabel}</span>
          </Button>
        ) : (
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
        )
      }
    >
      {showClientPicker ? (
        <ClientPickerView
          clients={clients}
          searchQuery={clientSearchQuery}
          selectedClientId={watchedClientId}
          onClearSearch={() => setClientSearchQuery("")}
          onSelectClient={handleSelectClient}
        />
      ) : (
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
                onOpenClientPicker={handleOpenClientPicker}
                inputRef={(element) => {
                  field.ref(element);
                  nameInputRef.current = element;
                }}
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
      )}
    </BottomSheet>
  );
}
