import { useMemo, useState } from "react";
import { AlertCircle, MessageCircle, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { CatalogToolbar } from "@/features/catalog/components/CatalogToolbar";
import { ClientFormSheet } from "@/features/catalog/components/ClientFormSheet";
import {
  useClients,
  useDeleteClient,
} from "@/features/catalog/hooks/useClients";
import { buildWhatsAppUrl, formatPhoneBR, stripNonDigits } from "@/lib/utils";
import type { Client } from "@/services/clients.service";

export function ClientsSection() {
  const { data: clients = [], isLoading, isError, refetch } = useClients();
  const deleteClient = useDeleteClient();

  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return clients;
    }

    const digitQuery = stripNonDigits(query);

    return clients.filter((item) => {
      const haystack = `${item.name} ${item.phone ?? ""} ${item.address ?? ""} ${item.notes ?? ""}`.toLowerCase();
      if (haystack.includes(query)) {
        return true;
      }

      if (digitQuery.length >= 3 && item.phone_normalized) {
        return item.phone_normalized.includes(digitQuery);
      }

      return false;
    });
  }, [clients, search]);

  function handleOpenCreate() {
    setEditingClient(null);
    setSheetOpen(true);
  }

  function handleOpenEdit(client: Client) {
    setEditingClient(client);
    setSheetOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingClient) {
      return;
    }

    try {
      await deleteClient.mutateAsync(deletingClient.id);
      setDeletingClient(null);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Carregando clientes</span>
        <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-zinc-200/80" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl border border-zinc-200 bg-white" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl border border-zinc-200 bg-white" />
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
          <AlertCircle
            className="h-4 w-4 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>Não foi possível carregar os clientes.</span>
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
        searchPlaceholder="Buscar cliente ou telefone..."
        searchAriaLabel="Buscar cliente por nome, telefone ou endereço"
        addLabel="Novo"
        addAriaLabel="Novo cliente"
        onAdd={handleOpenCreate}
      />

      {filteredClients.length === 0 ? (
        <EmptyState
          icon={
            <Users className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          }
          title={
            clients.length === 0
              ? "Nenhum cliente cadastrado"
              : "Nenhum cliente encontrado"
          }
          description={
            clients.length === 0
              ? "Ao criar um orçamento com nome e telefone, o cliente entra aqui automaticamente. Você também pode cadastrar manualmente."
              : "Nenhum cliente corresponde à sua busca."
          }
          action={
            clients.length === 0 ? (
              <Button onClick={handleOpenCreate}>Cadastrar cliente</Button>
            ) : (
              <Button variant="secondary" onClick={() => setSearch("")}>
                Limpar busca
              </Button>
            )
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filteredClients.map((client) => {
            const whatsappUrl = buildWhatsAppUrl(client.phone);

            return (
              <li
                key={client.id}
                className="rounded-xl border border-zinc-200 bg-white p-4"
              >
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-medium text-neutral-950">
                    {client.name}
                  </h2>
                  <p className="text-xs text-neutral-600 tabular-nums">
                    {client.phone
                      ? formatPhoneBR(client.phone)
                      : "Sem telefone cadastrado"}
                  </p>
                  {client.address ? (
                    <p className="text-xs text-neutral-600">{client.address}</p>
                  ) : null}
                </div>

                {client.notes ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-600">
                    {client.notes}
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
                      <MessageCircle
                        className="h-4 w-4"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      WhatsApp
                    </a>
                  ) : null}

                  <Button
                    variant="secondary"
                    onClick={() => handleOpenEdit(client)}
                  >
                    Editar
                  </Button>

                  <Button
                    variant="danger"
                    size="icon"
                    aria-label={`Excluir ${client.name}`}
                    onClick={() => setDeletingClient(client)}
                  >
                    <Trash2
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ClientFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        client={editingClient}
      />

      <ConfirmSheet
        open={deletingClient !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingClient(null);
          }
        }}
        title="Excluir cliente"
        description={
          deletingClient
            ? `Deseja excluir "${deletingClient.name}" do catálogo de clientes? Orçamentos já emitidos manterão os dados originais preservados.`
            : ""
        }
        confirmLabel="Excluir"
        isLoading={deleteClient.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
