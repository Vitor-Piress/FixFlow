import { useState, type ReactNode } from "react";
import {
  FileSignature,
  FileText,
  Package,
  Plus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import type { LabThemeSpec } from "@/features/lab/labThemes";
import { SPRING_SNAPPY } from "@/lib/motion";

type NavTabId = "quotes" | "finance" | "contracts" | "catalog";

interface NavTab {
  id: NavTabId;
  label: string;
  Icon: LucideIcon;
}

const NAV_TABS: readonly NavTab[] = [
  { id: "quotes", label: "Orçamentos", Icon: FileText },
  { id: "finance", label: "Financeiro", Icon: Wallet },
  { id: "contracts", label: "Contratos", Icon: FileSignature },
  { id: "catalog", label: "Catálogo", Icon: Package },
];

const FOCUS_LIGHT =
  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950";
const FOCUS_DARK =
  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white";

interface NavVariantProps {
  theme: LabThemeSpec;
  active: NavTabId;
  onSelect: (id: NavTabId) => void;
}

interface FrameProps {
  theme: LabThemeSpec;
  activeLabel: string;
  floating?: boolean;
  children: ReactNode;
}

function PhoneFrame({ theme, activeLabel, floating, children }: FrameProps) {
  return (
    <div
      className="relative flex h-60 flex-col overflow-hidden rounded-xl border"
      style={{
        backgroundColor: theme.canvasBg,
        borderColor: theme.borderSubtle,
      }}
    >
      <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
        <p
          className="text-sm font-semibold"
          style={{ color: theme.textPrimary }}
        >
          {activeLabel}
        </p>
        {[0, 1].map((index) => (
          <div
            key={index}
            className="flex flex-col gap-1.5 rounded-lg border p-2.5"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.borderSubtle,
            }}
          >
            <span
              className="h-2 w-2/5 rounded-full"
              style={{ backgroundColor: theme.subtleBg }}
            />
            <span
              className="h-2 w-4/5 rounded-full"
              style={{ backgroundColor: theme.subtleBg }}
            />
          </div>
        ))}
      </div>
      {floating ? (
        <div className="absolute inset-x-3 bottom-3">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

function NavCurrent({ theme, active, onSelect }: NavVariantProps) {
  return (
    <nav
      aria-label="Navegação atual (exemplo)"
      className="border-t"
      style={{ backgroundColor: theme.headerBg, borderColor: theme.borderSubtle }}
    >
      <ul className="grid grid-cols-4">
        {NAV_TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(id)}
                className={`relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs font-medium transition-colors ${FOCUS_LIGHT}`}
                style={{
                  color: isActive ? theme.textPrimary : theme.textSecondary,
                }}
              >
                {isActive ? (
                  <motion.span
                    layoutId="lab-nav-current-bar"
                    transition={SPRING_SNAPPY}
                    aria-hidden="true"
                    className="absolute top-0 h-0.5 w-8 rounded-full"
                    style={{ backgroundColor: theme.textPrimary }}
                  />
                ) : null}
                <span className="relative inline-flex h-6 w-10 items-center justify-center rounded-full">
                  {isActive ? (
                    <motion.span
                      layoutId="lab-nav-current-pill"
                      transition={SPRING_SNAPPY}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: theme.subtleBg }}
                    />
                  ) : null}
                  <Icon
                    className="relative h-[18px] w-[18px]"
                    strokeWidth={isActive ? 2 : 1.5}
                    aria-hidden="true"
                  />
                </span>
                <span className="truncate">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavFloatingDark({ theme, active, onSelect }: NavVariantProps) {
  return (
    <nav
      aria-label="Navegação ilha flutuante (exemplo)"
      className="rounded-full border p-1.5"
      style={{
        backgroundColor: theme.summaryDarkBg,
        borderColor: theme.summaryDarkBorder,
      }}
    >
      <ul className="flex items-center justify-between gap-1">
        {NAV_TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <motion.button
                layout
                transition={SPRING_SNAPPY}
                type="button"
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(id)}
                className={`relative inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold ${FOCUS_DARK}`}
                style={{
                  color: isActive ? theme.summaryDarkBg : theme.summaryDarkMuted,
                }}
              >
                {isActive ? (
                  <motion.span
                    layoutId="lab-nav-floating-pill"
                    transition={SPRING_SNAPPY}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: theme.summaryDarkText }}
                  />
                ) : null}
                <Icon
                  className="relative h-[18px] w-[18px] shrink-0"
                  strokeWidth={isActive ? 2 : 1.75}
                  aria-hidden="true"
                />
                {isActive ? <span className="relative">{label}</span> : null}
              </motion.button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavLabeledPill({ theme, active, onSelect }: NavVariantProps) {
  return (
    <nav
      aria-label="Navegação pílula com rótulo (exemplo)"
      className="border-t px-2 py-2"
      style={{ backgroundColor: theme.headerBg, borderColor: theme.borderSubtle }}
    >
      <ul className="flex items-center justify-between gap-1">
        {NAV_TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <motion.button
                layout
                transition={SPRING_SNAPPY}
                type="button"
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(id)}
                className={`relative inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold ${FOCUS_LIGHT}`}
                style={{
                  color: isActive
                    ? theme.accentTextOnAccent
                    : theme.textSecondary,
                }}
              >
                {isActive ? (
                  <motion.span
                    layoutId="lab-nav-labeled-pill"
                    transition={SPRING_SNAPPY}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: theme.accentBg }}
                  />
                ) : null}
                <Icon
                  className="relative h-[18px] w-[18px] shrink-0"
                  strokeWidth={isActive ? 2 : 1.75}
                  aria-hidden="true"
                />
                {isActive ? <span className="relative">{label}</span> : null}
              </motion.button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavEditorial({ theme, active, onSelect }: NavVariantProps) {
  return (
    <nav
      aria-label="Navegação editorial com sublinhado (exemplo)"
      className="border-t"
      style={{ backgroundColor: theme.headerBg, borderColor: theme.borderSubtle }}
    >
      <ul className="grid grid-cols-4">
        {NAV_TABS.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(id)}
                className={`relative flex min-h-14 w-full items-center justify-center px-1 text-[13px] transition-colors ${FOCUS_LIGHT} ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
                style={{
                  color: isActive ? theme.textPrimary : theme.textSecondary,
                }}
              >
                <span className="truncate">{label}</span>
                {isActive ? (
                  <motion.span
                    layoutId="lab-nav-editorial-underline"
                    transition={SPRING_SNAPPY}
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full"
                    style={{ backgroundColor: theme.accentBg }}
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavDarkBar({ theme, active, onSelect }: NavVariantProps) {
  return (
    <nav
      aria-label="Navegação barra escura (exemplo)"
      className="border-t"
      style={{
        backgroundColor: theme.summaryDarkBg,
        borderColor: theme.summaryDarkBorder,
      }}
    >
      <ul className="grid grid-cols-4">
        {NAV_TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(id)}
                className={`relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs transition-colors ${FOCUS_DARK} ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
                style={{
                  color: isActive
                    ? theme.summaryDarkText
                    : theme.summaryDarkMuted,
                }}
              >
                <span className="relative inline-flex h-6 w-11 items-center justify-center rounded-full">
                  {isActive ? (
                    <motion.span
                      layoutId="lab-nav-dark-pill"
                      transition={SPRING_SNAPPY}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: theme.summaryDarkText }}
                    />
                  ) : null}
                  <Icon
                    className="relative h-[18px] w-[18px]"
                    strokeWidth={isActive ? 2 : 1.5}
                    style={{
                      color: isActive
                        ? theme.summaryDarkBg
                        : theme.summaryDarkMuted,
                    }}
                    aria-hidden="true"
                  />
                </span>
                <span className="truncate">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavDock({ theme, active, onSelect }: NavVariantProps) {
  const leftTabs = NAV_TABS.slice(0, 2);
  const rightTabs = NAV_TABS.slice(2);

  function renderTab({ id, label, Icon }: NavTab) {
    const isActive = active === id;
    return (
      <li key={id}>
        <button
          type="button"
          aria-current={isActive ? "page" : undefined}
          onClick={() => onSelect(id)}
          className={`relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 pb-2 pt-1.5 text-xs transition-colors ${FOCUS_LIGHT} ${
            isActive ? "font-semibold" : "font-medium"
          }`}
          style={{
            color: isActive ? theme.textPrimary : theme.textSecondary,
          }}
        >
          <Icon
            className="h-5 w-5"
            strokeWidth={isActive ? 2 : 1.5}
            aria-hidden="true"
          />
          <span className="truncate">{label}</span>
          {isActive ? (
            <motion.span
              layoutId="lab-nav-dock-dot"
              transition={SPRING_SNAPPY}
              aria-hidden="true"
              className="absolute bottom-0.5 h-1 w-1 rounded-full"
              style={{ backgroundColor: theme.accentBg }}
            />
          ) : null}
        </button>
      </li>
    );
  }

  return (
    <nav
      aria-label="Navegação dock com ação central (exemplo)"
      className="border-t"
      style={{ backgroundColor: theme.headerBg, borderColor: theme.borderSubtle }}
    >
      <ul className="grid grid-cols-5 items-end">
        {leftTabs.map(renderTab)}
        <li className="flex justify-center">
          <button
            type="button"
            aria-label="Novo orçamento (exemplo)"
            className={`-mt-5 inline-flex h-14 w-14 items-center justify-center rounded-full border-4 ${FOCUS_LIGHT}`}
            style={{
              backgroundColor: theme.accentBg,
              borderColor: theme.headerBg,
              color: theme.accentTextOnAccent,
            }}
          >
            <Plus className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
          </button>
        </li>
        {rightTabs.map(renderTab)}
      </ul>
    </nav>
  );
}

interface NavVariantSpec {
  id: string;
  title: string;
  description: string;
  floating?: boolean;
  Component: (props: NavVariantProps) => ReactNode;
}

const NAV_VARIANTS: readonly NavVariantSpec[] = [
  {
    id: "current",
    title: "1. Anterior (referência)",
    description:
      "Barra branca, linha no topo e pílula suave atrás do ícone ativo. Quatro rótulos sempre visíveis.",
    Component: NavCurrent,
  },
  {
    id: "floating",
    title: "2. Ilha flutuante escura",
    description:
      "Cápsula escura solta do rodapé. A aba ativa expande com o rótulo. Mais moderna, ocupa menos largura e destaca o foco.",
    floating: true,
    Component: NavFloatingDark,
  },
  {
    id: "labeled-pill",
    title: "3. Pílula com rótulo na aba ativa (aplicada no app)",
    description:
      "Barra branca fixa. Só a aba ativa mostra rótulo, com fundo de acento. Visual limpo, mas as inativas ficam só com ícone.",
    Component: NavLabeledPill,
  },
  {
    id: "editorial",
    title: "4. Editorial com sublinhado",
    description:
      "Só texto e uma linha de acento embaixo da aba ativa. Combina com a linha editorial e dispensa ícones.",
    Component: NavEditorial,
  },
  {
    id: "dark-bar",
    title: "5. Barra escura ancorada",
    description:
      "Barra de ponta a ponta no tom do resumo escuro, com pílula clara na aba ativa. Contraste alto sob luz forte.",
    Component: NavDarkBar,
  },
  {
    id: "dock",
    title: "6. Dock com ação central",
    description:
      "Duas abas de cada lado e um botão central de Novo orçamento. Acelera a ação mais usada, mas o botão não é uma aba e muda a regra atual de 4 abas.",
    Component: NavDock,
  },
];

interface LabNavbarPreviewProps {
  theme: LabThemeSpec;
}

export function LabNavbarPreview({ theme }: LabNavbarPreviewProps) {
  const [active, setActive] = useState<NavTabId>("quotes");
  const activeLabel =
    NAV_TABS.find((tab) => tab.id === active)?.label ?? "Orçamentos";

  return (
    <section
      aria-label="Prévia de opções de navegação inferior"
      className="overflow-hidden rounded-2xl border"
      style={{
        backgroundColor: theme.canvasBg,
        borderColor: theme.borderSubtle,
        color: theme.textPrimary,
      }}
    >
      <div className="flex flex-col gap-5 p-4">
        <div>
          <h2 className="text-base font-semibold">Opções de navegação</h2>
          <p
            className="mt-0.5 text-xs leading-relaxed"
            style={{ color: theme.textSecondary }}
          >
            Toque nas abas de qualquer opção. A aba escolhida é compartilhada
            entre as seis para facilitar a comparação.
          </p>
        </div>

        {NAV_VARIANTS.map(({ id, title, description, floating, Component }) => (
          <div key={id} className="flex flex-col gap-2">
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p
                className="mt-0.5 text-xs leading-relaxed"
                style={{ color: theme.textSecondary }}
              >
                {description}
              </p>
            </div>
            <PhoneFrame
              theme={theme}
              activeLabel={activeLabel}
              floating={floating}
            >
              <Component theme={theme} active={active} onSelect={setActive} />
            </PhoneFrame>
          </div>
        ))}
      </div>
    </section>
  );
}
