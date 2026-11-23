import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FINANCIAL_TRANSACTIONS_QUERY_KEY } from "@/features/quotes/hooks/useQuotes";
import { getCurrentBillingMonth } from "@/lib/dates";
import {
  createContract,
  createContractPdfSignedUrl,
  listContracts,
  removeContractPdf,
  setContractActive,
  syncMonthlyRecurringTransactions,
  updateContract,
  uploadContractPdf,
  type Contract,
  type ContractInsert,
  type ContractUpdate,
  type ListContractsOptions,
} from "@/services/contracts.service";

export const CONTRACTS_QUERY_KEY = ["contracts"] as const;

function isEndedBeforeCurrentMonth(endedAt: string | null | undefined): boolean {
  if (!endedAt) {
    return false;
  }

  const currentMonthStart = `${getCurrentBillingMonth()}-01`;
  return endedAt < currentMonthStart;
}

export function useContracts(options?: ListContractsOptions) {
  const activeOnly = Boolean(options?.activeOnly);

  return useQuery({
    queryKey: [...CONTRACTS_QUERY_KEY, { activeOnly }] as const,
    queryFn: () => listContracts({ activeOnly }),
  });
}

export interface CreateContractVariables {
  payload: ContractInsert;
  pdfFile?: File | null;
}

export interface CreateContractResult {
  contract: Contract;
  pdfUploadFailed: boolean;
  recurringSyncFailed: boolean;
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payload,
      pdfFile,
    }: CreateContractVariables): Promise<CreateContractResult> => {
      let contract = await createContract(payload);
      let pdfUploadFailed = false;
      let recurringSyncFailed = false;

      if (pdfFile) {
        try {
          contract = await uploadContractPdf(contract.id, pdfFile);
        } catch {
          pdfUploadFailed = true;
        }
      }

      if (contract.is_active) {
        try {
          await syncMonthlyRecurringTransactions(getCurrentBillingMonth());
        } catch {
          recurringSyncFailed = true;
        }
      }

      return { contract, pdfUploadFailed, recurringSyncFailed };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });

      if (result.pdfUploadFailed && result.recurringSyncFailed) {
        toast.warning(
          "Contrato cadastrado, mas não foi possível enviar o PDF nem atualizar os lançamentos do mês.",
        );
        return;
      }

      if (result.pdfUploadFailed) {
        toast.warning(
          "Contrato cadastrado, mas não foi possível enviar o PDF. Tente novamente pelo botão PDF.",
        );
        return;
      }

      if (result.recurringSyncFailed) {
        toast.warning(
          "Contrato cadastrado, mas não foi possível gerar o lançamento deste mês.",
        );
        return;
      }

      toast.success("Contrato cadastrado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o contrato.";
      toast.error(message);
    },
  });
}

export interface UpdateContractVariables {
  id: string;
  payload: ContractUpdate;
}

export interface UpdateContractResult {
  contract: Contract;
  recurringSyncFailed: boolean;
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: UpdateContractVariables): Promise<UpdateContractResult> => {
      const contract = await updateContract(id, payload);
      let recurringSyncFailed = false;

      if (contract.is_active) {
        try {
          await syncMonthlyRecurringTransactions(getCurrentBillingMonth());
        } catch {
          recurringSyncFailed = true;
        }
      }

      return { contract, recurringSyncFailed };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });

      if (result.recurringSyncFailed) {
        toast.warning(
          "Contrato atualizado, mas não foi possível atualizar os lançamentos do mês.",
        );
        return;
      }

      toast.success("Contrato atualizado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o contrato.";
      toast.error(message);
    },
  });
}

export interface ToggleContractActiveVariables {
  id: string;
  isActive: boolean;
  currentEndedAt?: string | null;
}

export interface ToggleContractActiveResult {
  contract: Contract;
  recurringSyncFailed: boolean;
}

export function useToggleContractActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
      currentEndedAt,
    }: ToggleContractActiveVariables): Promise<ToggleContractActiveResult> => {
      if (isActive) {
        const nextEndedAt = isEndedBeforeCurrentMonth(currentEndedAt)
          ? null
          : undefined;
        const contract = await setContractActive(id, true, nextEndedAt);
        let recurringSyncFailed = false;

        try {
          await syncMonthlyRecurringTransactions(getCurrentBillingMonth());
        } catch {
          recurringSyncFailed = true;
        }

        return { contract, recurringSyncFailed };
      }

      const contract = await setContractActive(id, false);
      return { contract, recurringSyncFailed: false };
    },
    onSuccess: (result, variables) => {
      void queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
      });

      if (!variables.isActive) {
        toast.success("Contrato desativado.");
        return;
      }

      if (result.recurringSyncFailed) {
        toast.warning(
          "Contrato reativado, mas não foi possível atualizar os lançamentos do mês.",
        );
        return;
      }

      toast.success("Contrato reativado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a situação do contrato.";
      toast.error(message);
    },
  });
}

export interface UploadContractPdfVariables {
  contractId: string;
  file: File;
  previousPdfPath?: string | null;
}

export function useUploadContractPdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contractId,
      file,
      previousPdfPath,
    }: UploadContractPdfVariables) =>
      uploadContractPdf(contractId, file, previousPdfPath),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
      toast.success(
        variables.previousPdfPath
          ? "PDF do contrato substituído."
          : "PDF anexado ao contrato.",
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o PDF do contrato.";
      toast.error(message);
    },
  });
}

export interface RemoveContractPdfVariables {
  contractId: string;
  currentPdfPath: string;
}

export function useRemoveContractPdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contractId, currentPdfPath }: RemoveContractPdfVariables) =>
      removeContractPdf(contractId, currentPdfPath),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
      toast.success("PDF removido do contrato.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível remover o PDF do contrato.";
      toast.error(message);
    },
  });
}

export interface OpenContractPdfResult {
  signedUrl: string;
  opened: boolean;
}

export function useOpenContractPdf() {
  const preOpenedWindowRef = useRef<Window | null>(null);

  const mutation = useMutation({
    mutationFn: async (pdfPath: string): Promise<OpenContractPdfResult> => {
      try {
        const signedUrl = await createContractPdfSignedUrl(pdfPath);
        const pendingWindow = preOpenedWindowRef.current;
        preOpenedWindowRef.current = null;

        if (pendingWindow && !pendingWindow.closed) {
          pendingWindow.location.replace(signedUrl);
          return { signedUrl, opened: true };
        }

        const fallbackWindow = window.open(
          signedUrl,
          "_blank",
          "noopener,noreferrer",
        );
        if (fallbackWindow) {
          return { signedUrl, opened: true };
        }

        return { signedUrl, opened: false };
      } catch (error) {
        const pendingWindow = preOpenedWindowRef.current;
        preOpenedWindowRef.current = null;
        if (pendingWindow && !pendingWindow.closed) {
          pendingWindow.close();
        }
        throw error;
      }
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o PDF do contrato.";
      toast.error(message);
    },
  });

  async function openPdf(pdfPath: string): Promise<OpenContractPdfResult> {
    if (typeof window !== "undefined") {
      const popup = window.open("about:blank", "_blank");
      if (popup) {
        popup.opener = null;
      }
      preOpenedWindowRef.current = popup;
    }

    return mutation.mutateAsync(pdfPath);
  }

  return {
    openPdf,
    isPending: mutation.isPending,
  };
}
