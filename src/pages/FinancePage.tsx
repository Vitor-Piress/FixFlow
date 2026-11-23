import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export function FinancePage() {
  return (
    <EmptyState
      icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
      title="Livro-Caixa"
      description="Estrutura pronta. O acompanhamento mensal, recorrências e despesas entram na Fase 5."
    />
  );
}
