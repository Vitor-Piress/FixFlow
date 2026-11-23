import { supabase } from "@/lib/supabase";
import type { Tables, TablesUpdate } from "@/types/database.types";

export type BusinessProfile = Tables<"business_profile">;

export type BusinessProfileUpdate = Omit<
  TablesUpdate<"business_profile">,
  "id" | "created_at" | "updated_at"
>;

/**
 * Fetches the singleton business profile (`id = 1`) for the provider.
 */
export async function getBusinessProfile(): Promise<BusinessProfile> {
  const { data, error } = await supabase
    .from("business_profile")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error("Não foi possível carregar os dados do emitente.");
  }

  return data;
}

/**
 * Updates the singleton business profile (`id = 1`) and returns the saved row.
 */
export async function updateBusinessProfile(
  payload: BusinessProfileUpdate,
): Promise<BusinessProfile> {
  const { data, error } = await supabase
    .from("business_profile")
    .update(payload)
    .eq("id", 1)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível salvar os dados do emitente.");
  }

  return data;
}
