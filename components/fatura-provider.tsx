"use client";

import * as React from "react";
import { useFaturas } from "@/lib/hooks/useFaturas";
import type { Fatura } from "@/lib/data";

interface FaturaContextType {
  faturaAtual: Fatura | null;
  setFaturaAtual: (fatura: Fatura | null) => void;
  faturas: Fatura[];
  isLoading: boolean;
}

const FaturaContext = React.createContext<FaturaContextType | undefined>(undefined);

export function FaturaProvider({ children }: { children: React.ReactNode }) {
  const { data: faturas = [], isLoading } = useFaturas();
  const [faturaAtual, setFaturaAtual] = React.useState<Fatura | null>(null);

  // Set the most recent invoice as default if none selected and data is available
  React.useEffect(() => {
    if (faturas.length > 0) {
      const exists = faturaAtual ? faturas.some((f) => f.id === faturaAtual.id) : false;
      if (!exists) {
        setFaturaAtual(faturas[0]);
      }
    } else {
      setFaturaAtual(null);
    }
  }, [faturas, faturaAtual]);

  return (
    <FaturaContext.Provider
      value={{
        faturaAtual,
        setFaturaAtual,
        faturas,
        isLoading,
      }}
    >
      {children}
    </FaturaContext.Provider>
  );
}

export function useFaturaContext() {
  const context = React.useContext(FaturaContext);
  if (context === undefined) {
    throw new Error("useFaturaContext must be used within a FaturaProvider");
  }
  return context;
}
