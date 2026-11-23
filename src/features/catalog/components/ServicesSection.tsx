import { useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  Pencil,
  RotateCcw,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CatalogToolbar,
  type CatalogStatusFilter,
} from "@/features/catalog/components/CatalogToolbar";
import { ServiceFormSheet } from "@/features/catalog/components/ServiceFormSheet";
import {
  useServices,
  useToggleServiceActive,
} from "@/features/catalog/hooks/useServices";
import { formatCentsToBRL } from "@/lib/money";
import { formatUnitShort } from "@/lib/units";
import { cn } from "@/lib/utils";
import type { Service } from "@/services/services.service";

export function ServicesSection() {
  const { data: services = [], isLoading, isError, refetch } = useServices();
  const toggleActive = useToggleServiceActive();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CatalogStatusFilter>("active");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { activeCount, inactiveCount } = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const item of services) {
      if (item.is_active) {
        active += 1;
      } else {
        inactive += 1;
      }
    }
    return { activeCount: active, inactiveCount: inactive };
  }, [services]);

  const categories = useMemo(() => {
    const targetActive = statusFilter === "active";
    const set = new Set<string>();
    for (const item of services) {
      if (item.is_active === targetActive && item.category.trim()) {
        set.add(item.category.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [services, statusFilter]);

  const effectiveCategory =
    selectedCategory !== "all" && !categories.includes(selectedCategory)
      ? "all"
      : selectedCategory;

  const filteredServices = useMemo(() => {
    const targetActive = statusFilter === "active";
    const query = search.trim().toLowerCase();

    return services.filter((item) => {
      if (item.is_active !== targetActive) {
        return false;
      }

      if (
        effectiveCategory !== "all" &&
        item.category.trim() !== effectiveCategory
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = `${item.name} ${item.category} ${item.description ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [services, statusFilter, effectiveCategory, search]);

  function handleOpenCreate() {
    setEditingService(null);
    setSheetOpen(true);
  }

  function handleOpenEdit(service: Service) {
    setEditingService(service);
    setSheetOpen(true);
  }

  async function handleToggleActive(service: Service) {
    setTogglingId(service.id);
    try {
      await toggleActive.mutateAsync({
        id: service.id,
        isActive: !service.is_active,
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
          <span>Não foi possível carregar os serviços.</span>
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
        searchPlaceholder="Buscar serviço ou categoria..."
        addLabel="Novo"
        onAdd={handleOpenCreate}
        statusFilter={statusFilter}
        onStatusFilterChange={(next) => {
          setStatusFilter(next);
          setSelectedCategory("all");
        }}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
      />

      {categories.length > 1 ? (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 text-xs font-medium transition-colors",
              effectiveCategory === "all"
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
            )}
          >
            Todas categorias
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 text-xs font-medium transition-colors",
                effectiveCategory === category
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
              )}
            >
              {category}
            </button>
          ))}
        </div>
      ) : null}

      {filteredServices.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-5 w-5" aria-hidden="true" />}
          title={
            services.length === 0
              ? "Nenhum serviço cadastrado"
              : statusFilter === "inactive"
                ? "Nenhum serviço inativo"
                : "Nenhum serviço encontrado"
          }
          description={
            services.length === 0
              ? "Cadastre seus serviços e valores base para agilizar novos orçamentos."
              : statusFilter === "inactive"
                ? "Serviços desativados ficam guardados aqui para reativação."
                : "Tente ajustar o termo de busca ou o filtro de categoria."
          }
          action={
            services.length === 0 ? (
              <Button onClick={handleOpenCreate}>Cadastrar serviço</Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredServices.map((service) => (
            <li
              key={service.id}
              className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-neutral-950">
                    {service.name}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="neutral">{service.category}</Badge>
                    {!service.is_active ? (
                      <Badge variant="warning">Inativo</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-neutral-950 tabular-nums">
                    {formatCentsToBRL(service.base_price_cents)}
                  </p>
                  <p className="text-xs text-neutral-500 tabular-nums">
                    por {formatUnitShort(service.unit)}
                  </p>
                </div>
              </div>

              {service.description ? (
                <p className="line-clamp-2 text-xs leading-relaxed text-neutral-500">
                  {service.description}
                </p>
              ) : null}

              <div className="flex items-center gap-2 border-t border-neutral-100 pt-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => handleOpenEdit(service)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Editar
                </Button>

                <Button
                  variant={service.is_active ? "ghost" : "secondary"}
                  className="flex-1"
                  isLoading={togglingId === service.id}
                  onClick={() => {
                    void handleToggleActive(service);
                  }}
                >
                  {service.is_active ? (
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

      <ServiceFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        service={editingService}
      />
    </div>
  );
}
