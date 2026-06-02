"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
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
        toast.error("Erro no login: " + error.message);
      }
    } catch (error) {
      toast.error("Erro ao tentar fazer login");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Cartão Inteligente</CardTitle>
          <CardDescription>Gerencie suas faturas de cartão de crédito</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Faça login com sua conta Google para começar
          </p>

          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            size="lg"
            className="w-full"
            variant="default"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Conectando...
              </>
            ) : (
              <>
                🔐 Entrar com Google
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Seguro e rápido</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Seus dados são protegidos e seguros com nossa autenticação via Google
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
