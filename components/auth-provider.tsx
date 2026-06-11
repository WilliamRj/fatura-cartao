"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { FullPageLoading } from "@/components/loading";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

// Import login page dynamically to avoid circular dependency
const LoginPage = React.lazy(() => import("@/app/login/page").then(m => ({ default: m.default })));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAuthorization = async (session: Session | null) => {
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("authorized_users")
          .select("email")
          .eq("email", session.user.email)
          .single();

        if (error || !data) {
          toast.error("Usuário não autorizado");
          await supabase.auth.signOut();
          queryClient.clear();
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(session.user);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao verificar autorização:", err);
        toast.error("Erro ao verificar autorização");
        await supabase.auth.signOut();
        queryClient.clear();
        setUser(null);
        setLoading(false);
      }
    };

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAuthorization(session);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        queryClient.clear();
        setUser(null);
        setLoading(true);
        checkAuthorization(session);
      } else if (event === "SIGNED_OUT") {
        queryClient.clear();
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [queryClient]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  // Show loading screen while checking auth state
  if (loading) {
    return <FullPageLoading />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <React.Suspense fallback={<FullPageLoading />}>
        <LoginPage />
      </React.Suspense>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
