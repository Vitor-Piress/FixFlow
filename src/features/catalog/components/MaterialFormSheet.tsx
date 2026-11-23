import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  useCreateMaterial,
  useUpdateMaterial,
} from "@/features/catalog/hooks/useMaterials";
import { useSuppliers } from "@/features/catalog/hooks/useSuppliers";
import {
  materialSchema,
  type MaterialFormValues,
} from "@/features/catalog/schemas/materialSchema";
import { formatDateBR, getTodayISODate } from "@/lib/dates";
import { UNIT_OPTIONS } from "@/lib/units";
import { emptyStringToNull } from "@/lib/utils";
import type { MaterialWithSupplier } from "@/services/materials.service";

interface MaterialFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: MaterialWithSupplier | null;
}

const DEFAULT_VALUES: MaterialFormValues = {
  name: "",
  supplier_id: "",
  unit: "unit",
  unit_price_cents: 0,
  notes: "",
};

function mapMaterialToFormValues(
  material: MaterialWithSupplier,
): MaterialFormValues {
  return {
    name: material.name,
    supplier_id: material.supplier_id ?? "",
    unit: material.unit,
    unit_price_cents: material.unit_price_cents,
    notes: material.notes ?? "",
  };
}

export function MaterialFormSheet({
  open,
  onOpenChange,
  material,
}: MaterialFormSheetProps) {
  const { data: suppliers = [] } = useSuppliers();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();

  const isEditing = material !== null;
  const isSaving = createMaterial.isPending || updateMaterial.isPending;

  const supplierOptions = useMemo(
    () => [
      { value: "", label: "Nenhum fornecedor" },
      ...suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
    ],
    [suppliers],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(material ? mapMaterialToFormValues(material) : DEFAULT_VALUES);
  }, [open, material, reset]);

  async function onSubmit(values: MaterialFormValues) {
    const basePayload = {
      name: values.name.trim(),
      supplier_id: emptyStringToNull(values.supplier_id),
      unit: values.unit,
      unit_price_cents: values.unit_price_cents,
      notes: emptyStringToNull(values.notes),
    };

    try {
      if (material) {
        const priceChanged =
          values.unit_price_cents !== material.unit_price_cents;

        await updateMaterial.mutateAsync({
          id: material.id,
          payload: priceChanged
            ? { ...basePayload, price_updated_at: getTodayISODate() }
            : basePayload,
        });
      } else {
        await createMaterial.mutateAsync({
          ...basePayload,
          price_updated_at: getTodayISODate(),
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
      title={isEditing ? "Editar material" : "Novo material"}
      description="Preço de referência e fornecedor para orçamentos"
      fullHeight
      footer={
        <Button
          type="submit"
          form="material-form"
          size="lg"
          className="w-full"
          isLoading={isSaving}
          disabled={isEditing && !isDirty}
        >
          {isEditing ? "Salvar alterações" : "Cadastrar material"}
        </Button>
      }
    >
      <form
        id="material-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 pb-6"
      >
        <Input
          label="Nome do material / peça"
          placeholder="Ex.: Tubo de cobre 1/4 pol"
          error={errors.name?.message}
          {...register("name")}
        />

        <Select
          label="Fornecedor (opcional)"
          options={supplierOptions}
          error={errors.supplier_id?.message}
          {...register("supplier_id")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Unidade"
            options={UNIT_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
            error={errors.unit?.message}
            {...register("unit")}
          />

          <Controller
            control={control}
            name="unit_price_cents"
            render={({ field }) => (
              <CurrencyInput
                label="Preço unitário"
                valueCents={field.value}
                onChangeCents={field.onChange}
                onBlur={field.onBlur}
                hint={
                  material
                    ? `Última cotação: ${formatDateBR(material.price_updated_at)}`
                    : "A data de atualização será registrada com a data de hoje."
                }
                error={errors.unit_price_cents?.message}
              />
            )}
          />
        </div>

        <Textarea
          label="Observações (opcional)"
          placeholder="Especificação técnica, marca ou observação de compra"
          rows={3}
          error={errors.notes?.message}
          {...register("notes")}
        />
      </form>
    </BottomSheet>
  );
}
