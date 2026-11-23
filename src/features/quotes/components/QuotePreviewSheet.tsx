import { useRef, useState } from "react";
import {
  Check,
  Copy,
  FileDown,
  ImageDown,
  MessageCircle,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useBusinessProfile } from "@/features/profile/hooks/useBusinessProfile";
import { QuoteDocumentPreview } from "@/features/quotes/components/QuoteDocumentPreview";
import {
  buildQuoteWhatsAppMessage,
  formatQuoteNumber,
} from "@/features/quotes/constants/quoteStatus";
import { useCopyFeedback } from "@/features/quotes/hooks/useCopyFeedback";
import { generateQuoteStaticPix } from "@/lib/pix";
import {
  deliverQuoteExportFile,
  exportQuoteElementAsPdfBlob,
  exportQuoteElementAsPngBlob,
  type QuoteExportFormat,
} from "@/lib/quoteExport";
import { buildQuoteExportFilename } from "@/lib/quoteExportUtils";
import { buildWhatsAppUrl } from "@/lib/utils";
import type { QuoteWithItems } from "@/services/quotes.service";

interface QuotePreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteWithItems;
}

const SECONDARY_LINK_CLASSNAME =
  "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-500 bg-white px-3 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950";

export function QuotePreviewSheet({
  open,
  onOpenChange,
  quote,
}: QuotePreviewSheetProps) {
  const { data: profile, isLoading: isProfileLoading } = useBusinessProfile({
    enabled: open,
  });
  const documentRef = useRef<HTMLElement | null>(null);
  const { copied, copy: copySummary } = useCopyFeedback();
  const { copied: pixCopied, copy: copyPix } = useCopyFeedback();
  const [exportingFormat, setExportingFormat] =
    useState<QuoteExportFormat | null>(null);

  const isExporting = exportingFormat !== null;
  const exportDisabled = isExporting || isProfileLoading;

  const summaryMessage = buildQuoteWhatsAppMessage(
    quote,
    profile?.business_name,
  );
  const whatsappUrl = buildWhatsAppUrl(quote.client_phone, summaryMessage);
  const pixData = generateQuoteStaticPix(quote, profile);
  const pixWhatsappUrl = pixData
    ? buildWhatsAppUrl(quote.client_phone, pixData.payload)
    : null;

  async function handleExport(format: QuoteExportFormat) {
    const documentElement = documentRef.current;
    if (!documentElement || exportingFormat !== null) {
      return;
    }

    setExportingFormat(format);

    try {
      const blob =
        format === "pdf"
          ? await exportQuoteElementAsPdfBlob(documentElement)
          : await exportQuoteElementAsPngBlob(documentElement);

      const filename = buildQuoteExportFilename(
        quote.quote_number,
        quote.client_name,
        format,
      );
      const quoteLabel = formatQuoteNumber(quote.quote_number);
      const outcome = await deliverQuoteExportFile(blob, filename, {
        title: `Orçamento ${quoteLabel}`,
        text: summaryMessage,
      });

      if (outcome === "shared") {
        toast.success("Orçamento compartilhado.");
      } else if (outcome === "downloaded") {
        const successMessage =
          format === "pdf"
            ? "PDF do orçamento baixado."
            : "Imagem do orçamento baixada.";

        if (whatsappUrl) {
          toast.success(successMessage, {
            description: "Anexe o arquivo baixado na conversa do cliente.",
            duration: 8000,
            action: {
              label: "Abrir WhatsApp",
              onClick: () => {
                window.open(whatsappUrl, "_blank", "noopener,noreferrer");
              },
            },
          });
        } else {
          toast.success(successMessage);
        }
      }
    } catch {
      toast.error(
        format === "pdf"
          ? "Não foi possível gerar o PDF do orçamento."
          : "Não foi possível gerar a imagem do orçamento.",
      );
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isExporting) {
          onOpenChange(nextOpen);
        }
      }}
      title={`Prévia do orçamento ${formatQuoteNumber(quote.quote_number)}`}
      description={
        quote.show_item_prices
          ? "Valores unitários visíveis para o cliente"
          : "Valores unitários ocultos. Somente total global visível"
      }
      fullHeight
      footer={
        <div className="flex flex-col gap-2">
          {!whatsappUrl ? (
            <p className="text-center text-xs text-neutral-600">
              Cadastre o telefone do cliente para abrir direto no WhatsApp.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              aria-label="Exportar PDF"
              isLoading={exportingFormat === "pdf"}
              disabled={exportDisabled}
              onClick={() => {
                void handleExport("pdf");
              }}
            >
              {exportingFormat === "pdf" ? null : (
                <FileDown
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
              <span>PDF</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              className="w-full"
              aria-label="Exportar imagem"
              isLoading={exportingFormat === "png"}
              disabled={exportDisabled}
              onClick={() => {
                void handleExport("png");
              }}
            >
              {exportingFormat === "png" ? null : (
                <ImageDown
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
              <span>Imagem</span>
            </Button>
          </div>

          <div className={whatsappUrl ? "grid grid-cols-2 gap-2" : undefined}>
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              disabled={isExporting}
              onClick={() => {
                void copySummary(summaryMessage, {
                  success: "Resumo copiado.",
                  error: "Não foi possível copiar o resumo automaticamente.",
                });
              }}
            >
              {copied ? (
                <Check
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : (
                <Copy
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
              <span>{copied ? "Copiado" : "Copiar resumo"}</span>
            </Button>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={SECONDARY_LINK_CLASSNAME}
              >
                <MessageCircle
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>WhatsApp</span>
              </a>
            ) : null}
          </div>

          {pixData ? (
            <div
              className={pixWhatsappUrl ? "grid grid-cols-2 gap-2" : undefined}
            >
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                disabled={isExporting}
                onClick={() => {
                  void copyPix(pixData.payload, {
                    success: "Pix Copia e Cola copiado.",
                    error:
                      "Não foi possível copiar o código Pix automaticamente.",
                  });
                }}
              >
                {pixCopied ? (
                  <Check
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                ) : (
                  <QrCode
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                )}
                <span>
                  {pixCopied
                    ? "Pix copiado"
                    : pixWhatsappUrl
                      ? "Copiar Pix"
                      : "Copiar Pix Copia e Cola"}
                </span>
              </Button>

              {pixWhatsappUrl ? (
                <a
                  href={pixWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={SECONDARY_LINK_CLASSNAME}
                >
                  <MessageCircle
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="truncate">Pix no WhatsApp</span>
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      }
    >
      <div className="pb-4">
        <QuoteDocumentPreview
          ref={documentRef}
          quote={quote}
          profile={profile}
        />
      </div>
    </BottomSheet>
  );
}
