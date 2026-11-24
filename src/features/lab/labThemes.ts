export type LabThemeId = "oficina" | "planta" | "campo" | "mono";
export type LabCardStyle = "cards" | "divided";
export type LabSummaryMode = "dark" | "light";
export type LabFontMode =
  | "inter"
  | "plus-jakarta"
  | "dm-sans"
  | "manrope"
  | "public-sans"
  | "source-sans-3"
  | "ibm-plex"
  | "system"
  | "instrument-sans";

export interface LabFontOption {
  id: LabFontMode;
  label: string;
  description: string;
  fontFamily: string;
  googleFontQuery?: string;
}

export const LAB_FONTS: Record<LabFontMode, LabFontOption> = {
  inter: {
    id: "inter",
    label: "Inter",
    description:
      "Fonte atual instalada no app · neutra e nítida para UI, tabelas e valores.",
    fontFamily:
      '"Inter Variable", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  "plus-jakarta": {
    id: "plus-jakarta",
    label: "Plus Jakarta Sans",
    description: "Geométrica moderna, equilibrada e confortável no celular.",
    fontFamily:
      '"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    googleFontQuery: "Plus+Jakarta+Sans:wght@400;500;600;700",
  },
  "dm-sans": {
    id: "dm-sans",
    label: "DM Sans",
    description: "Minimalista limpa com traço firme em títulos e preços.",
    fontFamily:
      '"DM Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    googleFontQuery: "DM+Sans:wght@400;500;600;700",
  },
  manrope: {
    id: "manrope",
    label: "Manrope",
    description: "Moderna com dígitos abertos e ótima legibilidade ao sol.",
    fontFamily:
      '"Manrope", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    googleFontQuery: "Manrope:wght@400;500;600;700",
  },
  "public-sans": {
    id: "public-sans",
    label: "Public Sans",
    description: "Utilitária sóbria, excelente para documentos e formulários.",
    fontFamily:
      '"Public Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    googleFontQuery: "Public+Sans:wght@400;500;600;700",
  },
  "source-sans-3": {
    id: "source-sans-3",
    label: "Source Sans 3",
    description: "Humanista leve, cansa menos em listas longas de serviços.",
    fontFamily:
      '"Source Sans 3", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    googleFontQuery: "Source+Sans+3:wght@400;500;600;700",
  },
  "ibm-plex": {
    id: "ibm-plex",
    label: "IBM Plex Sans",
    description: "Técnica e editorial, com forte personalidade em números.",
    fontFamily:
      '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    googleFontQuery: "IBM+Plex+Sans:wght@400;500;600;700",
  },
  system: {
    id: "system",
    label: "Sistema",
    description: "Fonte nativa do aparelho (SF Pro, Roboto ou Segoe UI).",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  "instrument-sans": {
    id: "instrument-sans",
    label: "Instrument Sans",
    description: "Sans compacta para comparação com a família atual.",
    fontFamily:
      '"Instrument Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    googleFontQuery: "Instrument+Sans:wght@400;500;600;700",
  },
};

export const LAB_FONT_ORDER: readonly LabFontMode[] = [
  "inter",
  "plus-jakarta",
  "dm-sans",
  "manrope",
  "public-sans",
  "source-sans-3",
  "ibm-plex",
  "system",
  "instrument-sans",
];

export interface LabThemeSwatch {
  label: string;
  hex: string;
}

export interface LabThemeSpec {
  id: LabThemeId;
  name: string;
  shortLabel: string;
  tagline: string;
  defaultSummaryMode: LabSummaryMode;
  tactileButtons: boolean;
  canvasBg: string;
  cardBg: string;
  subtleBg: string;
  headerBg: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  accentBg: string;
  accentTextOnAccent: string;
  accentInk: string;
  accentSoftBg: string;
  accentSoftText: string;
  secondaryBtnBg: string;
  secondaryBtnBorder: string;
  secondaryBtnText: string;
  summaryDarkBg: string;
  summaryDarkText: string;
  summaryDarkMuted: string;
  summaryDarkBorder: string;
  summaryDarkIncome: string;
  summaryDarkDanger: string;
  tactileAccentShadow: string;
  tactileSecondaryShadow: string;
  swatches: readonly LabThemeSwatch[];
}

export const LAB_THEMES: Record<LabThemeId, LabThemeSpec> = {
  oficina: {
    id: "oficina",
    name: "Oficina Editorial",
    shortLabel: "Oficina",
    tagline: "Fundo pedra quente, cards brancos e acento cobre para CTAs e foco.",
    defaultSummaryMode: "light",
    tactileButtons: false,
    canvasBg: "#F5F4F0",
    cardBg: "#FFFFFF",
    subtleBg: "#ECEAE3",
    headerBg: "#FFFFFF",
    borderSubtle: "#DFDDD4",
    borderStrong: "#78716C",
    textPrimary: "#141413",
    textSecondary: "#57534E",
    accentBg: "#C2410C",
    accentTextOnAccent: "#FFFFFF",
    accentInk: "#C2410C",
    accentSoftBg: "#FFEDD5",
    accentSoftText: "#9A3412",
    secondaryBtnBg: "#ECEAE3",
    secondaryBtnBorder: "#D6D3C9",
    secondaryBtnText: "#141413",
    summaryDarkBg: "#1C1917",
    summaryDarkText: "#FFFFFF",
    summaryDarkMuted: "#D6D3D1",
    summaryDarkBorder: "#44403C",
    summaryDarkIncome: "#6EE7B7",
    summaryDarkDanger: "#FCA5A5",
    tactileAccentShadow: "none",
    tactileSecondaryShadow: "none",
    swatches: [
      { label: "Canvas", hex: "#F5F4F0" },
      { label: "Card", hex: "#FFFFFF" },
      { label: "Texto", hex: "#141413" },
      { label: "Acento", hex: "#C2410C" },
    ],
  },
  planta: {
    id: "planta",
    name: "Planta Técnica",
    shortLabel: "Planta",
    tagline: "Ardósia clara, resumo ancorado escuro e azul petróleo para ações.",
    defaultSummaryMode: "dark",
    tactileButtons: false,
    canvasBg: "#F1F5F9",
    cardBg: "#FFFFFF",
    subtleBg: "#E2E8F0",
    headerBg: "#FFFFFF",
    borderSubtle: "#CBD5E1",
    borderStrong: "#64748B",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    accentBg: "#0369A1",
    accentTextOnAccent: "#FFFFFF",
    accentInk: "#0369A1",
    accentSoftBg: "#E0F2FE",
    accentSoftText: "#075985",
    secondaryBtnBg: "#E2E8F0",
    secondaryBtnBorder: "#CBD5E1",
    secondaryBtnText: "#0F172A",
    summaryDarkBg: "#0F172A",
    summaryDarkText: "#FFFFFF",
    summaryDarkMuted: "#CBD5E1",
    summaryDarkBorder: "#334155",
    summaryDarkIncome: "#6EE7B7",
    summaryDarkDanger: "#FCA5A5",
    tactileAccentShadow: "none",
    tactileSecondaryShadow: "none",
    swatches: [
      { label: "Canvas", hex: "#F1F5F9" },
      { label: "Resumo", hex: "#0F172A" },
      { label: "Card", hex: "#FFFFFF" },
      { label: "Acento", hex: "#0369A1" },
    ],
  },
  campo: {
    id: "campo",
    name: "Instrumento de Campo",
    shortLabel: "Campo",
    tagline: "Contraste tátil com peso físico nos botões e verde floresta.",
    defaultSummaryMode: "dark",
    tactileButtons: true,
    canvasBg: "#EFEFEF",
    cardBg: "#FFFFFF",
    subtleBg: "#E4E4E7",
    headerBg: "#FFFFFF",
    borderSubtle: "#D4D4D8",
    borderStrong: "#71717A",
    textPrimary: "#18181B",
    textSecondary: "#52525B",
    accentBg: "#047857",
    accentTextOnAccent: "#FFFFFF",
    accentInk: "#047857",
    accentSoftBg: "#D1FAE5",
    accentSoftText: "#065F46",
    secondaryBtnBg: "#F4F4F5",
    secondaryBtnBorder: "#71717A",
    secondaryBtnText: "#18181B",
    summaryDarkBg: "#18181B",
    summaryDarkText: "#FFFFFF",
    summaryDarkMuted: "#D4D4D8",
    summaryDarkBorder: "#3F3F46",
    summaryDarkIncome: "#6EE7B7",
    summaryDarkDanger: "#FCA5A5",
    tactileAccentShadow: "0 2px 0 0 #064E3B",
    tactileSecondaryShadow: "0 2px 0 0 #A1A1AA",
    swatches: [
      { label: "Canvas", hex: "#EFEFEF" },
      { label: "Card", hex: "#FFFFFF" },
      { label: "Escuro", hex: "#18181B" },
      { label: "Acento", hex: "#047857" },
    ],
  },
  mono: {
    id: "mono",
    name: "Refino Monocromático",
    shortLabel: "Mono",
    tagline: "Evolução do atual em 3 camadas: canvas zinco, cards brancos e resumo escuro.",
    defaultSummaryMode: "dark",
    tactileButtons: false,
    canvasBg: "#F4F4F5",
    cardBg: "#FFFFFF",
    subtleBg: "#E4E4E7",
    headerBg: "#FFFFFF",
    borderSubtle: "#E4E4E7",
    borderStrong: "#71717A",
    textPrimary: "#09090B",
    textSecondary: "#52525B",
    accentBg: "#0A0A0A",
    accentTextOnAccent: "#FFFFFF",
    accentInk: "#0A0A0A",
    accentSoftBg: "#E4E4E7",
    accentSoftText: "#18181B",
    secondaryBtnBg: "#F4F4F5",
    secondaryBtnBorder: "#D4D4D8",
    secondaryBtnText: "#09090B",
    summaryDarkBg: "#0A0A0A",
    summaryDarkText: "#FFFFFF",
    summaryDarkMuted: "#D4D4D8",
    summaryDarkBorder: "#27272A",
    summaryDarkIncome: "#6EE7B7",
    summaryDarkDanger: "#FCA5A5",
    tactileAccentShadow: "none",
    tactileSecondaryShadow: "none",
    swatches: [
      { label: "Canvas", hex: "#F4F4F5" },
      { label: "Card", hex: "#FFFFFF" },
      { label: "Subtle", hex: "#E4E4E7" },
      { label: "Acento", hex: "#0A0A0A" },
    ],
  },
};

export const LAB_THEME_ORDER: readonly LabThemeId[] = [
  "oficina",
  "planta",
  "campo",
  "mono",
];
