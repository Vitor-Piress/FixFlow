import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  getNextStatusTransitions,
  QUOTE_STATUS_META,
} from "@/features/quotes/constants/quoteStatus";
import { useUpdateQuoteStatus } from "@/features/quotes/hooks/useQuotes";
import { cn } from "@/lib/utils";
import type { QuoteStatus, QuoteWithItems } from "@/services/quotes.service";

interface QuoteStatusSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteWithItems;
  onRequestMarkPaid: () => void;
}

export function QuoteStatusSheet({
  open,
  onOpenChange,
  quote,
  onRequestMarkPaid,
}: QuoteStatusSheetProps) {
  const updateStatus = useUpdateQuoteStatus();
  const [pendingTarget, setPendingTarget] = useState<QuoteStatus | null>(null);

  const currentMeta = QUOTE_STATUS_META[quote.status];
  const transitions = getNextStatusTransitions(quote.status);
  const hasPaidInstallments = quote.payments.some(
    (payment) => payment.status === "paid",
  );

  async function handleSelectStatus(targetStatus: QuoteStatus) {
    if (targetStatus === "paid") {
      if (quote.total_cents <= 0) {
        return;
      }

      onOpenChange(false);
      onRequestMarkPaid();
      return;
    }

    setPendingTarget(targetStatus);
    try {
      await updateStatus.mutateAsync({
        id: quote.id,
        status: targetStatus,
      });
      onOpenChange(false);
    } catch {
      // Mutation onError already notifies the user via toast.
    } finally {
      setPendingTarget(null);
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!updateStatus.isPending) {
          onOpenChange(nextOpen);
        }
      }}
      title="Alterar status do orçamento"
      description="Escolha o estágio atual deste atendimento"
    >
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-neutral-500">Status atual</p>
            <p className="mt-1 text-sm text-neutral-600">
              {currentMeta.description}
            </p>
          </div>
          <Badge variant={currentMeta.badgeVariant} className="shrink-0">
            {currentMeta.label}
          </Badge>
        </div>

        {transitions.length === 0 ? (
          <p className="text-sm text-neutral-600">
            Este orçamento está bloqueado e não permite novas alterações de
            status.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {transitions.map((targetStatus) => {
              const meta = QUOTE_STATUS_META[targetStatus];
              const isPaidBlocked =
                targetStatus === "paid" && quote.total_cents <= 0;
              const isReopenBlocked =
                hasPaidInstallments &&
                (targetStatus === "draft" ||
                  targetStatus === "sent" ||
                  targetStatus === "canceled");
              const isBlocked = isPaidBlocked || isReopenBlocked;
              const isDisabled = updateStatus.isPending || isBlocked;
              const isSelectedPending = pendingTarget === targetStatus;

              return (
                <button
                  key={targetStatus}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    void handleSelectStatus(targetStatus);
                  }}
                  className={cn(
                    "flex min-h-11 w-full flex-col gap-1.5 rounded-lg border px-3.5 py-3 text-left transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950",
                    isBlocked
                      ? "border-neutral-300 bg-neutral-50 opacity-80"
                      : "border-neutral-500 bg-white enabled:hover:bg-neutral-50 enabled:active:bg-neutral-100",
                    updateStatus.isPending && !isSelectedPending
                      ? "opacity-50"
                      : undefined,
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-950">
                      {isSelectedPending
                        ? `Atualizando para ${meta.label}...`
                        : meta.label}
                    </span>
                    <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                  </div>

                  <p className="text-xs leading-relaxed text-neutral-600">
                    {meta.description}
                  </p>

                  {isPaidBlocked ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-red-700">
                      <AlertCircle
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>
                        Adicione itens com total maior que R$ 0,00 para marcar
                        como pago.
                      </span>
                    </p>
                  ) : null}

                  {isReopenBlocked ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-red-700">
                      <AlertCircle
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>
                        Reabra as parcelas já recebidas antes de voltar para este
                        status.
                      </span>
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
