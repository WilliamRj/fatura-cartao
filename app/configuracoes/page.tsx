import type { Metadata } from "next";
import { ConfiguracoesClient } from "@/components/pages/configuracoes-client";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "Configurações | Cartão Inteligente",
};

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Configurações"
        description="Gerencie responsáveis e preferências do sistema"
      />
      <ConfiguracoesClient />
    </div>
  );
}
