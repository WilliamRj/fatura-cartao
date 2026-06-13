import type { Metadata } from "next";
import { FaturasClient } from "@/components/pages/faturas-client";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "Faturas",
};

export default function FaturasPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Faturas"
        description="Importe e gerencie suas faturas"
      />
      <FaturasClient />
    </div>
  );
}
