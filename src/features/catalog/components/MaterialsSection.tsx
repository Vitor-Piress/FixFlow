import { useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  Calendar,
  Layers,
  Pencil,
  RotateCcw,
} from "lucide-react";
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
    } finally {
      setTogglingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <div className="h-11 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-28 animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-28 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
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

  return (
    <div className="flex flex-col gap-4">
      <CatalogToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar material ou fornecedor..."
        addLabel="Novo"
        onAdd={handleOpenCreate}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
      />

      {filteredMaterials.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" aria-hidden="true" />}
          title={
            materials.length === 0
              ? "Nenhum material cadastrado"
              : statusFilter === "inactive"
                ? "Nenhum material inativo"
                : "Nenhum material encontrado"
          }
          description={
            materials.length === 0
              ? "Cadastre materiais e peças com preço de referência e data da cotação."
              : statusFilter === "inactive"
                ? "Materiais desativados ficam guardados aqui para reativação."
                : "Nenhum item corresponde à sua busca."
          }
          action={
            materials.length === 0 ? (
              <Button onClick={handleOpenCreate}>Cadastrar material</Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredMaterials.map((material) => (
            <li
              key={material.id}
              className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="text-sm font-semibold text-neutral-950">
                      {material.name}
                    </h2>
                    {!material.is_active ? (
                      <Badge variant="warning">Inativo</Badge>
                    ) : null}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                    {material.supplier ? (
                      <span>Fornecedor: {material.supplier.name}</span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      Atualizado em {formatDateBR(material.price_updated_at)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-neutral-950 tabular-nums">
                    {formatCentsToBRL(material.unit_price_cents)}
                  </p>
                  <p className="text-xs text-neutral-500 tabular-nums">
                    por {formatUnitShort(material.unit)}
                  </p>
                </div>
              </div>

              {material.notes ? (
                <p className="line-clamp-2 text-xs leading-relaxed text-neutral-500">
                  {material.notes}
                </p>
              ) : null}

              <div className="flex items-center gap-2 border-t border-neutral-100 pt-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => handleOpenEdit(material)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Editar
                </Button>

                <Button
                  variant={material.is_active ? "ghost" : "secondary"}
                  className="flex-1"
                  isLoading={togglingId === material.id}
                  onClick={() => {
                    void handleToggleActive(material);
                  }}
                >
                  {material.is_active ? (
                    <>
                      <Archive className="h-4 w-4" aria-hidden="true" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Reativar
                    </>
                  )}
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
