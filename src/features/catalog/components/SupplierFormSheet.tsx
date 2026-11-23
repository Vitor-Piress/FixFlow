import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { Textarea } from "@/components/ui/Textarea";
import {
  useCreateSupplier,
  useUpdateSupplier,
} from "@/features/catalog/hooks/useSuppliers";
import {
  supplierSchema,
  type SupplierFormValues,
} from "@/features/catalog/schemas/supplierSchema";
import { maskPhoneBR, PHONE_INPUT_MAX_LENGTH } from "@/lib/masks";
import { emptyStringToNull } from "@/lib/utils";
import type { Supplier } from "@/services/suppliers.service";

interface SupplierFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

const DEFAULT_VALUES: SupplierFormValues = {
  name: "",
  phone: "",
  notes: "",
};

function mapSupplierToFormValues(supplier: Supplier): SupplierFormValues {
  return {
    name: supplier.name,
    phone: maskPhoneBR(supplier.phone ?? ""),
    notes: supplier.notes ?? "",
  };
}

export function SupplierFormSheet({
  open,
  onOpenChange,
  supplier,
}: SupplierFormSheetProps) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const isEditing = supplier !== null;
  const isSaving = createSupplier.isPending || updateSupplier.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(supplier ? mapSupplierToFormValues(supplier) : DEFAULT_VALUES);
  }, [open, supplier, reset]);

  async function onSubmit(values: SupplierFormValues) {
    const payload = {
      name: values.name.trim(),
      phone: emptyStringToNull(values.phone),
      notes: emptyStringToNull(values.notes),
    };

    try {
      if (supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, payload });
      } else {
        await createSupplier.mutateAsync(payload);
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
      title={isEditing ? "Editar fornecedor" : "Novo fornecedor"}
      description="Contato para cotação de peças via WhatsApp"
      fullHeight
      footer={
        <Button
          type="submit"
          form="supplier-form"
          size="lg"
          className="w-full"
          isLoading={isSaving}
          disabled={isEditing && !isDirty}
        >
          {isEditing ? "Salvar alterações" : "Cadastrar fornecedor"}
        </Button>
      }
    >
      <form
        id="supplier-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 pb-6"
      >
        <Input
          label="Nome do fornecedor / loja"
          placeholder="Ex.: Refrigeração Santa Catarina"
          error={errors.name?.message}
          {...register("name")}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <MaskedInput
              ref={field.ref}
              name={field.name}
              label="WhatsApp / Telefone (opcional)"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={PHONE_INPUT_MAX_LENGTH}
              placeholder="(48) 99999-9999"
              hint="Com DDD, para habilitar o atalho direto de WhatsApp."
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              mask={maskPhoneBR}
              error={errors.phone?.message}
            />
          )}
        />

        <Textarea
          label="Observações (opcional)"
          placeholder="Endereço, horário de atendimento, condições de entrega"
          rows={3}
          error={errors.notes?.message}
          {...register("notes")}
        />
      </form>
    </BottomSheet>
  );
}
