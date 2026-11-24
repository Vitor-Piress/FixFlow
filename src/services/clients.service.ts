import { normalizePhoneDigitsBR } from "@/lib/masks";
import { supabase } from "@/lib/supabase";
import { emptyStringToNull } from "@/lib/utils";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type Client = Tables<"clients">;

export type ClientInsert = Omit<
  TablesInsert<"clients">,
  "id" | "phone_normalized" | "created_at" | "updated_at"
>;

export type ClientUpdate = Omit<
  TablesUpdate<"clients">,
  "id" | "phone_normalized" | "created_at" | "updated_at"
>;

export interface EnsureClientInput {
  name: string;
  phone: string | null;
  address: string | null;
}

export interface EnsureClientResult {
  client: Client | null;
  created: boolean;
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar os clientes.");
  }

  return data;
}

export async function createClient(payload: ClientInsert): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um cliente cadastrado com este telefone.");
    }
    throw new Error("Não foi possível cadastrar o cliente.");
  }

  return data;
}

export async function updateClient(
  id: string,
  payload: ClientUpdate,
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um cliente cadastrado com este telefone.");
    }
    throw new Error("Não foi possível atualizar o cliente.");
  }

  return data;
}

// Existing quotes preserve their own snapshot and receive `client_id = null` via ON DELETE SET NULL.
export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    throw new Error("Não foi possível excluir o cliente.");
  }
}

/**
 * Automatically ensures a client record when a quote has both name and a valid Brazilian phone.
 * Existing clients matched by normalized phone are returned untouched (edits happen only in Catalog > Clients).
 */
export async function ensureClientFromQuote(
  input: EnsureClientInput,
): Promise<EnsureClientResult> {
  const trimmedName = input.name.trim();
  const normalizedPhone = normalizePhoneDigitsBR(input.phone ?? "");

  if (
    trimmedName.length < 2 ||
    (normalizedPhone.length !== 10 && normalizedPhone.length !== 11)
  ) {
    return { client: null, created: false };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("clients")
    .select("*")
    .eq("phone_normalized", normalizedPhone)
    .maybeSingle();

  if (lookupError) {
    throw new Error("Não foi possível verificar o cadastro do cliente.");
  }

  if (existing) {
    return { client: existing, created: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("clients")
    .insert({
      name: trimmedName,
      phone: emptyStringToNull(input.phone),
      address: emptyStringToNull(input.address),
    })
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: concurrent } = await supabase
        .from("clients")
        .select("*")
        .eq("phone_normalized", normalizedPhone)
        .maybeSingle();

      return { client: concurrent ?? null, created: false };
    }

    throw new Error("Não foi possível salvar o cliente automaticamente.");
  }

  return { client: inserted, created: true };
}
