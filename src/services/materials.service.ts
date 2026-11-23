import { getTodayISODate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";
import type { Supplier } from "@/services/suppliers.service";

export type Material = Tables<"materials">;

export type MaterialWithSupplier = Material & {
  supplier: Pick<Supplier, "id" | "name" | "phone"> | null;
};

export type MaterialInsert = Omit<
  TablesInsert<"materials">,
  "id" | "created_at" | "updated_at"
>;

export type MaterialUpdate = Omit<
  TablesUpdate<"materials">,
  "id" | "created_at" | "updated_at"
>;

export interface ListMaterialsOptions {
  activeOnly?: boolean;
}

const MATERIAL_SELECT_WITH_SUPPLIER =
  "*, supplier:suppliers(id, name, phone)" as const;

/**
 * Lists catalog materials with optional supplier summary, ordered with active items first.
 */
export async function listMaterials(
  options?: ListMaterialsOptions,
): Promise<MaterialWithSupplier[]> {
  let query = supabase
    .from("materials")
    .select(MATERIAL_SELECT_WITH_SUPPLIER)
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Não foi possível carregar os materiais.");
  }

  return data;
}

/**
 * Creates a new material and sets `price_updated_at` to today's local date if omitted.
 */
export async function createMaterial(
  payload: MaterialInsert,
): Promise<MaterialWithSupplier> {
  const { data, error } = await supabase
    .from("materials")
    .insert({
      ...payload,
      price_updated_at: payload.price_updated_at ?? getTodayISODate(),
    })
    .select(MATERIAL_SELECT_WITH_SUPPLIER)
    .single();

  if (error) {
    throw new Error("Não foi possível cadastrar o material.");
  }

  return data;
}

/**
 * Updates an existing material by ID.
 * Callers must pass `price_updated_at` when `unit_price_cents` changed.
 */
export async function updateMaterial(
  id: string,
  payload: MaterialUpdate,
): Promise<MaterialWithSupplier> {
  const { data, error } = await supabase
    .from("materials")
    .update(payload)
    .eq("id", id)
    .select(MATERIAL_SELECT_WITH_SUPPLIER)
    .single();

  if (error) {
    throw new Error("Não foi possível atualizar o material.");
  }

  return data;
}

/**
 * Soft-deletes (`is_active = false`) or reactivates (`is_active = true`) a material.
 */
export async function setMaterialActive(
  id: string,
  isActive: boolean,
): Promise<MaterialWithSupplier> {
  const { data, error } = await supabase
    .from("materials")
    .update({ is_active: isActive })
    .eq("id", id)
    .select(MATERIAL_SELECT_WITH_SUPPLIER)
    .single();

  if (error) {
    throw new Error(
      isActive
        ? "Não foi possível reativar o material."
        : "Não foi possível desativar o material.",
    );
  }

  return data;
}
