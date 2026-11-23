import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export function QuotesPage() {
  return (
    <EmptyState
      icon={<FileText className="h-5 w-5" aria-hidden="true" />}
      title="Orçamentos"
      description="Estrutura pronta. A listagem, criação e exportação de orçamentos entram na Fase 3."
    />
  );
}
