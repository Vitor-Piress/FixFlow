import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type Supplier = Tables<"suppliers">;

export type SupplierInsert = Omit<
  TablesInsert<"suppliers">,
  "id" | "created_at" | "updated_at"
>;

export type SupplierUpdate = Omit<
  TablesUpdate<"suppliers">,
  "id" | "created_at" | "updated_at"
>;

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Não foi possível carregar os fornecedores.");
  }

  return data;
}

export async function createSupplier(
  payload: SupplierInsert,
): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível cadastrar o fornecedor.");
  }

  return data;
}

export async function updateSupplier(
  id: string,
  payload: SupplierUpdate,
): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível atualizar o fornecedor.");
  }

  return data;
}

// Linked materials keep existing with `supplier_id = null` via ON DELETE SET NULL.
export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);

  if (error) {
    throw new Error("Não foi possível excluir o fornecedor.");
  }
}
