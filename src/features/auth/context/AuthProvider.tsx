import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { queryClient } from "@/lib/queryClient";
import {
  getSession,
  onAuthStateChange,
  signInWithPassword,
  signOut as signOutService,
  type SignInCredentials,
} from "@/services/auth.service";
import { AuthContext } from "@/features/auth/context/authContext";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      try {
        const initialSession = await getSession();
        if (isMounted) {
          setSession(initialSession);
        }
      } catch {
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateSession();

    const unsubscribe = onAuthStateChange((event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setIsLoading(false);

      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    const nextSession = await signInWithPassword(credentials);
    setSession(nextSession);
    return nextSession;
  }, []);

  const signOut = useCallback(async () => {
    await signOutService();
    setSession(null);
    queryClient.clear();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signIn,
      signOut,
    }),
    [session, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
