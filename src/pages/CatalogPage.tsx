import { useSearchParams } from "react-router-dom";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/SegmentedControl";
import { ClientsSection } from "@/features/catalog/components/ClientsSection";
import { MaterialsSection } from "@/features/catalog/components/MaterialsSection";
import { ServicesSection } from "@/features/catalog/components/ServicesSection";
import { SuppliersSection } from "@/features/catalog/components/SuppliersSection";

type CatalogTab = "services" | "materials" | "suppliers" | "clients";

const CATALOG_TAB_OPTIONS: readonly SegmentedOption<CatalogTab>[] = [
  { value: "services", label: "Serviços" },
  { value: "materials", label: "Materiais" },
  { value: "suppliers", label: "Fornecedores" },
  { value: "clients", label: "Clientes" },
];

function parseCatalogTab(raw: string | null): CatalogTab {
  if (raw === "materials" || raw === "suppliers" || raw === "clients") {
    return raw;
  }
  return "services";
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseCatalogTab(searchParams.get("tab"));

  function handleTabChange(nextTab: CatalogTab) {
    setSearchParams(
      nextTab === "services" ? {} : { tab: nextTab },
      { replace: true },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        ariaLabel="Seções do catálogo"
        options={CATALOG_TAB_OPTIONS}
        value={activeTab}
        onChange={handleTabChange}
        idBase="catalog"
        getTabId={(tab) => `catalog-tab-${tab}`}
        getPanelId={(tab) => `catalog-panel-${tab}`}
      />

      <div
        role="tabpanel"
        id={`catalog-panel-${activeTab}`}
        aria-labelledby={`catalog-tab-${activeTab}`}
        className="outline-none"
      >
        {activeTab === "services" ? <ServicesSection /> : null}
        {activeTab === "materials" ? <MaterialsSection /> : null}
        {activeTab === "suppliers" ? <SuppliersSection /> : null}
        {activeTab === "clients" ? <ClientsSection /> : null}
      </div>
    </div>
  );
}
