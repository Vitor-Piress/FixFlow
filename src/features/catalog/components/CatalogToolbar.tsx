import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type CatalogStatusFilter = "active" | "inactive";

interface CatalogToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  addLabel: string;
  onAdd: () => void;
  statusFilter?: CatalogStatusFilter;
  onStatusFilterChange?: (value: CatalogStatusFilter) => void;
  activeCount?: number;
  inactiveCount?: number;
}

export function CatalogToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  addLabel,
  onAdd,
  statusFilter,
  onStatusFilterChange,
  activeCount,
  inactiveCount,
}: CatalogToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={cn(
              "min-h-11 w-full rounded-lg border border-neutral-300 bg-white py-2.5 pr-11 pl-10 text-base text-neutral-950",
              "placeholder:text-neutral-400 transition-colors focus:border-neutral-950 focus:outline-none",
            )}
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-0 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-neutral-950"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <Button
          onClick={onAdd}
          className="shrink-0 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{addLabel}</span>
        </Button>
      </div>

      {statusFilter && onStatusFilterChange ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onStatusFilterChange("active")}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors tabular-nums",
              "focus-visible:outline-2 focus-visible:outline-neutral-950",
              statusFilter === "active"
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
            )}
          >
            <span>Ativos</span>
            {typeof activeCount === "number" ? (
              <span className="opacity-80">({activeCount})</span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange("inactive")}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors tabular-nums",
              "focus-visible:outline-2 focus-visible:outline-neutral-950",
              statusFilter === "inactive"
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
            )}
          >
            <span>Inativos</span>
            {typeof inactiveCount === "number" ? (
              <span className="opacity-80">({inactiveCount})</span>
            ) : null}
          </button>
        </div>
      ) : null}
    </div>
  );
}
