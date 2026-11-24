import { useMemo, useState } from "react";
import { AlertCircle, Layers } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CatalogToolbar,
  type CatalogStatusFilter,
} from "@/features/catalog/components/CatalogToolbar";
import { MaterialFormSheet } from "@/features/catalog/components/MaterialFormSheet";
import {
  useMaterials,
  useToggleMaterialActive,
} from "@/features/catalog/hooks/useMaterials";
import { formatDateBR } from "@/lib/dates";
import { formatCentsToBRL } from "@/lib/money";
import { formatUnitShort } from "@/lib/units";
import type { MaterialWithSupplier } from "@/services/materials.service";

export function MaterialsSection() {
  const { data: materials = [], isLoading, isError, refetch } = useMaterials();
  const toggleActive = useToggleMaterialActive();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CatalogStatusFilter>("active");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] =
    useState<MaterialWithSupplier | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { activeCount, inactiveCount } = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const item of materials) {
      if (item.is_active) {
        active += 1;
      } else {
        inactive += 1;
      }
    }
    return { activeCount: active, inactiveCount: inactive };
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const targetActive = statusFilter === "active";
    const query = search.trim().toLowerCase();

    return materials.filter((item) => {
      if (item.is_active !== targetActive) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = `${item.name} ${item.supplier?.name ?? ""} ${item.notes ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [materials, statusFilter, search]);

  function handleOpenCreate() {
    setEditingMaterial(null);
    setSheetOpen(true);
  }

  function handleOpenEdit(material: MaterialWithSupplier) {
    setEditingMaterial(material);
    setSheetOpen(true);
  }

  async function handleToggleActive(material: MaterialWithSupplier) {
    setTogglingId(material.id);
    try {
      await toggleActive.mutateAsync({
        id: material.id,
        isActive: !material.is_active,
      });
    } catch {
      // Mutation onError already notifies the user via toast.
    } finally {
      setTogglingId(null);
    }
  }

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Carregando materiais</span>
        <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-zinc-200/80" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl border border-zinc-200 bg-white" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl border border-zinc-200 bg-white" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span>Não foi possível carregar os materiais.</span>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            void refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const hasSearch = search.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <CatalogToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar material..."
        searchAriaLabel="Buscar material ou fornecedor"
        addLabel="Novo"
        addAriaLabel="Novo material"
        onAdd={handleOpenCreate}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
      />

      {filteredMaterials.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />}
          title={
            materials.length === 0
              ? "Nenhum material cadastrado"
              : !hasSearch
                ? statusFilter === "active"
                  ? "Nenhum material ativo"
                  : "Nenhum material inativo"
                : "Nenhum material encontrado"
          }
          description={
            materials.length === 0
              ? "Cadastre materiais e peças com preço de referência e data da cotação."
              : !hasSearch
                ? statusFilter === "active"
                  ? "Todos os materiais cadastrados estão desativados no momento."
                  : "Materiais desativados ficam guardados aqui para reativação."
                : "Nenhum item corresponde à sua busca."
          }
          action={
            materials.length === 0 ? (
              <Button onClick={handleOpenCreate}>Cadastrar material</Button>
            ) : !hasSearch ? (
              <Button
                variant="secondary"
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "active" ? "inactive" : "active",
                  )
                }
              >
                {statusFilter === "active" ? "Ver inativos" : "Ver ativos"}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setSearch("")}>
                Limpar busca
              </Button>
            )
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filteredMaterials.map((material) => (
            <li
              key={material.id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-medium text-neutral-950">
                      {material.name}
                    </h2>
                    {!material.is_active ? (
                      <Badge variant="warning">Inativo</Badge>
                    ) : null}
                  </div>

                  <p className="mt-1 text-xs text-neutral-600 tabular-nums">
                    {material.supplier ? `${material.supplier.name} · ` : ""}
                    Cotação {formatDateBR(material.price_updated_at)}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-base font-semibold text-neutral-950 tabular-nums">
                    {formatCentsToBRL(material.unit_price_cents)}
                  </p>
                  <p className="text-xs text-neutral-500 tabular-nums">
                    / {formatUnitShort(material.unit)}
                  </p>
                </div>
              </div>

              {material.notes ? (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-600">
                  {material.notes}
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  variant={material.is_active ? "ghost" : "secondary"}
                  isLoading={togglingId === material.id}
                  onClick={() => {
                    void handleToggleActive(material);
                  }}
                >
                  {material.is_active ? "Desativar" : "Reativar"}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => handleOpenEdit(material)}
                >
                  Editar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MaterialFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        material={editingMaterial}
      />
    </div>
  );
}
