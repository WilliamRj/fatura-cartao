"use client";

import * as React from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { BRAND_NAME, BRAND_TAGLINE, BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 24 24"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.87A6.02 6.02 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.79.5 3.82 1.5l2.88-2.87A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z"
      />
    </svg>
  );
}

export function LoginClient() {
  const [loading, setLoading] = React.useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Erro ao iniciar login com Google:", error);
        toast.error("Não foi possível iniciar o login. Tente novamente.");
      }
    } catch (error) {
      toast.error("Não foi possível iniciar o login. Tente novamente.");
      console.error("Erro ao iniciar autenticação com Google:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--chart-2),var(--chart-6),var(--chart-1))]" />

      <header className="flex h-16 shrink-0 items-center border-b border-border/80 bg-background/90 px-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <BrandLogo className="text-foreground" />
          <ThemeToggle className="border border-border/70 bg-background shadow-sm hover:bg-muted" />
        </div>
      </header>

      <section className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <Card className="relative w-full max-w-[420px] gap-0 rounded-lg py-0 shadow-xl shadow-foreground/5 ring-border">
          <CardHeader className="items-center gap-2 border-b border-border/70 px-6 py-7 text-center sm:px-8">
            <CardTitle className="text-xl font-semibold">Bem-vindo</CardTitle>
            <CardDescription className="max-w-xs leading-relaxed">
              Entre para acessar suas faturas e continuar organizando seus gastos.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 px-6 py-7 sm:px-8">
            <Button
              aria-label="Entrar com a conta Google"
              className="h-11 w-full justify-center gap-3 border-border bg-background px-4 text-foreground shadow-sm hover:bg-muted"
              disabled={loading}
              onClick={handleGoogleSignIn}
              size="lg"
              variant="outline"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin text-primary" />
                  Conectando...
                </>
              ) : (
                <>
                  <GoogleIcon />
                  Continuar com Google
                </>
              )}
            </Button>

            <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/40 p-3.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Sua conta identifica seus dados com segurança. Cada usuário acessa somente as
                próprias faturas e informações.
              </p>
            </div>

            <p aria-live="polite" className="text-center text-xs text-muted-foreground">
              {loading ? "Abrindo a autenticação segura do Google..." : "Acesso seguro via Google"}
            </p>
          </CardContent>
        </Card>
      </section>

      <footer className="shrink-0 border-t border-border/60 px-5 py-4 text-center text-xs text-muted-foreground">
        {BRAND_NAME} · {BRAND_TAGLINE}
      </footer>
    </main>
  );
}
