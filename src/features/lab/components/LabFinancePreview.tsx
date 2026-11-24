import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  LAB_TODAY_ISO,
  LAB_TRANSACTIONS,
  type LabTransactionItem,
} from "@/features/lab/labMockData";
import type {
  LabCardStyle,
  LabSummaryMode,
  LabThemeSpec,
} from "@/features/lab/labThemes";
import { calculateCashbookSummary, isTransactionOverdue } from "@/lib/finance";
import { formatCentsToBRL } from "@/lib/money";

interface LabFinancePreviewProps {
  theme: LabThemeSpec;
  cardStyle: LabCardStyle;
  summaryMode: LabSummaryMode;
}

export function LabFinancePreview({
  theme,
  cardStyle,
  summaryMode,
}: LabFinancePreviewProps) {
  const [transactions, setTransactions] = useState<LabTransactionItem[]>(() => [
    ...LAB_TRANSACTIONS,
  ]);

  const summary = useMemo(
    () => calculateCashbookSummary(transactions, LAB_TODAY_ISO),
    [transactions],
  );

  const totalExpectedIncome =
    summary.receivedIncomeCents + summary.pendingIncomeCents;
  const receivedRatioPercent =
    totalExpectedIncome > 0
      ? Math.min(
          100,
          Math.round((summary.receivedIncomeCents / totalExpectedIncome) * 100),
        )
      : 0;

  function toggleTransactionStatus(id: string) {
    setTransactions((current) =>
      current.map((item) => {
        if (item.id !== id || item.sourceKind === "quote") {
          return item;
        }
        return {
          ...item,
          status: item.status === "paid" ? "pending" : "paid",
        };
      }),
    );
  }

  const isDarkSummary = summaryMode === "dark";

  return (
    <section
      aria-label="Prévia da tela Financeiro"
      className="overflow-hidden rounded-2xl border"
      style={{
        backgroundColor: theme.canvasBg,
        borderColor: theme.borderSubtle,
        color: theme.textPrimary,
      }}
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Mês anterior (exemplo)"
            onClick={() => setTransactions([...LAB_TRANSACTIONS])}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.borderStrong,
              color: theme.textPrimary,
            }}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>

          <h2
            className="min-w-0 flex-1 text-center text-base font-semibold tabular-nums"
            style={{ color: theme.textPrimary }}
          >
            Novembro de 2026
          </h2>

          <button
            type="button"
            aria-label="Restaurar dados do exemplo"
            onClick={() => setTransactions([...LAB_TRANSACTIONS])}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.borderStrong,
              color: theme.textPrimary,
            }}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div
          className="rounded-xl border p-4"
          style={
            isDarkSummary
              ? {
                  backgroundColor: theme.summaryDarkBg,
                  borderColor: theme.summaryDarkBorder,
                  color: theme.summaryDarkText,
                }
              : {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.borderSubtle,
                  color: theme.textPrimary,
                }
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-xs font-medium"
                style={{
                  color: isDarkSummary ? theme.summaryDarkMuted : theme.textSecondary,
                }}
              >
                Saldo realizado
              </p>
              <p
                className="mt-1 text-3xl font-semibold tracking-tight tabular-nums"
                style={{
                  color:
                    summary.realizedBalanceCents < 0
                      ? isDarkSummary
                        ? theme.summaryDarkDanger
                        : "#B91C1C"
                      : isDarkSummary
                        ? theme.summaryDarkText
                        : theme.textPrimary,
                }}
              >
                {formatCentsToBRL(summary.realizedBalanceCents)}
              </p>
            </div>

            {summary.overdueCount > 0 ? (
              <span
                className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums"
                style={
                  isDarkSummary
                    ? { backgroundColor: "#991B1B", color: "#FEE2E2" }
                    : { backgroundColor: "#FEF2F2", color: "#B91C1C" }
                }
              >
                {summary.overdueCount} atrasado
              </span>
            ) : null}
          </div>

          <dl
            className="mt-3 grid grid-cols-3 gap-3 border-t pt-3"
            style={{
              borderColor: isDarkSummary
                ? theme.summaryDarkBorder
                : theme.borderSubtle,
            }}
          >
            <div>
              <dt
                className="text-xs"
                style={{
                  color: isDarkSummary ? theme.summaryDarkMuted : theme.textSecondary,
                }}
              >
                Entradas
              </dt>
              <dd
                className="mt-0.5 text-sm font-semibold tabular-nums"
                style={{
                  color: isDarkSummary ? theme.summaryDarkIncome : "#065F46",
                }}
              >
                {formatCentsToBRL(summary.receivedIncomeCents)}
              </dd>
            </div>
            <div>
              <dt
                className="text-xs"
                style={{
                  color: isDarkSummary ? theme.summaryDarkMuted : theme.textSecondary,
                }}
              >
                Saídas
              </dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                {formatCentsToBRL(summary.paidExpenseCents)}
              </dd>
            </div>
            <div>
              <dt
                className="text-xs"
                style={{
                  color: isDarkSummary ? theme.summaryDarkMuted : theme.textSecondary,
                }}
              >
                Previsto
              </dt>
              <dd
                className="mt-0.5 text-sm font-semibold tabular-nums"
                style={{
                  color: isDarkSummary ? theme.summaryDarkMuted : theme.textSecondary,
                }}
              >
                {formatCentsToBRL(summary.projectedBalanceCents)}
              </dd>
            </div>
          </dl>

          <div className="mt-3.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span
                style={{
                  color: isDarkSummary ? theme.summaryDarkMuted : theme.textSecondary,
                }}
              >
                Recebido no mês
              </span>
              <span className="font-semibold tabular-nums">
                {receivedRatioPercent}% de {formatCentsToBRL(totalExpectedIncome)}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
              style={{
                backgroundColor: isDarkSummary
                  ? theme.summaryDarkBorder
                  : theme.subtleBg,
              }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${receivedRatioPercent}%`,
                  backgroundColor: isDarkSummary
                    ? theme.summaryDarkIncome
                    : theme.accentBg,
                }}
              />
            </div>
          </div>
        </div>

        <ul
          className={
            cardStyle === "cards"
              ? "flex flex-col gap-2.5"
              : "divide-y overflow-hidden rounded-xl border"
          }
          style={
            cardStyle === "divided"
              ? {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.borderSubtle,
                }
              : undefined
          }
        >
          {transactions.map((item) => {
            const isIncome = item.type === "income";
            const isPaid = item.status === "paid";
            const isOverdue = isTransactionOverdue(item, LAB_TODAY_ISO);

            return (
              <li
                key={item.id}
                className={
                  cardStyle === "cards"
                    ? "rounded-xl border p-3.5"
                    : "px-3.5 py-3.5"
                }
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.borderSubtle,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isPaid ? (
                        <Badge variant="success">
                          {isIncome ? "Recebido" : "Pago"}
                        </Badge>
                      ) : isOverdue ? (
                        <Badge variant="danger">Atrasado</Badge>
                      ) : (
                        <Badge variant="warning">Pendente</Badge>
                      )}
                      <span
                        className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: theme.subtleBg,
                          color: theme.textSecondary,
                        }}
                      >
                        {item.category}
                      </span>
                    </div>

                    <p
                      className="mt-1.5 truncate text-sm font-semibold"
                      style={{ color: theme.textPrimary }}
                    >
                      {item.description}
                    </p>
                    <p
                      className="mt-1 text-xs tabular-nums"
                      style={{ color: theme.textSecondary }}
                    >
                      {item.dueLabel}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className="text-base font-semibold tabular-nums"
                      style={{
                        color: isIncome ? "#065F46" : theme.textPrimary,
                      }}
                    >
                      {isIncome ? "+" : "-"} {formatCentsToBRL(item.amount_cents)}
                    </p>
                  </div>
                </div>

                {item.sourceKind !== "quote" ? (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => toggleTransactionStatus(item.id)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                      style={
                        !isPaid
                          ? {
                              backgroundColor: theme.accentBg,
                              borderColor: theme.accentBg,
                              color: theme.accentTextOnAccent,
                              boxShadow: theme.tactileAccentShadow,
                            }
                          : {
                              backgroundColor: theme.secondaryBtnBg,
                              borderColor: theme.secondaryBtnBorder,
                              color: theme.secondaryBtnText,
                              boxShadow: theme.tactileSecondaryShadow,
                            }
                      }
                    >
                      {!isPaid ? (
                        <>
                          <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                          <span>{isIncome ? "Receber" : "Pagar"}</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                          <span>Reabrir</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
