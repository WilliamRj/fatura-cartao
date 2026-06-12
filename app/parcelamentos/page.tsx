import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { ParcelamentosClient } from "@/components/pages/parcelamentos-client";

export const metadata: Metadata = {
  title: "Parcelamentos | Cartão Inteligente",
};

export default function ParcelamentosPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Parcelamentos"
        description="Acompanhe o progresso das suas compras parceladas"
      />
      <ParcelamentosClient />
    </div>
  );
}
