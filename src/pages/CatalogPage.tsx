import { Package } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export function CatalogPage() {
  return (
    <EmptyState
      icon={<Package className="h-5 w-5" aria-hidden="true" />}
      title="Catálogo"
      description="Estrutura pronta. Serviços, materiais e fornecedores entram na Fase 2."
    />
  );
}
