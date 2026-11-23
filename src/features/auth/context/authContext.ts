import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { SignInCredentials } from "@/services/auth.service";

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (credentials: SignInCredentials) => Promise<Session>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
