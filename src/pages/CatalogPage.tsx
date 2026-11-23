import { useSearchParams } from "react-router-dom";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/SegmentedControl";
import { MaterialsSection } from "@/features/catalog/components/MaterialsSection";
import { ServicesSection } from "@/features/catalog/components/ServicesSection";
import { SuppliersSection } from "@/features/catalog/components/SuppliersSection";

type CatalogTab = "services" | "materials" | "suppliers";

const CATALOG_TAB_OPTIONS: readonly SegmentedOption<CatalogTab>[] = [
  { value: "services", label: "Serviços" },
  { value: "materials", label: "Materiais" },
  { value: "suppliers", label: "Fornecedores" },
];

function parseCatalogTab(raw: string | null): CatalogTab {
  if (raw === "materials" || raw === "suppliers") {
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
      />

      {activeTab === "services" ? <ServicesSection /> : null}
      {activeTab === "materials" ? <MaterialsSection /> : null}
      {activeTab === "suppliers" ? <SuppliersSection /> : null}
    </div>
  );
}
