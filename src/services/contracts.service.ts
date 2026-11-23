import { getCurrentBillingMonth } from "@/lib/dates";
import {
  buildContractPdfStoragePath,
  CONTRACT_PDF_MIME_TYPE,
  validateContractPdfFile,
} from "@/lib/files";
import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

const CONTRACT_PDF_BUCKET = "contract-pdfs";
const CONTRACT_PDF_SIGNED_URL_TTL_SECONDS = 60;

export type Contract = Tables<"contracts">;

export type ContractInsert = Omit<
  TablesInsert<"contracts">,
  "id" | "created_at" | "updated_at"
>;

export type ContractUpdate = Omit<
  TablesUpdate<"contracts">,
  "id" | "created_at" | "updated_at"
>;

export interface ListContractsOptions {
  activeOnly?: boolean;
}

async function removeStorageObjectBestEffort(path: string | null | undefined) {
  const trimmed = path?.trim();
  if (!trimmed) {
    return;
  }

  try {
    await supabase.storage.from(CONTRACT_PDF_BUCKET).remove([trimmed]);
  } catch {
    // Cleanup is best-effort so stale objects never block a saved contract change.
  }
}

export async function listContracts(
  options?: ListContractsOptions,
): Promise<Contract[]> {
  let query = supabase
    .from("contracts")
    .select("*")
    .order("is_active", { ascending: false })
    .order("due_day", { ascending: true })
    .order("client_name", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Não foi possível carregar os contratos.");
  }

  return data;
}

export async function createContract(payload: ContractInsert): Promise<Contract> {
  const { data, error } = await supabase
    .from("contracts")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível cadastrar o contrato.");
  }

  return data;
}

export async function updateContract(
  id: string,
  payload: ContractUpdate,
): Promise<Contract> {
  const { data, error } = await supabase
    .from("contracts")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível atualizar o contrato.");
  }

  return data;
}

export async function setContractActive(
  id: string,
  isActive: boolean,
  endedAt?: string | null,
): Promise<Contract> {
  const payload: ContractUpdate = { is_active: isActive };
  if (endedAt !== undefined) {
    payload.ended_at = endedAt;
  }

  const { data, error } = await supabase
    .from("contracts")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      isActive
        ? "Não foi possível reativar o contrato."
        : "Não foi possível desativar o contrato.",
    );
  }

  return data;
}

export async function uploadContractPdf(
  contractId: string,
  file: File,
  previousPdfPath?: string | null,
): Promise<Contract> {
  const validationError = validateContractPdfFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const nextPdfPath = buildContractPdfStoragePath(contractId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(CONTRACT_PDF_BUCKET)
    .upload(nextPdfPath, file, {
      contentType: CONTRACT_PDF_MIME_TYPE,
      upsert: false,
    });

  if (uploadError) {
    throw new Error("Não foi possível enviar o PDF do contrato.");
  }

  const { data, error: updateError } = await supabase
    .from("contracts")
    .update({ pdf_path: nextPdfPath })
    .eq("id", contractId)
    .select("*")
    .single();

  if (updateError) {
    await removeStorageObjectBestEffort(nextPdfPath);
    throw new Error(
      "O PDF foi enviado, mas não foi possível vinculá-lo ao contrato.",
    );
  }

  if (previousPdfPath && previousPdfPath !== nextPdfPath) {
    await removeStorageObjectBestEffort(previousPdfPath);
  }

  return data;
}

export async function removeContractPdf(
  contractId: string,
  currentPdfPath: string,
): Promise<Contract> {
  const { data, error } = await supabase
    .from("contracts")
    .update({ pdf_path: null })
    .eq("id", contractId)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível remover o PDF do contrato.");
  }

  await removeStorageObjectBestEffort(currentPdfPath);
  return data;
}

export async function createContractPdfSignedUrl(
  pdfPath: string,
): Promise<string> {
  const trimmedPath = pdfPath.trim();
  if (!trimmedPath) {
    throw new Error("Nenhum PDF anexado a este contrato.");
  }

  const { data, error } = await supabase.storage
    .from(CONTRACT_PDF_BUCKET)
    .createSignedUrl(trimmedPath, CONTRACT_PDF_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error("Não foi possível gerar o link temporário do PDF.");
  }

  return data.signedUrl;
}

export async function syncMonthlyRecurringTransactions(
  targetMonth?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc(
    "generate_monthly_recurring_transactions",
    {
      target_month: targetMonth ?? getCurrentBillingMonth(),
    },
  );

  if (error) {
    throw new Error(
      "Não foi possível atualizar os lançamentos recorrentes do mês.",
    );
  }

  return data ?? 0;
}
