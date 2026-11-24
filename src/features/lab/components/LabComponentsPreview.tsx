import { useState } from "react";
import { FileSignature, FileText, Package, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { LabThemeSpec } from "@/features/lab/labThemes";

interface LabComponentsPreviewProps {
  theme: LabThemeSpec;
  onOpenSampleSheet: () => void;
}

type DemoNavTab = "quotes" | "finance" | "contracts" | "catalog";

export function LabComponentsPreview({
  theme,
  onOpenSampleSheet,
}: LabComponentsPreviewProps) {
  const [sampleInput, setSampleInput] = useState("Clínica Vida");
  const [activeNav, setActiveNav] = useState<DemoNavTab>("quotes");

  const navItems: ReadonlyArray<{
    id: DemoNavTab;
    label: string;
    Icon: typeof FileText;
  }> = [
    { id: "quotes", label: "Orçamentos", Icon: FileText },
    { id: "finance", label: "Financeiro", Icon: Wallet },
    { id: "contracts", label: "Contratos", Icon: FileSignature },
    { id: "catalog", label: "Catálogo", Icon: Package },
  ];

  return (
    <section
      aria-label="Prévia de componentes e BottomNav"
      className="overflow-hidden rounded-2xl border"
      style={{
        backgroundColor: theme.canvasBg,
        borderColor: theme.borderSubtle,
        color: theme.textPrimary,
      }}
    >
      <div className="flex flex-col gap-4 p-4">
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.borderSubtle,
          }}
        >
          <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            Botões e hierarquia de ação
          </h3>
          <p className="mt-1 text-xs" style={{ color: theme.textSecondary }}>
            Ação primária usa a cor de destaque; secundária ganha superfície própria distinta dos inputs.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenSampleSheet}
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-transform active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
              style={{
                backgroundColor: theme.accentBg,
                color: theme.accentTextOnAccent,
                boxShadow: theme.tactileAccentShadow,
              }}
            >
              Abrir BottomSheet
            </button>

            <button
              type="button"
              onClick={onOpenSampleSheet}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
              style={{
                backgroundColor: theme.secondaryBtnBg,
                borderColor: theme.secondaryBtnBorder,
                color: theme.secondaryBtnText,
                boxShadow: theme.tactileSecondaryShadow,
              }}
            >
              Ação secundária
            </button>

            <button
              type="button"
              onClick={onOpenSampleSheet}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-red-600 bg-white px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Excluir
            </button>
          </div>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.borderSubtle,
          }}
        >
          <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            Campos e status semânticos
          </h3>

          <div className="mt-3 flex flex-col gap-1.5">
            <label
              htmlFor="lab-sample-client"
              className="text-sm font-medium"
              style={{ color: theme.textPrimary }}
            >
              Cliente do orçamento
            </label>
            <input
              id="lab-sample-client"
              type="text"
              value={sampleInput}
              onChange={(event) => setSampleInput(event.target.value)}
              className="min-h-11 w-full rounded-lg border px-3.5 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.borderStrong,
                color: theme.textPrimary,
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="success">Pago</Badge>
            <Badge variant="warning">Concluído</Badge>
            <Badge variant="danger">Atrasado</Badge>
            <Badge variant="info">Enviado</Badge>
            <Badge variant="neutral">Rascunho</Badge>
          </div>
        </div>

        <div
          className="overflow-hidden rounded-xl border"
          style={{
            backgroundColor: theme.headerBg,
            borderColor: theme.borderSubtle,
          }}
        >
          <p
            className="border-b px-3.5 py-2 text-xs font-medium"
            style={{
              borderColor: theme.borderSubtle,
              color: theme.textSecondary,
            }}
          >
            Prévia do BottomNav com acento ativo
          </p>
          <div className="grid grid-cols-4">
            {navItems.map(({ id, label, Icon }) => {
              const isActive = activeNav === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveNav(id)}
                  className="relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950"
                  style={{
                    color: isActive ? theme.accentInk : theme.textSecondary,
                  }}
                >
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 h-0.5 w-8 rounded-full"
                      style={{ backgroundColor: theme.accentBg }}
                    />
                  ) : null}
                  <span
                    className="inline-flex h-7 w-12 items-center justify-center rounded-full"
                    style={
                      isActive
                        ? { backgroundColor: theme.accentSoftBg }
                        : undefined
                    }
                  >
                    <Icon
                      className="h-4 w-4"
                      strokeWidth={isActive ? 2 : 1.5}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
