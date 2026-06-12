import type { Metadata } from "next";
import { DashboardContent } from "@/components/dashboard-content";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "Dashboard | Cartão Inteligente",
};

export default function HomePage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Dashboard"
        description="Visão geral dos seus gastos e faturas"
      />
      <DashboardContent />
    </div>
  );
}
