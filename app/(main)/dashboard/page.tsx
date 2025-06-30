"use client";

import { LoanSimulator } from "@/components/loan-simulator";
import { SimpleModal } from "@/components/simple-modal";

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <SimpleModal large textBtn="Simulador de préstamos" title="Simulador de préstamos">
        <LoanSimulator />
      </SimpleModal>
    </div>
  );
}
