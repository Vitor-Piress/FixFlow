import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface SignInCredentials {
  email: string;
  password: string;
}

function mapAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }

  if (normalized.includes("email not confirmed")) {
    return "E-mail ainda não confirmado no Supabase Auth.";
  }

  if (normalized.includes("too many requests") || normalized.includes("rate limit")) {
    return "Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "Não foi possível conectar ao servidor. Verifique sua internet.";
  }

  return "Não foi possível entrar agora. Tente novamente.";
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(mapAuthErrorMessage(error.message));
  }

  return data.session;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Signs the user in with e-mail and password (single-user app, no public signup).
 */
export async function signInWithPassword(
  credentials: SignInCredentials,
): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email.trim(),
    password: credentials.password,
  });

  if (error) {
    throw new Error(mapAuthErrorMessage(error.message));
  }

  if (!data.session) {
    throw new Error("Sessão não retornada pelo servidor de autenticação.");
  }

  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error("Não foi possível encerrar a sessão. Tente novamente.");
  }
}
