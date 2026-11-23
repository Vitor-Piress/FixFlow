import { useMemo, useState } from "react";
import {
  AlertCircle,
  FileSignature,
  FileText,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContractFormSheet } from "@/features/contracts/components/ContractFormSheet";
import { ContractPdfSheet } from "@/features/contracts/components/ContractPdfSheet";
import {
  useContracts,
  useRemoveContractPdf,
  useToggleContractActive,
} from "@/features/contracts/hooks/useContracts";
import { formatDateBR } from "@/lib/dates";
import { formatCentsToBRL } from "@/lib/money";
import {
  buildWhatsAppUrl,
  cn,
  formatPhoneBR,
  stripNonDigits,
} from "@/lib/utils";
import type { Contract } from "@/services/contracts.service";

type ContractStatusFilter = "active" | "inactive";

export function ContractsPage() {
  const { data: contracts = [], isLoading, isError, refetch } = useContracts();
  const toggleActive = useToggleContractActive();
  const removePdf = useRemoveContractPdf();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ContractStatusFilter>("active");

  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(
    null,
  );
  const [pdfSheetContractId, setPdfSheetContractId] = useState<string | null>(
    null,
  );

  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [deactivatingContract, setDeactivatingContract] =
    useState<Contract | null>(null);
  const [removingPdfContract, setRemovingPdfContract] =
    useState<Contract | null>(null);

  const summary = useMemo(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    let activeMonthlyTotalCents = 0;
    let activeWithPdfCount = 0;

    for (const contract of contracts) {
      if (contract.is_active) {
        activeCount += 1;
        activeMonthlyTotalCents += contract.monthly_amount_cents;
        if (contract.pdf_path) {
          activeWithPdfCount += 1;
        }
      } else {
        inactiveCount += 1;
      }
    }

    return {
      activeCount,
      inactiveCount,
      activeMonthlyTotalCents,
      activeWithPdfCount,
    };
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    const targetActive = statusFilter === "active";
    const query = search.trim().toLowerCase();
    const digitQuery = stripNonDigits(query);

    return contracts.filter((contract) => {
      if (contract.is_active !== targetActive) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = `${contract.client_name} ${contract.client_phone ?? ""} ${contract.scope_description ?? ""}`.toLowerCase();
      if (haystack.includes(query)) {
        return true;
      }

      if (digitQuery.length >= 3 && contract.client_phone) {
        return stripNonDigits(contract.client_phone).includes(digitQuery);
      }

      return false;
    });
  }, [contracts, statusFilter, search]);

  const editingContract = useMemo(
    () => contracts.find((item) => item.id === editingContractId) ?? null,
    [contracts, editingContractId],
  );

  const pdfSheetContract = useMemo(
    () => contracts.find((item) => item.id === pdfSheetContractId) ?? null,
    [contracts, pdfSheetContractId],
  );

  function handleOpenCreate() {
    setEditingContractId(null);
    setFormSheetOpen(true);
  }

  function handleOpenEdit(contract: Contract) {
    setEditingContractId(contract.id);
    setFormSheetOpen(true);
  }

  async function handleReactivate(contract: Contract) {
    setReactivatingId(contract.id);
    try {
      await toggleActive.mutateAsync({
        id: contract.id,
        isActive: true,
        currentEndedAt: contract.ended_at,
      });
    } catch {
      // Mutation onError already notifies the user via toast.
    } finally {
      setReactivatingId(null);
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivatingContract) {
      return;
    }

    try {
      await toggleActive.mutateAsync({
        id: deactivatingContract.id,
        isActive: false,
      });
      setDeactivatingContract(null);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  async function handleConfirmRemovePdf() {
    if (!removingPdfContract?.pdf_path) {
      return;
    }

    try {
      await removePdf.mutateAsync({
        contractId: removingPdfContract.id,
        currentPdfPath: removingPdfContract.pdf_path,
      });
      setRemovingPdfContract(null);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Carregando contratos</span>
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        <div className="h-28 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        <div className="h-28 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
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
          <span>Não foi possível carregar os contratos.</span>
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

  const hasSearch = search.trim().length > 0;
  const activeSummaryLabel =
    summary.activeCount === 1 ? "1 ativo" : `${summary.activeCount} ativos`;

  return (
    <div className="flex flex-col gap-5">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-xs font-medium text-neutral-600">
          Receita recorrente mensal
        </p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950 tabular-nums">
          {formatCentsToBRL(summary.activeMonthlyTotalCents)}
        </p>
        <p className="mt-1.5 text-xs text-neutral-600 tabular-nums">
          {contracts.length === 0
            ? "Cadastre mensalistas para acompanhar sua receita fixa."
            : summary.activeCount === 0
              ? `${summary.inactiveCount} ${summary.inactiveCount === 1 ? "contrato encerrado" : "contratos encerrados"}`
              : `${activeSummaryLabel} · ${summary.activeWithPdfCount} com PDF`}
        </p>
      </section>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              strokeWidth={1.75}
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente ou escopo..."
              aria-label="Buscar contrato por cliente, telefone ou escopo"
              className={cn(
                "min-h-11 w-full rounded-lg border border-neutral-500 bg-white py-2.5 pr-11 pl-10 text-base text-neutral-950",
                "placeholder:text-neutral-500 transition-colors",
                "focus:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
              )}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-0 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
              >
                <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <Button
            onClick={handleOpenCreate}
            aria-label="Novo contrato"
            className="shrink-0 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Novo</span>
          </Button>
        </div>

        <div
          role="group"
          aria-label="Filtrar contratos por situação"
          className="flex items-center gap-2"
        >
          <button
            type="button"
            aria-pressed={statusFilter === "active"}
            onClick={() => setStatusFilter("active")}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors tabular-nums",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
              statusFilter === "active"
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-500 bg-white text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100",
            )}
          >
            <span>Ativos</span>
            <span
              className={
                statusFilter === "active"
                  ? "text-neutral-200"
                  : "text-neutral-600"
              }
            >
              ({summary.activeCount})
            </span>
          </button>

          <button
            type="button"
            aria-pressed={statusFilter === "inactive"}
            onClick={() => setStatusFilter("inactive")}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors tabular-nums",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
              statusFilter === "inactive"
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-500 bg-white text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100",
            )}
          >
            <span>Encerrados</span>
            <span
              className={
                statusFilter === "inactive"
                  ? "text-neutral-200"
                  : "text-neutral-600"
              }
            >
              ({summary.inactiveCount})
            </span>
          </button>
        </div>
      </div>

      {filteredContracts.length === 0 ? (
        <EmptyState
          icon={
            <FileSignature
              className="h-5 w-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          }
          title={
            contracts.length === 0
              ? "Nenhum contrato cadastrado"
              : hasSearch
                ? "Nenhum contrato encontrado"
                : statusFilter === "active"
                  ? "Nenhum contrato ativo"
                  : "Nenhum contrato encerrado"
          }
          description={
            contracts.length === 0
              ? "Cadastre seus mensalistas para controlar vencimentos, gerar cobranças no mês e guardar o PDF."
              : hasSearch
                ? "Nenhum contrato corresponde à sua busca."
                : statusFilter === "active"
                  ? "Todos os contratos cadastrados estão encerrados no momento."
                  : "Contratos desativados ficam salvos aqui para consulta e reativação."
          }
          action={
            contracts.length === 0 ? (
              <Button onClick={handleOpenCreate}>Cadastrar contrato</Button>
            ) : hasSearch ? (
              <Button variant="secondary" onClick={() => setSearch("")}>
                Limpar busca
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "active" ? "inactive" : "active",
                  )
                }
              >
                {statusFilter === "active" ? "Ver encerrados" : "Ver ativos"}
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200 bg-white">
          {filteredContracts.map((contract) => {
            const whatsappUrl = buildWhatsAppUrl(contract.client_phone);
            const dueDayLabel = `Dia ${String(contract.due_day).padStart(2, "0")}`;
            const hasPdf = Boolean(contract.pdf_path);

            return (
              <li key={contract.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-medium text-neutral-950">
                        {contract.client_name}
                      </h2>
                      {!contract.is_active ? (
                        <Badge variant="warning">Encerrado</Badge>
                      ) : null}
                      {hasPdf ? <Badge variant="neutral">PDF</Badge> : null}
                    </div>

                    {contract.client_phone ? (
                      <p className="mt-1 text-xs text-neutral-600 tabular-nums">
                        {formatPhoneBR(contract.client_phone)}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-neutral-950 tabular-nums">
                      {formatCentsToBRL(contract.monthly_amount_cents)}
                    </p>
                    <p className="text-xs text-neutral-500 tabular-nums">
                      / mês · {dueDayLabel}
                    </p>
                  </div>
                </div>

                {contract.scope_description ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-600">
                    {contract.scope_description}
                  </p>
                ) : null}

                <p className="mt-2 text-xs text-neutral-500 tabular-nums">
                  Início {formatDateBR(contract.started_at)}
                  {contract.ended_at
                    ? ` · Término ${formatDateBR(contract.ended_at)}`
                    : ""}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp de ${contract.client_name}`}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-neutral-500 bg-white px-3 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                    >
                      <MessageCircle
                        className="h-4 w-4 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>WhatsApp</span>
                    </a>
                  ) : null}

                  <Button
                    variant="secondary"
                    aria-label={
                      hasPdf
                        ? `PDF de ${contract.client_name}`
                        : `Anexar PDF para ${contract.client_name}`
                    }
                    onClick={() => setPdfSheetContractId(contract.id)}
                  >
                    {hasPdf ? (
                      <FileText
                        className="h-4 w-4 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    ) : (
                      <Paperclip
                        className="h-4 w-4 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    )}
                    <span>{hasPdf ? "PDF" : "Anexar PDF"}</span>
                  </Button>

                  <Button
                    variant="secondary"
                    aria-label={`Editar contrato de ${contract.client_name}`}
                    onClick={() => handleOpenEdit(contract)}
                  >
                    Editar
                  </Button>

                  {contract.is_active ? (
                    <Button
                      variant="ghost"
                      aria-label={`Desativar contrato de ${contract.client_name}`}
                      onClick={() => setDeactivatingContract(contract)}
                    >
                      Desativar
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      aria-label={`Reativar contrato de ${contract.client_name}`}
                      isLoading={reactivatingId === contract.id}
                      onClick={() => {
                        void handleReactivate(contract);
                      }}
                    >
                      Reativar
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ContractFormSheet
        open={formSheetOpen}
        onOpenChange={(nextOpen) => {
          setFormSheetOpen(nextOpen);
          if (!nextOpen) {
            setEditingContractId(null);
          }
        }}
        contract={editingContract}
      />

      <ContractPdfSheet
        open={pdfSheetContract !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPdfSheetContractId(null);
          }
        }}
        contract={pdfSheetContract}
        onRequestRemovePdf={(contract) => setRemovingPdfContract(contract)}
      />

      <ConfirmSheet
        open={deactivatingContract !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeactivatingContract(null);
          }
        }}
        title="Desativar contrato"
        description={
          deactivatingContract
            ? `Deseja desativar o contrato de "${deactivatingContract.client_name}"? Novas cobranças mensais deixarão de ser geradas, e os lançamentos já registrados no Livro-Caixa serão preservados.`
            : ""
        }
        confirmLabel="Desativar"
        confirmVariant="danger"
        isLoading={toggleActive.isPending}
        onConfirm={handleConfirmDeactivate}
      />

      <ConfirmSheet
        open={removingPdfContract !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setRemovingPdfContract(null);
          }
        }}
        title="Remover PDF do contrato"
        description={
          removingPdfContract
            ? `Deseja remover o PDF anexado ao contrato de "${removingPdfContract.client_name}"? O arquivo será apagado do armazenamento privado.`
            : ""
        }
        confirmLabel="Remover PDF"
        confirmVariant="danger"
        isLoading={removePdf.isPending}
        onConfirm={handleConfirmRemovePdf}
      />
    </div>
  );
}
