import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type Service = Tables<"services">;

export type ServiceInsert = Omit<
  TablesInsert<"services">,
  "id" | "created_at" | "updated_at"
>;

export type ServiceUpdate = Omit<
  TablesUpdate<"services">,
  "id" | "created_at" | "updated_at"
>;

export interface ListServicesOptions {
  activeOnly?: boolean;
}

export async function listServices(
  options?: ListServicesOptions,
): Promise<Service[]> {
  let query = supabase
    .from("services")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Não foi possível carregar o catálogo de serviços.");
  }

  return data;
}

export async function createService(payload: ServiceInsert): Promise<Service> {
  const { data, error } = await supabase
    .from("services")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível cadastrar o serviço.");
  }

  return data;
}

export async function updateService(
  id: string,
  payload: ServiceUpdate,
): Promise<Service> {
  const { data, error } = await supabase
    .from("services")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível atualizar o serviço.");
  }

  return data;
}

export async function setServiceActive(
  id: string,
  isActive: boolean,
): Promise<Service> {
  const { data, error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      isActive
        ? "Não foi possível reativar o serviço."
        : "Não foi possível desativar o serviço.",
    );
  }

  return data;
}
