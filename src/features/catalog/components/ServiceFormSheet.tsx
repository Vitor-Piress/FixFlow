import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { SERVICE_CATEGORY_PRESETS } from "@/features/catalog/constants/serviceCategories";
import {
  useCreateService,
  useUpdateService,
} from "@/features/catalog/hooks/useServices";
import {
  serviceSchema,
  type ServiceFormValues,
} from "@/features/catalog/schemas/serviceSchema";
import { UNIT_OPTIONS } from "@/lib/units";
import { cn, emptyStringToNull } from "@/lib/utils";
import type { Service } from "@/services/services.service";

interface ServiceFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
}

const DEFAULT_VALUES: ServiceFormValues = {
  name: "",
  category: "Manutenção Geral",
  unit: "unit",
  base_price_cents: 0,
  description: "",
};

function mapServiceToFormValues(service: Service): ServiceFormValues {
  return {
    name: service.name,
    category: service.category,
    unit: service.unit,
    base_price_cents: service.base_price_cents,
    description: service.description ?? "",
  };
}

export function ServiceFormSheet({
  open,
  onOpenChange,
  service,
}: ServiceFormSheetProps) {
  const createService = useCreateService();
  const updateService = useUpdateService();
  const isEditing = service !== null;
  const isSaving = createService.isPending || updateService.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(service ? mapServiceToFormValues(service) : DEFAULT_VALUES);
  }, [open, service, reset]);

  const currentCategory = useWatch({ control, name: "category" }) ?? "";

  async function onSubmit(values: ServiceFormValues) {
    const payload = {
      name: values.name.trim(),
      category: values.category.trim(),
      unit: values.unit,
      base_price_cents: values.base_price_cents,
      description: emptyStringToNull(values.description),
    };

    try {
      if (service) {
        await updateService.mutateAsync({ id: service.id, payload });
      } else {
        await createService.mutateAsync(payload);
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
      title={isEditing ? "Editar serviço" : "Novo serviço"}
      description="Valor base e unidade para orçamentos"
      fullHeight
      footer={
        <Button
          type="submit"
          form="service-form"
          size="lg"
          className="w-full"
          isLoading={isSaving}
          disabled={isEditing && !isDirty}
        >
          {isEditing ? "Salvar alterações" : "Cadastrar serviço"}
        </Button>
      }
    >
      <form
        id="service-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 pb-6"
      >
        <Input
          label="Nome do serviço"
          placeholder="Ex.: Limpeza completa de split"
          error={errors.name?.message}
          {...register("name")}
        />

        <div className="flex flex-col gap-2">
          <Input
            label="Categoria"
            placeholder="Ex.: Climatização"
            error={errors.category?.message}
            {...register("category")}
          />

          <div className="flex flex-wrap gap-1.5">
            {SERVICE_CATEGORY_PRESETS.map((preset) => {
              const isSelected =
                currentCategory.trim().toLowerCase() === preset.toLowerCase();

              return (
                <button
                  key={preset}
                  type="button"
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
                      : "border-neutral-500 bg-white text-neutral-700 hover:bg-neutral-50",
                  )}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

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
            name="base_price_cents"
            render={({ field }) => (
              <CurrencyInput
                label="Valor base"
                valueCents={field.value}
                onChangeCents={field.onChange}
                onBlur={field.onBlur}
                error={errors.base_price_cents?.message}
              />
            )}
          />
        </div>

        <Textarea
          label="Descrição padrão (opcional)"
          placeholder="Detalhes técnicos ou o que está incluso no serviço"
          rows={3}
          error={errors.description?.message}
          {...register("description")}
        />
      </form>
    </BottomSheet>
  );
}
