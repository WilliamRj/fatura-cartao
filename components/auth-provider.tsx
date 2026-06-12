"use client";

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getMyAccessProfile,
  renewMyAccessRequest,
  withdrawMyAccessRequest,
  type AccessProfile,
} from "@/lib/access-control";
import { supabase } from "@/lib/supabase/client";
import { FullPageLoading } from "@/components/loading";
import { AccessStatusClient } from "@/components/pages/access-status-client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessProfile: AccessProfile | null;
  isAdmin: boolean;
  refreshAccess: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  accessProfile: null,
  isAdmin: false,
  refreshAccess: async () => {},
  signOut: async () => {},
});

const LoginClient = React.lazy(() =>
  import("@/components/pages/login-client").then((module) => ({
    default: module.LoginClient,
  })),
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [accessProfile, setAccessProfile] =
    React.useState<AccessProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const checkAuthorization = React.useCallback(
    async (currentSession: Session | null) => {
      setSession(currentSession);

      if (!currentSession?.user) {
        setUser(null);
        setAccessProfile(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await getMyAccessProfile(currentSession.user);
        setAccessProfile(profile);

        if (profile.status !== "approved") {
          queryClient.clear();
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(currentSession.user);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao verificar autorização:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao verificar autorização.",
        );
        await supabase.auth.signOut();
        queryClient.clear();
        setSession(null);
        setUser(null);
        setAccessProfile(null);
        setLoading(false);
      }
    },
    [queryClient],
  );

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      void checkAuthorization(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === "SIGNED_IN") {
        queryClient.clear();
        setUser(null);
        setLoading(true);
        void checkAuthorization(currentSession);
      } else if (event === "SIGNED_OUT") {
        queryClient.clear();
        setSession(null);
        setUser(null);
        setAccessProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuthorization, queryClient]);

  React.useEffect(() => {
    if (!session?.user || !user) return;

    const verifyCurrentAccess = () => {
      void checkAuthorization(session);
    };
    const interval = window.setInterval(verifyCurrentAccess, 60_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        verifyCurrentAccess();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkAuthorization, session, user]);

  const refreshAccess = React.useCallback(async () => {
    setLoading(true);
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    await checkAuthorization(currentSession);
  }, [checkAuthorization]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    setSession(null);
    setUser(null);
    setAccessProfile(null);
  }, [queryClient]);

  const renewAccess = React.useCallback(async () => {
    await renewMyAccessRequest();
    await refreshAccess();
  }, [refreshAccess]);

  const withdrawAccess = React.useCallback(async () => {
    await withdrawMyAccessRequest();
    await refreshAccess();
  }, [refreshAccess]);

  if (loading) {
    return <FullPageLoading />;
  }

  if (session?.user && accessProfile && accessProfile.status !== "approved") {
    return (
      <AccessStatusClient
        profile={accessProfile}
        onRefresh={refreshAccess}
        onRenew={renewAccess}
        onSignOut={signOut}
        onWithdraw={withdrawAccess}
      />
    );
  }

  if (!user) {
    return (
      <React.Suspense fallback={<FullPageLoading />}>
        <LoginClient />
      </React.Suspense>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessProfile,
        isAdmin: accessProfile?.isAdmin ?? false,
        refreshAccess,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
