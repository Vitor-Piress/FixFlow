import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { Textarea } from "@/components/ui/Textarea";
import {
  useCreateClient,
  useUpdateClient,
} from "@/features/catalog/hooks/useClients";
import {
  clientSchema,
  type ClientFormValues,
} from "@/features/catalog/schemas/clientSchema";
import { maskPhoneBR, PHONE_INPUT_MAX_LENGTH } from "@/lib/masks";
import { emptyStringToNull } from "@/lib/utils";
import type { Client } from "@/services/clients.service";

interface ClientFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

const DEFAULT_VALUES: ClientFormValues = {
  name: "",
  phone: "",
  address: "",
  notes: "",
};

function mapClientToFormValues(client: Client): ClientFormValues {
  return {
    name: client.name,
    phone: maskPhoneBR(client.phone ?? ""),
    address: client.address ?? "",
    notes: client.notes ?? "",
  };
}

export function ClientFormSheet({
  open,
  onOpenChange,
  client,
}: ClientFormSheetProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const isEditing = client !== null;
  const isSaving = createClient.isPending || updateClient.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(client ? mapClientToFormValues(client) : DEFAULT_VALUES);
  }, [open, client, reset]);

  async function onSubmit(values: ClientFormValues) {
    const payload = {
      name: values.name.trim(),
      phone: emptyStringToNull(values.phone),
      address: emptyStringToNull(values.address),
      notes: emptyStringToNull(values.notes),
    };

    try {
      if (client) {
        await updateClient.mutateAsync({ id: client.id, payload });
      } else {
        await createClient.mutateAsync(payload);
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
      title={isEditing ? "Editar cliente" : "Novo cliente"}
      description="Cadastro rápido para reaproveitar em orçamentos e abrir no WhatsApp"
      fullHeight
      footer={
        <Button
          type="submit"
          form="client-form"
          size="lg"
          className="w-full"
          isLoading={isSaving}
          disabled={isEditing && !isDirty}
        >
          {isEditing ? "Salvar alterações" : "Cadastrar cliente"}
        </Button>
      }
    >
      <form
        id="client-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 pb-6"
      >
        <Input
          label="Nome do cliente"
          placeholder="Nome completo, empresa ou condomínio"
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

        <Input
          label="Endereço padrão (opcional)"
          placeholder="Rua, número e bairro"
          error={errors.address?.message}
          {...register("address")}
        />

        <Textarea
          label="Observações (opcional)"
          placeholder="Referência de acesso, síndico ou preferência de horário"
          rows={3}
          error={errors.notes?.message}
          {...register("notes")}
        />
      </form>
    </BottomSheet>
  );
}
