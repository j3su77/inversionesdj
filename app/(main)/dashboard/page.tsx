"use client";

import { LoanSimulator } from "@/components/loan-simulator";
import { SimpleModal } from "@/components/simple-modal";
import { LoanIndicators } from "./_components/loan-indicators";
import { HighestDebtClients } from "./_components/highest-debt-clients";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <SimpleModal
          large={true}
          textBtn="Simulador de préstamos"
          title="Simulador de préstamos"
        >
          <LoanSimulator />
        </SimpleModal>
      </div>

      {/* Indicadores de Préstamos */}
      <div>
        <LoanIndicators />
      </div>

      {/* Clientes con Mayor Deuda */}
      <div>
        <HighestDebtClients />
      </div>
    </div>
  );
}
