import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CheckboxRow } from "@/components/ui/CheckboxRow";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input } from "@/components/ui/Input";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/SegmentedControl";
import { Select, type SelectOption } from "@/components/ui/Select";
import { useMaterials } from "@/features/catalog/hooks/useMaterials";
import { useServices } from "@/features/catalog/hooks/useServices";
import { canSyncMaterialPriceToCatalog } from "@/features/quotes/constants/quoteStatus";
import {
  useAddQuoteItem,
  useUpdateQuoteItem,
} from "@/features/quotes/hooks/useQuotes";
import {
  quoteItemSchema,
  type QuoteItemFormValues,
} from "@/features/quotes/schemas/quoteItemSchema";
import {
  calculateItemSubtotalCents,
  formatCentsToBRL,
} from "@/lib/money";
import {
  formatQuantityBR,
  formatQuantityForInput,
  formatUnitShort,
  parseQuantityBR,
  UNIT_OPTIONS,
} from "@/lib/units";
import type {
  QuoteItem,
  QuoteItemType,
  QuoteStatus,
} from "@/services/quotes.service";

interface QuoteItemFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteStatus: QuoteStatus;
  defaultItemType: QuoteItemType;
  item: QuoteItem | null;
  nextSortOrder: number;
}

const ITEM_TYPE_OPTIONS: readonly SegmentedOption<QuoteItemType>[] = [
  { value: "service", label: "Serviço" },
  { value: "material", label: "Material" },
];

function buildCreateValues(itemType: QuoteItemType): QuoteItemFormValues {
  return {
    item_type: itemType,
    service_id: null,
    material_id: null,
    description_snapshot: "",
    unit_snapshot: "unit",
    quantity_raw: "1",
    unit_price_snapshot_cents: 0,
    update_catalog_price: false,
  };
}

function mapItemToFormValues(item: QuoteItem): QuoteItemFormValues {
  return {
    item_type: item.item_type,
    service_id: item.service_id,
    material_id: item.material_id,
    description_snapshot: item.description_snapshot,
    unit_snapshot: item.unit_snapshot,
    quantity_raw: formatQuantityForInput(item.quantity),
    unit_price_snapshot_cents: item.unit_price_snapshot_cents,
    update_catalog_price: false,
  };
}

