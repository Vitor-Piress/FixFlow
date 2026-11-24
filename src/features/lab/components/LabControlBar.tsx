import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import {
  LAB_FONT_ORDER,
  LAB_FONTS,
  LAB_THEME_ORDER,
  LAB_THEMES,
  type LabCardStyle,
  type LabFontMode,
  type LabSummaryMode,
  type LabThemeId,
} from "@/features/lab/labThemes";
import { cn } from "@/lib/utils";

interface LabControlBarProps {
  themeId: LabThemeId;
  onSelectTheme: (id: LabThemeId) => void;
  cardStyle: LabCardStyle;
  onChangeCardStyle: (style: LabCardStyle) => void;
  summaryMode: LabSummaryMode;
  onChangeSummaryMode: (mode: LabSummaryMode) => void;
  fontMode: LabFontMode;
  onChangeFontMode: (mode: LabFontMode) => void;
}

export function LabControlBar({
  themeId,
  onSelectTheme,
  cardStyle,
  onChangeCardStyle,
  summaryMode,
  onChangeSummaryMode,
  fontMode,
  onChangeFontMode,
}: LabControlBarProps) {
  const activeTheme = LAB_THEMES[themeId];
  const activeFont = LAB_FONTS[fontMode];

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-900">
              <SlidersHorizontal
                className="h-3.5 w-3.5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Design Lab</span>
            </span>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              DEV ONLY
            </span>
          </div>

          <Link
            to="/quotes"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-neutral-500 bg-white px-3 text-xs font-medium text-neutral-950 transition-colors hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
          >
            <ArrowLeft
              className="h-3.5 w-3.5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>Voltar ao app</span>
          </Link>
        </div>

        <div
          role="group"
          aria-label="Selecionar direção visual"
          className="grid grid-cols-2 gap-2"
        >
          {LAB_THEME_ORDER.map((id) => {
            const theme = LAB_THEMES[id];
            const isSelected = id === themeId;

            return (
              <button
                key={id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectTheme(id)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950",
                  isSelected
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100",
                )}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-black/15"
                  style={{ backgroundColor: theme.canvasBg }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: theme.accentBg }}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate">{theme.name}</span>
              </button>
            );
          })}
        </div>

        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5">
          <div
            role="group"
            aria-label="Estilo dos itens"
            className="inline-flex shrink-0 rounded-lg border border-neutral-300 bg-neutral-100 p-0.5"
          >
            <button
              type="button"
              aria-pressed={cardStyle === "cards"}
              onClick={() => onChangeCardStyle("cards")}
              className={cn(
                "min-h-11 rounded-md px-2.5 text-xs font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
                cardStyle === "cards"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-950",
              )}
            >
              Cards
            </button>
            <button
              type="button"
              aria-pressed={cardStyle === "divided"}
              onClick={() => onChangeCardStyle("divided")}
              className={cn(
                "min-h-11 rounded-md px-2.5 text-xs font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
                cardStyle === "divided"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-950",
              )}
            >
              Lista 1px
            </button>
          </div>

          <div
            role="group"
            aria-label="Estilo do resumo financeiro"
            className="inline-flex shrink-0 rounded-lg border border-neutral-300 bg-neutral-100 p-0.5"
          >
            <button
              type="button"
              aria-pressed={summaryMode === "dark"}
              onClick={() => onChangeSummaryMode("dark")}
              className={cn(
                "min-h-11 rounded-md px-2.5 text-xs font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
                summaryMode === "dark"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-950",
              )}
            >
              Resumo escuro
            </button>
            <button
              type="button"
              aria-pressed={summaryMode === "light"}
              onClick={() => onChangeSummaryMode("light")}
              className={cn(
                "min-h-11 rounded-md px-2.5 text-xs font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
                summaryMode === "light"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-950",
              )}
            >
              Resumo claro
            </button>
          </div>
        </div>

        <div
          role="group"
          aria-label="Tipografia da prévia"
          className="no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-0.5"
        >
          {LAB_FONT_ORDER.map((id) => {
            const option = LAB_FONTS[id];
            const isSelected = fontMode === id;

            return (
              <button
                key={id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onChangeFontMode(id)}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 text-xs font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
                  isSelected
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5 text-xs text-zinc-600">
          <p className="leading-snug">
            <span className="font-semibold text-zinc-950">
              Fonte: {activeFont.label}
            </span>
            {" · "}
            {activeFont.description}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 flex-1 leading-snug">{activeTheme.tagline}</p>
            <div className="flex shrink-0 items-center gap-1.5">
              {activeTheme.swatches.map((swatch) => (
                <span
                  key={swatch.label}
                  title={`${swatch.label}: ${swatch.hex}`}
                  className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-neutral-800 tabular-nums"
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-xs border border-black/15"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <span>{swatch.hex}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
