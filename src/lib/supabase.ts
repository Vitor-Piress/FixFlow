import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (
  typeof supabaseUrl !== "string" ||
  supabaseUrl.trim() === "" ||
  typeof supabaseAnonKey !== "string" ||
  supabaseAnonKey.trim() === ""
) {
  throw new Error(
    "Configuração do Supabase ausente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
  );
}

/**
 * Single Supabase client instance typed with the generated Database schema.
 * Only `src/services/*.service.ts` should import and query this client.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
