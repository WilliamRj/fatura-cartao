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
  const [selectedFaturaId, setSelectedFaturaId] = React.useState<string | null>(null);

  const faturaAtual =
    faturas.find((fatura) => fatura.id === selectedFaturaId) ??
    faturas[0] ??
    null;

  const setFaturaAtual = React.useCallback((fatura: Fatura | null) => {
    setSelectedFaturaId(fatura?.id ?? null);
  }, []);

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
