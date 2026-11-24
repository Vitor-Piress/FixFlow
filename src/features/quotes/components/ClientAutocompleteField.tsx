import {
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { Lock, Plus, UserCheck } from "lucide-react";
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
  onClearSelectedClient: () => void;
  onConfirmNewClient?: () => void;
  error?: string;
}

const MAX_SUGGESTIONS = 6;

export function ClientAutocompleteField({
  value,
  onChange,
  onBlur,
  clients,
  selectedClientId,
  onSelectClient,
  onClearSelectedClient,
  onConfirmNewClient,
  error,
}: ClientAutocompleteFieldProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const feedbackId = `${inputId}-feedback`;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const trimmedQuery = value.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  const digitQuery = stripNonDigits(trimmedQuery);

  const filteredClients = useMemo(() => {
    if (!trimmedQuery) {
      return clients.slice(0, MAX_SUGGESTIONS);
    }

    return clients
      .filter((client) => {
        const nameMatch = client.name.toLowerCase().includes(lowerQuery);
        const addressMatch =
          client.address?.toLowerCase().includes(lowerQuery) ?? false;
        const phoneMatch =
          digitQuery.length >= 2 &&
          (client.phone_normalized?.includes(digitQuery) ?? false);

        return nameMatch || addressMatch || phoneMatch;
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [clients, trimmedQuery, lowerQuery, digitQuery]);

  const hasExactMatch = useMemo(() => {
    if (!trimmedQuery) {
      return false;
    }

    return clients.some(
      (client) => client.name.trim().toLowerCase() === lowerQuery,
    );
  }, [clients, trimmedQuery, lowerQuery]);

  const showCreateHint = trimmedQuery.length >= 2 && !hasExactMatch;
  const totalOptions = filteredClients.length + (showCreateHint ? 1 : 0);
  const dropdownVisible =
    selectedClientId === null && isOpen && totalOptions > 0;

  const clampedActiveIndex =
    activeIndex >= 0 && activeIndex < totalOptions ? activeIndex : -1;

  function handleSelectExisting(client: Client) {
    setIsOpen(false);
    setActiveIndex(-1);
    onSelectClient(client);
  }

  function handleChooseNewClient() {
    setIsOpen(false);
    setActiveIndex(-1);
    onConfirmNewClient?.();
  }

  function handleClearSelection() {
    onClearSelectedClient();
    setActiveIndex(-1);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      setIsOpen(true);
    });
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && containerRef.current?.contains(nextTarget)) {
      return;
    }

    setIsOpen(false);
    setActiveIndex(-1);
    onBlur?.();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (selectedClientId !== null) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(totalOptions > 0 ? 0 : -1);
        return;
      }
      if (totalOptions > 0) {
        setActiveIndex((prev) => (prev + 1) % totalOptions);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen && totalOptions > 0) {
        setIsOpen(true);
        setActiveIndex(totalOptions - 1);
        return;
      }
      if (totalOptions > 0) {
        setActiveIndex((prev) =>
          prev <= 0 ? totalOptions - 1 : prev - 1,
        );
      }
      return;
    }

    if (event.key === "Enter" && dropdownVisible && clampedActiveIndex >= 0) {
      event.preventDefault();
      if (clampedActiveIndex < filteredClients.length) {
        handleSelectExisting(filteredClients[clampedActiveIndex]);
      } else if (showCreateHint) {
        handleChooseNewClient();
      }
      return;
    }

    if (event.key === "Escape" && dropdownVisible) {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      setActiveIndex(-1);
    }
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
              ref={inputRef}
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
            onClick={handleClearSelection}
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

  const activeOptionId =
    dropdownVisible && clampedActiveIndex >= 0
      ? `${listboxId}-opt-${clampedActiveIndex}`
      : undefined;

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      className="relative flex flex-col gap-1.5"
    >
      <label htmlFor={inputId} className="text-sm font-medium text-neutral-900">
        Nome do cliente
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={dropdownVisible}
        aria-controls={dropdownVisible ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error || clients.length > 0 ? feedbackId : undefined
        }
        autoComplete="off"
        placeholder="Digite para buscar ou cadastrar novo"
        value={value}
        onFocus={() => {
          setIsOpen(true);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "min-h-11 w-full scroll-mb-6 rounded-lg border bg-white px-3.5 py-2.5 text-base text-neutral-950",
          "placeholder:text-neutral-500 transition-colors",
          error
            ? "border-red-600 focus:border-red-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-700"
            : "border-neutral-500 focus:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
        )}
      />

      {dropdownVisible ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Clientes sugeridos"
          className="absolute top-[calc(100%-0.75rem)] right-0 left-0 z-30 max-h-64 overflow-y-auto rounded-xl border border-zinc-300 bg-white p-1 shadow-md"
        >
          {filteredClients.map((client, index) => {
            const isHighlighted = index === clampedActiveIndex;
            const formattedPhone = formatPhoneBR(client.phone);

            return (
              <li
                key={client.id}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={isHighlighted}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelectExisting(client)}
                  className={cn(
                    "flex min-h-11 w-full flex-col items-start justify-center rounded-lg px-3 py-2 text-left transition-colors",
                    isHighlighted
                      ? "bg-zinc-100 text-zinc-950"
                      : "text-zinc-950 hover:bg-zinc-100",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-zinc-950">
                      {client.name}
                    </span>
                    {formattedPhone ? (
                      <span className="shrink-0 text-xs text-zinc-600 tabular-nums">
                        {formattedPhone}
                      </span>
                    ) : null}
                  </div>
                  {client.address ? (
                    <span className="mt-0.5 w-full truncate text-xs text-zinc-600">
                      {client.address}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}

          {showCreateHint ? (
            <li
              id={`${listboxId}-opt-${filteredClients.length}`}
              role="option"
              aria-selected={clampedActiveIndex === filteredClients.length}
              className={
                filteredClients.length > 0
                  ? "mt-1 border-t border-zinc-200 pt-1"
                  : undefined
              }
            >
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleChooseNewClient}
                className={cn(
                  "flex min-h-11 w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                  clampedActiveIndex === filteredClients.length
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-950 hover:bg-zinc-100",
                )}
              >
                <Plus
                  className="mt-0.5 h-4 w-4 shrink-0 text-zinc-700"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-950">
                    Novo cliente: {trimmedQuery}
                  </span>
                  <span className="block text-xs text-zinc-600">
                    Informe o telefone abaixo para salvar automaticamente.
                  </span>
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      {error ? (
        <p id={feedbackId} className="text-xs text-red-600">
          {error}
        </p>
      ) : (
        <p id={feedbackId} className="text-xs text-neutral-500">
          {clients.length > 0
            ? "Escolha um cliente cadastrado ou preencha nome e telefone para cadastrar."
            : "Preencha nome e telefone para salvar o cliente automaticamente."}
        </p>
      )}
    </div>
  );
}
