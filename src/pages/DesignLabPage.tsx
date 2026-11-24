import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Badge } from "@/components/ui/Badge";
import { LabComponentsPreview } from "@/features/lab/components/LabComponentsPreview";
import { LabControlBar } from "@/features/lab/components/LabControlBar";
import { LabFinancePreview } from "@/features/lab/components/LabFinancePreview";
import { LabQuotesPreview } from "@/features/lab/components/LabQuotesPreview";
import { LAB_QUOTES, type LabQuoteItem } from "@/features/lab/labMockData";
import {
  LAB_FONTS,
  LAB_THEMES,
  type LabCardStyle,
  type LabFontMode,
  type LabSummaryMode,
  type LabThemeId,
} from "@/features/lab/labThemes";
import { formatCentsToBRL } from "@/lib/money";

export function DesignLabPage() {
  const [themeId, setThemeId] = useState<LabThemeId>("mono");
  const [cardStyle, setCardStyle] = useState<LabCardStyle>("cards");
  const [summaryMode, setSummaryMode] = useState<LabSummaryMode>("dark");
  const [fontMode, setFontMode] = useState<LabFontMode>("inter");
  const [inspectedQuote, setInspectedQuote] = useState<LabQuoteItem | null>(null);

  const activeTheme = LAB_THEMES[themeId];
  const activeFont = LAB_FONTS[fontMode];

  useEffect(() => {
    document.title = "Design Lab | FixFlow";
  }, []);

  useEffect(() => {
    document.body.style.fontFamily = activeFont.fontFamily;
    return () => {
      document.body.style.fontFamily = "";
    };
  }, [activeFont.fontFamily]);

  useEffect(() => {
    if (!activeFont.googleFontQuery) {
      return;
    }

    const linkId = `fixflow-lab-font-${activeFont.id}`;
    if (document.getElementById(linkId)) {
      return;
    }

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${activeFont.googleFontQuery}&display=swap`;
    document.head.appendChild(link);
  }, [activeFont]);

  function handleSelectTheme(nextId: LabThemeId) {
    setThemeId(nextId);
    setSummaryMode(LAB_THEMES[nextId].defaultSummaryMode);
  }

  return (
    <div
      className="min-h-dvh bg-neutral-100 text-neutral-950"
      style={{ fontFamily: activeFont.fontFamily }}
    >
      <LabControlBar
        themeId={themeId}
        onSelectTheme={handleSelectTheme}
        cardStyle={cardStyle}
        onChangeCardStyle={setCardStyle}
        summaryMode={summaryMode}
        onChangeSummaryMode={setSummaryMode}
        fontMode={fontMode}
        onChangeFontMode={setFontMode}
      />

      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-5 pb-12">
        <LabQuotesPreview
          theme={activeTheme}
          cardStyle={cardStyle}
          onInspectQuote={(quote) => setInspectedQuote(quote)}
          onOpenBellNotice={() => setInspectedQuote(LAB_QUOTES[0])}
        />

        <LabFinancePreview
          theme={activeTheme}
          cardStyle={cardStyle}
          summaryMode={summaryMode}
        />

        <LabComponentsPreview
          theme={activeTheme}
          onOpenSampleSheet={() => setInspectedQuote(LAB_QUOTES[0])}
        />
      </main>

      <BottomSheet
        open={inspectedQuote !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setInspectedQuote(null);
          }
        }}
        title={
          inspectedQuote
            ? `Orçamento ${inspectedQuote.number}`
            : "Prévia de BottomSheet"
        }
        description={inspectedQuote?.clientName}
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInspectedQuote(null)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
              style={{
                backgroundColor: activeTheme.secondaryBtnBg,
                borderColor: activeTheme.secondaryBtnBorder,
                color: activeTheme.secondaryBtnText,
              }}
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => setInspectedQuote(null)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
              style={{
                backgroundColor: activeTheme.accentBg,
                color: activeTheme.accentTextOnAccent,
                boxShadow: activeTheme.tactileAccentShadow,
              }}
            >
              Confirmar ação
            </button>
          </div>
        }
      >
        {inspectedQuote ? (
          <div
            className="flex flex-col gap-4 pb-2"
            style={{ fontFamily: activeFont.fontFamily, color: activeTheme.textPrimary }}
          >
            <div
              className="rounded-xl border p-4"
              style={{
                backgroundColor: activeTheme.canvasBg,
                borderColor: activeTheme.borderSubtle,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant={inspectedQuote.badgeVariant}>
                  {inspectedQuote.statusLabel}
                </Badge>
                <span
                  className="text-xs tabular-nums"
                  style={{ color: activeTheme.textSecondary }}
                >
                  {inspectedQuote.dateLabel}
                </span>
              </div>

              <p className="mt-2 text-base font-semibold">
                {inspectedQuote.title}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {formatCentsToBRL(inspectedQuote.totalCents)}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lab-sheet-notes"
                className="text-sm font-medium"
                style={{ color: activeTheme.textPrimary }}
              >
                Observações do orçamento
              </label>
              <input
                id="lab-sheet-notes"
                type="text"
                defaultValue="Garantia de 90 dias sobre os serviços executados."
                className="min-h-11 w-full rounded-lg border px-3.5 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
                style={{
                  backgroundColor: activeTheme.cardBg,
                  borderColor: activeTheme.borderStrong,
                  color: activeTheme.textPrimary,
                }}
              />
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
