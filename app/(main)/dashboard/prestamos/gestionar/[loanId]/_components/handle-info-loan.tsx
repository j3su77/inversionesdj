"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Account, Client, Loan, LoanAccount, Payment } from "@prisma/client";
import React, { useState } from "react";
import { LoanForm } from "../../../_components/loan-form";
import { ClientInfoCard } from "@/components/client-info-card";
import { LoanInfoCard } from "./loan-info-card";
import { Button } from "@/components/ui/button";
import { DeleteLoanDialog } from "./delete-loan-dialog";

export const HandleInfoLoan = ({
  loan,
}: {
  loan: Loan & {
    client: Client;
    loanAccounts: (LoanAccount & { account: Account })[] | null;
    payments: Payment[];
  };
}) => {
  const [editMode, setEditMode] = useState(false);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditMode(!editMode)}>
            {editMode ? "Cancelar" : "Editar"}
          </Button>
        </div>
        
        {/* Solo mostrar el botón de eliminar si el préstamo está activo o pendiente */}
        {(loan.status === "ACTIVE" || loan.status === "PENDING") && (
          <DeleteLoanDialog loan={loan} />
        )}
      </div>

      {editMode ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar Préstamo</CardTitle>
            <CardDescription>
              Modifica los detalles del préstamo según sea necesario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoanForm client={loan.client} loan={loan} disabled={true} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 ">
          <LoanInfoCard loan={loan} />
          <ClientInfoCard client={loan.client} />
        </div>
      )}
    </div>
  );
};
