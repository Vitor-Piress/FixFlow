import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import {
  useOpenContractPdf,
  useUploadContractPdf,
} from "@/features/contracts/hooks/useContracts";
import { extractPdfFileName, validateContractPdfFile } from "@/lib/files";
import type { Contract } from "@/services/contracts.service";

interface ContractPdfSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onRequestRemovePdf: (contract: Contract) => void;
}

interface FallbackLinkState {
  contractId: string;
  pdfPath: string;
  url: string;
}

export function ContractPdfSheet({
  open,
  onOpenChange,
  contract,
  onRequestRemovePdf,
}: ContractPdfSheetProps) {
  const openPdf = useOpenContractPdf();
  const uploadPdf = useUploadContractPdf();

  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fallbackLink, setFallbackLink] = useState<FallbackLinkState | null>(
    null,
  );

  useEffect(() => {
    if (!fallbackLink) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFallbackLink(null);
    }, 55_000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fallbackLink]);

  const isBusy = openPdf.isPending || uploadPdf.isPending;

  function clearTransientState() {
    setFileError(null);
    setFallbackLink(null);
  }

  function handleSheetOpenChange(nextOpen: boolean) {
    if (isBusy) {
      return;
    }

    if (!nextOpen) {
      clearTransientState();
    }

    onOpenChange(nextOpen);
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !contract) {
      return;
    }

    const validationError = validateContractPdfFile(file);
    if (validationError) {
      setFileError(validationError);
      toast.error(validationError);
      return;
    }

    setFileError(null);
    setFallbackLink(null);

    try {
      await uploadPdf.mutateAsync({
        contractId: contract.id,
        file,
        previousPdfPath: contract.pdf_path,
      });
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  async function handleOpenPdf() {
    if (!contract?.pdf_path) {
      return;
    }

    setFileError(null);
    setFallbackLink(null);

    try {
      const result = await openPdf.openPdf(contract.pdf_path);
      if (!result.opened) {
        setFallbackLink({
          contractId: contract.id,
          pdfPath: contract.pdf_path,
          url: result.signedUrl,
        });
        toast.info(
          "O navegador bloqueou a nova aba. Toque em Abrir PDF manualmente.",
        );
      }
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  function handleRequestRemove() {
    if (!contract) {
      return;
    }

    clearTransientState();
    onOpenChange(false);
    onRequestRemovePdf(contract);
  }

  const activeFallbackUrl =
    contract?.pdf_path &&
    fallbackLink &&
    fallbackLink.contractId === contract.id &&
    fallbackLink.pdfPath === contract.pdf_path
      ? fallbackLink.url
      : null;

  return (
    <BottomSheet
      open={open && contract !== null}
      onOpenChange={handleSheetOpenChange}
      title="PDF do contrato"
      description={contract ? contract.client_name : undefined}
    >
      <div className="flex flex-col gap-4 pb-2">
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept="application/pdf,.pdf"
          aria-label="Selecionar arquivo PDF do contrato"
          tabIndex={-1}
          className="sr-only"
          onChange={(event) => {
            void handleFileSelected(event);
          }}
        />

        {contract?.pdf_path ? (
          <>
            <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700">
                <FileText
                  className="h-5 w-5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-all text-sm font-medium text-neutral-950">
                  {extractPdfFileName(contract.pdf_path)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-600">
                  Documento vinculado em armazenamento privado
                </p>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              isLoading={openPdf.isPending}
              disabled={uploadPdf.isPending}
              onClick={() => {
                void handleOpenPdf();
              }}
            >
              <ExternalLink
                className="h-4 w-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Abrir PDF</span>
            </Button>

            {activeFallbackUrl ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3.5">
                <p className="text-xs leading-relaxed text-sky-800">
                  Bloqueio de janela detectado. Use o link direto abaixo para
                  visualizar o contrato (válido por 60 segundos).
                </p>
                <a
                  href={activeFallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setFallbackLink(null)}
                  className="mt-2.5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-neutral-950 bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 active:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                >
                  <ExternalLink
                    className="h-4 w-4"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span>Abrir PDF manualmente</span>
                </a>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Button
                variant="secondary"
                size="lg"
                isLoading={uploadPdf.isPending}
                disabled={openPdf.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload
                  className="h-4 w-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>Substituir PDF</span>
              </Button>

              <Button
                variant="danger"
                size="lg"
                disabled={isBusy}
                onClick={handleRequestRemove}
              >
                <Trash2
                  className="h-4 w-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>Remover PDF</span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-5 py-7 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700">
                <FileText
                  className="h-5 w-5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </div>
              <p className="text-sm font-semibold text-neutral-950">
                Nenhum PDF anexado
              </p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-neutral-600">
                Envie a cópia assinada do contrato em formato PDF (limite de 10
                MB).
              </p>
            </div>

            <Button
              size="lg"
              className="w-full"
              isLoading={uploadPdf.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload
                className="h-4 w-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Selecionar PDF (até 10 MB)</span>
            </Button>
          </>
        )}

        {fileError ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
          >
            {fileError}
          </p>
        ) : null}

        <p className="text-xs leading-relaxed text-neutral-600">
          O documento fica protegido e cada visualização gera um link temporário
          com expiração de 60 segundos.
        </p>
      </div>
    </BottomSheet>
  );
}
