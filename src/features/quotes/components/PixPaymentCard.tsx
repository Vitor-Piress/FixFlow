import { Check, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { useCopyFeedback } from "@/features/quotes/hooks/useCopyFeedback";
import type { StaticPixPayload } from "@/lib/pix";
import { cn } from "@/lib/utils";

interface PixPaymentCardProps {
  pix: StaticPixPayload;
  showCopyAction?: boolean;
  className?: string;
}

export function PixPaymentCard({
  pix,
  showCopyAction = true,
  className,
}: PixPaymentCardProps) {
  const { copied, copy } = useCopyFeedback();

  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-neutral-950",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-md border border-neutral-200 bg-white p-1.5">
          <QRCodeSVG
            value={pix.payload}
            size={96}
            level="M"
            marginSize={2}
            bgColor="#FFFFFF"
            fgColor="#0A0A0A"
            role="img"
            aria-label={`QR Code Pix de ${pix.merchantName}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-neutral-950">
            Pagamento via Pix
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-neutral-600">
            Escaneie o QR Code ou use o Pix Copia e Cola.
          </p>

          <dl className="mt-2 flex flex-col gap-0.5 text-[11px] leading-snug">
            <div className="min-w-0">
              <dt className="inline text-neutral-600">Recebedor: </dt>
              <dd className="inline break-words font-medium text-neutral-950">
                {pix.merchantName}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="inline text-neutral-600">Chave: </dt>
              <dd className="inline break-all font-medium text-neutral-950 tabular-nums">
                {pix.pixKey}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="inline text-neutral-600">Referência: </dt>
              <dd className="inline break-all font-medium text-neutral-950 tabular-nums">
                {pix.txid}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {showCopyAction ? (
        <Button
          variant="secondary"
          size="md"
          className="mt-3 w-full"
          onClick={() => {
            void copy(pix.payload, {
              success: "Pix Copia e Cola copiado.",
              error: "Não foi possível copiar o código Pix automaticamente.",
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
          <span>{copied ? "Pix copiado" : "Copiar Pix Copia e Cola"}</span>
        </Button>
      ) : null}
    </div>
  );
}
