import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { RelatoriosClient } from "@/components/pages/relatorios-client";

export const metadata: Metadata = {
  title: "Relatórios",
};

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Relatórios"
        description="Analise seus gastos com diferentes visualizações"
      />
      <RelatoriosClient />
    </div>
  );
}
