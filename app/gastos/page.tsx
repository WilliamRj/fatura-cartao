import type { Metadata } from "next";
import { GastosClient } from "@/components/pages/gastos-client";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "Gastos | Cartão Inteligente",
};

export default function GastosPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Gastos"
        description="Gerencie e categorize os lançamentos da fatura"
      />
      <GastosClient />
    </div>
  );
}
