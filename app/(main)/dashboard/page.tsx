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

      {/* --interes: dividirse entre numero de dias del mes, ejemplo: 1000000 * 0.10 = 100.000
      dias del mes: 30
      interes: 100.000 / 30 = 3.333,33 
      prestamo es semanal se multiplica por 7: 3.333,33 * 7 = 23.333,31

      --permitir prestamos viejos  

      -- si la cuota es mayor al monto que se debe, deberia colocar este valor en el campo de capital  
       */}

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
