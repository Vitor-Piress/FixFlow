import { useId, useMemo, useRef } from "react";
import { ChevronRight, Lock, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatPhoneBR, stripNonDigits } from "@/lib/utils";
import type { Client } from "@/services/clients.service";

interface ClientAutocompleteFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  clients: readonly Client[];
  selectedClientId: string | null;
  onSelectClient: (client: Client) => void;
  onOpenClientPicker: () => void;
  inputRef?: (element: HTMLInputElement | null) => void;
  error?: string;
}

const MAX_INLINE_MATCHES = 2;

export function ClientAutocompleteField({
  value,
  onChange,
  onBlur,
  clients,
  selectedClientId,
  onSelectClient,
  onOpenClientPicker,
  inputRef,
  error,
}: ClientAutocompleteFieldProps) {
  const inputId = useId();
  const feedbackId = `${inputId}-feedback`;
  const localInputRef = useRef<HTMLInputElement | null>(null);

  const trimmedQuery = value.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  const digitQuery = stripNonDigits(trimmedQuery);

  const inlineMatches = useMemo(() => {
    if (selectedClientId !== null || trimmedQuery.length < 2) {
      return [];
    }

    return clients
      .filter((client) => {
        const nameMatch = client.name.toLowerCase().includes(lowerQuery);
        const phoneMatch =
          digitQuery.length >= 2 &&
          (client.phone_normalized?.includes(digitQuery) ?? false);
        return nameMatch || phoneMatch;
      })
      .slice(0, MAX_INLINE_MATCHES);
  }, [clients, selectedClientId, trimmedQuery, lowerQuery, digitQuery]);

  function handleOpenPickerClick() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onOpenClientPicker();
  }

  function handlePickInlineMatch(client: Client) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onSelectClient(client);
  }

  if (selectedClientId !== null) {
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-neutral-900"
        >
          Nome do cliente
        </label>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={(node) => {
                localInputRef.current = node;
                inputRef?.(node);
              }}
              id={inputId}
              type="text"
              value={value}
              readOnly
              aria-readonly="true"
              aria-describedby={error ? feedbackId : `${inputId}-locked-hint`}
              className={cn(
                "min-h-11 w-full cursor-not-allowed rounded-lg border border-neutral-300 bg-neutral-100 py-2.5 pr-10 pl-3.5 text-base font-medium text-neutral-700",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
              )}
            />
            <Lock
              aria-hidden="true"
              strokeWidth={1.75}
              className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-500"
            />
          </div>

          <Button
            variant="secondary"
            onClick={handleOpenPickerClick}
            aria-label="Trocar cliente selecionado"
            className="shrink-0 bg-white"
          >
            Trocar
          </Button>
        </div>

        <p
          id={`${inputId}-locked-hint`}
          className="flex items-center gap-1.5 text-xs text-zinc-600"
        >
          <UserCheck
            className="h-3.5 w-3.5 shrink-0 text-emerald-800"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>
            Cliente cadastrado. Edite nome e telefone em Catálogo &gt; Clientes.
          </span>
        </p>

        {error ? (
          <p id={feedbackId} className="text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {clients.length > 0 ? (
        <button
          type="button"
          onClick={handleOpenPickerClick}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-zinc-500 bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-zinc-50 active:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Users
              className="h-4 w-4 shrink-0 text-zinc-700"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="truncate text-sm font-medium text-zinc-950">
              Selecionar cliente cadastrado
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-600 tabular-nums">
            <span>{clients.length}</span>
            <ChevronRight
              className="h-4 w-4 text-zinc-600"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </span>
        </button>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-neutral-900"
        >
          Nome do cliente
        </label>

        <input
          ref={(node) => {
            localInputRef.current = node;
            inputRef?.(node);
          }}
          id={inputId}
          type="text"
          aria-invalid={error ? true : undefined}
          aria-describedby={feedbackId}
          autoComplete="off"
          placeholder={
            clients.length > 0
              ? "Ou digite o nome para novo cliente"
              : "Nome completo ou empresa"
          }
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={cn(
            "min-h-11 w-full scroll-mb-6 rounded-lg border bg-white px-3.5 py-2.5 text-base text-neutral-950",
            "placeholder:text-neutral-500 transition-colors",
            error
              ? "border-red-600 focus:border-red-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-700"
              : "border-neutral-500 focus:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
          )}
        />

        {inlineMatches.length > 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2">
            <p className="px-1.5 pb-1.5 text-xs font-medium text-zinc-600">
              Cliente já cadastrado? Toque para selecionar:
            </p>
            <ul className="flex flex-col gap-1">
              {inlineMatches.map((client) => {
                const formattedPhone = formatPhoneBR(client.phone);
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => handlePickInlineMatch(client)}
                      className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left transition-colors hover:bg-zinc-100 active:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
                    >
                      <span className="truncate text-sm font-medium text-zinc-950">
                        {client.name}
                      </span>
                      {formattedPhone ? (
                        <span className="shrink-0 text-xs text-zinc-600 tabular-nums">
                          {formattedPhone}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {error ? (
          <p id={feedbackId} className="text-xs text-red-600">
            {error}
          </p>
        ) : (
          <p id={feedbackId} className="text-xs text-neutral-500">
            {clients.length > 0
              ? "Para novo cliente, informe nome e telefone abaixo."
              : "Preencha nome e telefone para salvar o cliente automaticamente."}
          </p>
        )}
      </div>
    </div>
  );
}
