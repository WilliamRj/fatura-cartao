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
    if (faturas.length > 0 && !faturaAtual) {
      // Assuming faturas are ordered by latest first, or we can just pick the first one
      setFaturaAtual(faturas[0]);
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
