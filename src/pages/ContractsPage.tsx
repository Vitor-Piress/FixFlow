import { FileSignature } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export function ContractsPage() {
  return (
    <EmptyState
      icon={<FileSignature className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />}
      title="Contratos mensais"
      description="Em breve você gerenciará mensalistas e contratos em PDF por esta tela."
      action={
        <div className="flex flex-col items-center gap-3">
          <Badge variant="info">Em breve</Badge>
          <Link
            to="/catalog"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-500 bg-white px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
          >
            Abrir catálogo
          </Link>
        </div>
      }
    />
  );
}
