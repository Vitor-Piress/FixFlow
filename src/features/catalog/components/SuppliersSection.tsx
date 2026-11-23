import { useMemo, useState } from "react";
import { AlertCircle, MessageCircle, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { CatalogToolbar } from "@/features/catalog/components/CatalogToolbar";
import { SupplierFormSheet } from "@/features/catalog/components/SupplierFormSheet";
import {
  useDeleteSupplier,
  useSuppliers,
} from "@/features/catalog/hooks/useSuppliers";
import { buildWhatsAppUrl, formatPhoneBR } from "@/lib/utils";
import type { Supplier } from "@/services/suppliers.service";

export function SuppliersSection() {
  const { data: suppliers = [], isLoading, isError, refetch } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();

  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(
    null,
  );

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return suppliers;
    }

    return suppliers.filter((item) => {
      const haystack = `${item.name} ${item.phone ?? ""} ${item.notes ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [suppliers, search]);

  function handleOpenCreate() {
    setEditingSupplier(null);
    setSheetOpen(true);
  }

  function handleOpenEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setSheetOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingSupplier) {
      return;
    }

    try {
      await deleteSupplier.mutateAsync(deletingSupplier.id);
      setDeletingSupplier(null);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Carregando fornecedores</span>
        <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span>Não foi possível carregar os fornecedores.</span>
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
        searchPlaceholder="Buscar fornecedor..."
        searchAriaLabel="Buscar fornecedor ou telefone"
        addLabel="Novo"
        addAriaLabel="Novo fornecedor"
        onAdd={handleOpenCreate}
      />

      {filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />}
          title={
            suppliers.length === 0
              ? "Nenhum fornecedor cadastrado"
              : "Nenhum fornecedor encontrado"
          }
          description={
            suppliers.length === 0
              ? "Salve suas lojas e distribuidores para cotar peças direto no WhatsApp."
              : "Nenhum fornecedor corresponde à sua busca."
          }
          action={
            suppliers.length === 0 ? (
              <Button onClick={handleOpenCreate}>Cadastrar fornecedor</Button>
            ) : (
              <Button variant="secondary" onClick={() => setSearch("")}>
                Limpar busca
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200 bg-white">
          {filteredSuppliers.map((supplier) => {
            const whatsappUrl = buildWhatsAppUrl(supplier.phone);

            return (
              <li key={supplier.id} className="py-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-medium text-neutral-950">
                    {supplier.name}
                  </h2>
                  <p className="text-xs text-neutral-600 tabular-nums">
                    {supplier.phone
                      ? formatPhoneBR(supplier.phone)
                      : "Sem telefone cadastrado"}
                  </p>
                </div>

                {supplier.notes ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-600">
                    {supplier.notes}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 active:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 sm:flex-none"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                      WhatsApp
                    </a>
                  ) : null}

                  <Button
                    variant="secondary"
                    onClick={() => handleOpenEdit(supplier)}
                  >
                    Editar
                  </Button>

                  <Button
                    variant="danger"
                    size="icon"
                    aria-label={`Excluir ${supplier.name}`}
                    onClick={() => setDeletingSupplier(supplier)}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SupplierFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        supplier={editingSupplier}
      />

      <ConfirmSheet
        open={deletingSupplier !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingSupplier(null);
          }
        }}
        title="Excluir fornecedor"
        description={
          deletingSupplier
            ? `Deseja excluir "${deletingSupplier.name}"? Materiais vinculados a este fornecedor continuarão salvos no catálogo sem fornecedor associado.`
            : ""
        }
        confirmLabel="Excluir"
        isLoading={deleteSupplier.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
