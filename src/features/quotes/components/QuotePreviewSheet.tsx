import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useBusinessProfile } from "@/features/profile/hooks/useBusinessProfile";
import { QuoteDocumentPreview } from "@/features/quotes/components/QuoteDocumentPreview";
import {
  buildQuoteWhatsAppMessage,
  formatQuoteNumber,
} from "@/features/quotes/constants/quoteStatus";
import { buildWhatsAppUrl } from "@/lib/utils";
import type { QuoteWithItems } from "@/services/quotes.service";

interface QuotePreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteWithItems;
}

export function QuotePreviewSheet({
  open,
  onOpenChange,
  quote,
}: QuotePreviewSheetProps) {
  const { data: profile } = useBusinessProfile({ enabled: open });
  const [copied, setCopied] = useState(false);

  const summaryMessage = buildQuoteWhatsAppMessage(
    quote,
    profile?.business_name,
  );
  const whatsappUrl = buildWhatsAppUrl(quote.client_phone, summaryMessage);

  async function handleCopySummary() {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(summaryMessage);
      setCopied(true);
      toast.success("Resumo copiado.");
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast.error("Não foi possível copiar o resumo automaticamente.");
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
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

          <div className="flex items-center gap-2.5">
            <Button
              variant={whatsappUrl ? "secondary" : "primary"}
              size="lg"
              className="flex-1"
              onClick={() => {
                void handleCopySummary();
              }}
            >
              {copied ? (
                <Check className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              )}
              <span>{copied ? "Copiado" : "Copiar resumo"}</span>
            </Button>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-950 bg-neutral-950 px-4 text-base font-medium text-white transition-colors hover:bg-neutral-800 active:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
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
        </div>
      }
    >
      <div className="pb-4">
        <QuoteDocumentPreview quote={quote} profile={profile} />
      </div>
    </BottomSheet>
  );
}
