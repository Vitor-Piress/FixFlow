import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Upload, X } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  useCreateContract,
  useUpdateContract,
} from "@/features/contracts/hooks/useContracts";
import {
  contractSchema,
  type ContractFormValues,
} from "@/features/contracts/schemas/contractSchema";
import { getTodayISODate } from "@/lib/dates";
import {
  extractPdfFileName,
  formatFileSizeBR,
  validateContractPdfFile,
} from "@/lib/files";
import { emptyStringToNull } from "@/lib/utils";
import type { Contract } from "@/services/contracts.service";

interface ContractFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
}

function buildCreateDefaults(): ContractFormValues {
  return {
    client_name: "",
    client_phone: "",
    scope_description: "",
    monthly_amount_cents: 0,
    due_day: new Date().getDate(),
    started_at: getTodayISODate(),
    ended_at: "",
  };
}

function mapContractToFormValues(contract: Contract): ContractFormValues {
  return {
    client_name: contract.client_name,
    client_phone: contract.client_phone ?? "",
    scope_description: contract.scope_description ?? "",
    monthly_amount_cents: contract.monthly_amount_cents,
    due_day: contract.due_day,
    started_at: contract.started_at,
    ended_at: contract.ended_at ?? "",
  };
}

export function ContractFormSheet({
  open,
  onOpenChange,
  contract,
}: ContractFormSheetProps) {
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const isEditing = contract !== null;
  const isSaving = createContract.isPending || updateContract.isPending;

  const pdfInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: buildCreateDefaults(),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(contract ? mapContractToFormValues(contract) : buildCreateDefaults());
  }, [open, contract, reset]);

  const watchedStartedAt = useWatch({ control, name: "started_at" }) ?? "";

  function clearSelectedPdf() {
    setSelectedPdfFile(null);
    setPdfError(null);
  }

  function handleSheetOpenChange(nextOpen: boolean) {
    if (isSaving) {
      return;
    }

    if (!nextOpen) {
      clearSelectedPdf();
    }

    onOpenChange(nextOpen);
  }

  function handlePdfFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    const validationError = validateContractPdfFile(file);
    if (validationError) {
      setSelectedPdfFile(null);
      setPdfError(validationError);
      return;
    }

    setPdfError(null);
    setSelectedPdfFile(file);
  }

  async function onSubmit(values: ContractFormValues) {
    const payload = {
      client_name: values.client_name.trim(),
      client_phone: emptyStringToNull(values.client_phone),
      scope_description: emptyStringToNull(values.scope_description),
      monthly_amount_cents: values.monthly_amount_cents,
      due_day: values.due_day,
      started_at: values.started_at,
      ended_at: emptyStringToNull(values.ended_at),
    };

    try {
      if (contract) {
        await updateContract.mutateAsync({
          id: contract.id,
          payload,
        });
      } else {
        await createContract.mutateAsync({
          payload,
          pdfFile: selectedPdfFile,
        });
      }

      clearSelectedPdf();
      onOpenChange(false);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleSheetOpenChange}
      title={isEditing ? "Editar contrato" : "Novo contrato mensal"}
      description="Valor mensal, vencimento e vigência do atendimento"
      fullHeight
      footer={
        <Button
          type="submit"
          form="contract-form"
          size="lg"
          className="w-full"
          isLoading={isSaving}
          disabled={isEditing && !isDirty}
        >
          {isEditing ? "Salvar alterações" : "Cadastrar contrato"}
        </Button>
      }
    >
      <form
        id="contract-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 pb-6"
      >
        <Input
          label="Nome do cliente"
          placeholder="Condomínio, empresa ou cliente"
          error={errors.client_name?.message}
          {...register("client_name")}
        />

        <Input
          label="Telefone / WhatsApp (opcional)"
          type="tel"
          inputMode="tel"
          placeholder="(48) 99999-9999"
          error={errors.client_phone?.message}
          {...register("client_phone")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="monthly_amount_cents"
            render={({ field }) => (
              <CurrencyInput
                label="Valor mensal"
                valueCents={field.value}
                onChangeCents={field.onChange}
                onBlur={field.onBlur}
                error={errors.monthly_amount_cents?.message}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Início da vigência"
            type="date"
            className="tabular-nums"
            error={errors.started_at?.message}
            {...register("started_at")}
          />

          <Input
            label="Término (opcional)"
            type="date"
            min={watchedStartedAt || undefined}
            className="tabular-nums"
            hint="Deixe vazio se for contínuo."
            error={errors.ended_at?.message}
            {...register("ended_at")}
          />
        </div>

        <Textarea
          label="Escopo do contrato (opcional)"
          placeholder="Ex.: Manutenção preventiva mensal em 4 equipamentos split"
          rows={3}
          error={errors.scope_description?.message}
          {...register("scope_description")}
        />

        {!isEditing ? (
          <div className="flex flex-col gap-2">
            <label
              htmlFor={pdfInputId}
              className="text-sm font-medium text-neutral-900"
            >
              Contrato em PDF (opcional)
            </label>

            <input
              ref={fileInputRef}
              id={pdfInputId}
              type="file"
              accept="application/pdf,.pdf"
              tabIndex={-1}
              className="sr-only"
              onChange={handlePdfFileChange}
            />

            {selectedPdfFile ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileText
                    className="h-4 w-4 shrink-0 text-neutral-700"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-950">
                      {selectedPdfFile.name}
                    </p>
                    <p className="text-xs text-neutral-600 tabular-nums">
                      {formatFileSizeBR(selectedPdfFile.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearSelectedPdf}
                  disabled={isSaving}
                  aria-label="Remover seleção de PDF"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <Button
                variant="secondary"
                disabled={isSaving}
                onClick={() => fileInputRef.current?.click()}
                className="w-full justify-start"
              >
                <Upload
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>Selecionar PDF (até 10 MB)</span>
              </Button>
            )}

            {pdfError ? (
              <p role="alert" className="text-xs text-red-700">
                {pdfError}
              </p>
            ) : (
              <p className="text-xs text-neutral-500">
                Somente arquivo PDF até 10 MB. Armazenamento privado.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-xs leading-relaxed text-neutral-600">
            {contract.pdf_path
              ? `PDF atual: ${extractPdfFileName(contract.pdf_path)}. Para abrir, substituir ou remover o arquivo, use o botão PDF na lista de contratos.`
              : "Para anexar ou trocar o PDF deste contrato, use o botão Anexar PDF na lista de contratos."}
          </div>
        )}
      </form>
    </BottomSheet>
  );
}