export function QuoteItemFormSheet({
  open,
  onOpenChange,
  quoteId,
  quoteStatus,
  defaultItemType,
  item,
  nextSortOrder,
}: QuoteItemFormSheetProps) {
  const isEditing = item !== null;

  const { data: activeServices = [] } = useServices({ activeOnly: true });
  const { data: activeMaterials = [] } = useMaterials({ activeOnly: true });

  const addQuoteItem = useAddQuoteItem();
  const updateQuoteItem = useUpdateQuoteItem();
  const isSaving = addQuoteItem.isPending || updateQuoteItem.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<QuoteItemFormValues>({
    resolver: zodResolver(quoteItemSchema),
    defaultValues: buildCreateValues(defaultItemType),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (item) {
      reset(mapItemToFormValues(item));
      return;
    }

    reset(buildCreateValues(defaultItemType));
  }, [open, item, defaultItemType, reset]);

  const watchedItemType =
    useWatch({ control, name: "item_type" }) ?? defaultItemType;
  const watchedServiceId = useWatch({ control, name: "service_id" }) ?? null;
  const watchedMaterialId = useWatch({ control, name: "material_id" }) ?? null;
  const watchedQuantityRaw =
    useWatch({ control, name: "quantity_raw" }) ?? "1";
  const watchedUnit = useWatch({ control, name: "unit_snapshot" }) ?? "unit";
  const watchedUnitPriceCents =
    useWatch({ control, name: "unit_price_snapshot_cents" }) ?? 0;

  const selectedCatalogId =
    watchedItemType === "service"
      ? (watchedServiceId ?? "")
      : (watchedMaterialId ?? "");

  const parsedQuantity = parseQuantityBR(watchedQuantityRaw);
  const previewSubtotalCents =
    parsedQuantity !== null
      ? calculateItemSubtotalCents(parsedQuantity, watchedUnitPriceCents)
      : 0;

  const canShowCatalogSync =
    item !== null &&
    item.item_type === "material" &&
    item.material_id !== null &&
    canSyncMaterialPriceToCatalog(quoteStatus) &&
    watchedUnitPriceCents !== item.unit_price_snapshot_cents;

  const catalogOptions = useMemo<SelectOption[]>(() => {
    if (watchedItemType === "service") {
      return [
        { value: "", label: "Item avulso (digitar manualmente)" },
        ...activeServices.map((service) => ({
          value: service.id,
          label: `${service.name} (${formatCentsToBRL(service.base_price_cents)} / ${formatUnitShort(service.unit)})`,
        })),
      ];
    }

    return [
      { value: "", label: "Item avulso (digitar manualmente)" },
      ...activeMaterials.map((material) => ({
        value: material.id,
        label: `${material.name} (${formatCentsToBRL(material.unit_price_cents)} / ${formatUnitShort(material.unit)})`,
      })),
    ];
  }, [watchedItemType, activeServices, activeMaterials]);

  function handleItemTypeChange(nextType: QuoteItemType) {
    setValue("item_type", nextType, { shouldDirty: true });
    setValue("service_id", null, { shouldDirty: true });
    setValue("material_id", null, { shouldDirty: true });
  }

  function handleSelectCatalogItem(catalogId: string) {
    if (!catalogId) {
      setValue("service_id", null, { shouldDirty: true });
      setValue("material_id", null, { shouldDirty: true });
      return;
    }

    if (watchedItemType === "service") {
      const selected = activeServices.find((entry) => entry.id === catalogId);
      if (!selected) {
        return;
      }

      setValue("service_id", selected.id, { shouldDirty: true });
      setValue("material_id", null, { shouldDirty: true });
      setValue("description_snapshot", selected.name, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("unit_snapshot", selected.unit, { shouldDirty: true });
      setValue("unit_price_snapshot_cents", selected.base_price_cents, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    const selected = activeMaterials.find((entry) => entry.id === catalogId);
    if (!selected) {
      return;
    }

    setValue("service_id", null, { shouldDirty: true });
    setValue("material_id", selected.id, { shouldDirty: true });
    setValue("description_snapshot", selected.name, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("unit_snapshot", selected.unit, { shouldDirty: true });
    setValue("unit_price_snapshot_cents", selected.unit_price_cents, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function onSubmit(values: QuoteItemFormValues) {
    const quantity = parseQuantityBR(values.quantity_raw);
    if (quantity === null) {
      return;
    }

    try {
      if (item) {
        await updateQuoteItem.mutateAsync({
          id: item.id,
          quoteId,
          payload: {
            description_snapshot: values.description_snapshot.trim(),
            unit_snapshot: values.unit_snapshot,
            quantity,
            unit_price_snapshot_cents: values.unit_price_snapshot_cents,
          },
          updateCatalogPrice: canShowCatalogSync && values.update_catalog_price,
          materialId: item.material_id,
        });
      } else {
        await addQuoteItem.mutateAsync({
          quote_id: quoteId,
          item_type: values.item_type,
          service_id: values.item_type === "service" ? values.service_id : null,
          material_id:
            values.item_type === "material" ? values.material_id : null,
          description_snapshot: values.description_snapshot.trim(),
          unit_snapshot: values.unit_snapshot,
          quantity,
          unit_price_snapshot_cents: values.unit_price_snapshot_cents,
          sort_order: nextSortOrder,
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
      title={isEditing ? "Editar item do orçamento" : "Adicionar item"}
      description={
        isEditing
          ? item.item_type === "service"
            ? "Serviço congelado neste orçamento"
            : "Material congelado neste orçamento"
          : "Escolha um item ativo do catálogo ou preencha um item avulso"
      }
      fullHeight
      footer={
        <Button
          type="submit"
          form="quote-item-form"
          size="lg"
          className="w-full"
          isLoading={isSaving}
          disabled={isEditing && !isDirty}
        >
          {isEditing ? "Salvar item" : "Adicionar ao orçamento"}
        </Button>
      }
    >
      <form
        id="quote-item-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 pb-6"
      >
        {!isEditing ? (
          <>
            <SegmentedControl
              ariaLabel="Tipo de item"
              options={ITEM_TYPE_OPTIONS}
              value={watchedItemType}
              onChange={handleItemTypeChange}
              idBase="quote-item-type"
            />

            <Select
              label={
                watchedItemType === "service"
                  ? "Importar do catálogo de serviços"
                  : "Importar do catálogo de materiais"
              }
              value={selectedCatalogId}
              onChange={(event) => handleSelectCatalogItem(event.target.value)}
              options={catalogOptions}
              hint="Nome, unidade e preço são copiados como snapshot e podem ser ajustados abaixo."
            />
          </>
        ) : null}

        <Input
          label="Descrição do item"
          placeholder={
            watchedItemType === "service"
              ? "Ex.: Higienização completa de ar-condicionado"
              : "Ex.: Tubo de cobre 1/4 pol"
          }
          error={errors.description_snapshot?.message}
          {...register("description_snapshot")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Quantidade"
            type="text"
            inputMode="decimal"
            placeholder="1"
            className="tabular-nums"
            hint="Aceita decimais (ex.: 2,5 ou 12,50)."
            error={errors.quantity_raw?.message}
            {...register("quantity_raw")}
          />

          <Select
            label="Unidade"
            options={UNIT_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            error={errors.unit_snapshot?.message}
            {...register("unit_snapshot")}
          />
        </div>

        <Controller
          control={control}
          name="unit_price_snapshot_cents"
          render={({ field }) => (
            <CurrencyInput
              label="Preço unitário"
              valueCents={field.value}
              onChangeCents={field.onChange}
              onBlur={field.onBlur}
              hint={
                item
                  ? `Valor anterior neste orçamento: ${formatCentsToBRL(item.unit_price_snapshot_cents)}`
                  : undefined
              }
              error={errors.unit_price_snapshot_cents?.message}
            />
          )}
        />

        {canShowCatalogSync ? (
          <Controller
            control={control}
            name="update_catalog_price"
            render={({ field }) => (
              <CheckboxRow
                label="Atualizar preço no catálogo de materiais"
                hint="Salva o novo valor unitário e a cotação de hoje no catálogo. Orçamentos existentes não serão alterados."
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-neutral-600">
              Subtotal previsto
            </p>
            <p className="mt-0.5 text-xs text-neutral-500 tabular-nums">
              {parsedQuantity !== null
                ? `${formatQuantityBR(parsedQuantity)} ${formatUnitShort(watchedUnit)} × ${formatCentsToBRL(watchedUnitPriceCents)}`
                : "Informe uma quantidade válida"}
            </p>
          </div>
          <p className="shrink-0 text-base font-semibold text-neutral-950 tabular-nums">
            {formatCentsToBRL(previewSubtotalCents)}
          </p>
        </div>
      </form>
    </BottomSheet>
  );
}
