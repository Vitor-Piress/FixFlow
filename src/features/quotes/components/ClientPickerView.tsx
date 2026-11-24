import { useMemo } from "react";
import { Check, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatPhoneBR, stripNonDigits } from "@/lib/utils";
import type { Client } from "@/services/clients.service";

function filterClientsByQuery(
  clients: readonly Client[],
  query: string,
): Client[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [...clients];
  }

  const lower = trimmed.toLowerCase();
  const digits = stripNonDigits(trimmed);

  return clients.filter((client) => {
    const nameMatch = client.name.toLowerCase().includes(lower);
    const addressMatch =
      client.address?.toLowerCase().includes(lower) ?? false;
    const phoneMatch =
      digits.length >= 2 &&
      (client.phone_normalized?.includes(digits) ?? false);

    return nameMatch || addressMatch || phoneMatch;
  });
}

interface ClientPickerSearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export function ClientPickerSearchBar({
  query,
  onQueryChange,
}: ClientPickerSearchBarProps) {
  return (
    <div className="relative flex items-center">
      <Search
        aria-hidden="true"
        strokeWidth={1.75}
        className="pointer-events-none absolute left-3.5 h-4 w-4 text-zinc-600"
      />
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscar por nome ou telefone"
        aria-label="Buscar cliente cadastrado"
        autoComplete="off"
        className={cn(
          "min-h-11 w-full rounded-lg border border-zinc-500 bg-white py-2.5 pr-11 pl-10 text-base text-zinc-950",
          "placeholder:text-zinc-500 transition-colors",
          "focus:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
        )}
      />
      {query ? (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label="Limpar busca de cliente"
          className="absolute right-0 inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
        >
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

interface ClientPickerViewProps {
  clients: readonly Client[];
  searchQuery: string;
  selectedClientId: string | null;
  onClearSearch: () => void;
  onSelectClient: (client: Client) => void;
}

export function ClientPickerView({
  clients,
  searchQuery,
  selectedClientId,
  onClearSearch,
  onSelectClient,
}: ClientPickerViewProps) {
  const filteredClients = useMemo(
    () => filterClientsByQuery(clients, searchQuery),
    [clients, searchQuery],
  );
  function handlePick(client: Client) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onSelectClient(client);
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700">
          <Users className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-semibold text-zinc-950">
          Nenhum cliente cadastrado ainda
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600">
          Toque em Cadastrar novo cliente abaixo para preencher nome e telefone.
        </p>
      </div>
    );
  }

  if (filteredClients.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-zinc-950">
          Nenhum cliente encontrado
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600">
          Não encontramos cadastro para &quot;{searchQuery.trim()}&quot;. Limpe
          a busca ou cadastre um novo cliente abaixo.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 bg-white"
          onClick={onClearSearch}
        >
          Limpar busca
        </Button>
      </div>
    );
  }

  return (
    <ul
      role="list"
      aria-label="Lista de clientes cadastrados"
      className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white"
    >
      {filteredClients.map((client) => {
        const isSelected = client.id === selectedClientId;
        const formattedPhone = formatPhoneBR(client.phone);

        return (
          <li key={client.id}>
            <button
              type="button"
              onClick={() => handlePick(client)}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "flex min-h-11 w-full flex-col items-start justify-center px-3.5 py-3 text-left transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950",
                isSelected
                  ? "bg-zinc-100"
                  : "bg-white hover:bg-zinc-50 active:bg-zinc-100",
              )}
            >
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold text-zinc-950">
                    {client.name}
                  </span>
                  {isSelected ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">
                      <Check
                        className="h-3 w-3"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      Atual
                    </span>
                  ) : null}
                </div>

                {formattedPhone ? (
                  <span className="shrink-0 text-xs font-medium text-zinc-600 tabular-nums">
                    {formattedPhone}
                  </span>
                ) : null}
              </div>

              {client.address ? (
                <span className="mt-1 w-full truncate text-xs text-zinc-600">
                  {client.address}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
