import { FileSignature } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export function ContractsPage() {
  return (
    <EmptyState
      icon={<FileSignature className="h-5 w-5" aria-hidden="true" />}
      title="Contratos Mensais"
      description="Estrutura pronta. A gestão de mensalistas e PDFs entram na Fase 4."
    />
  );
}
