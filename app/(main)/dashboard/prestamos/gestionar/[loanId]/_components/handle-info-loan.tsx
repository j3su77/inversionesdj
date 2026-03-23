"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Account,
  Client,
  Loan,
  LoanAccount,
  LoanPaymentDay,
  Payment,
} from "@prisma/client";
import React, { useState } from "react";
import { LoanForm } from "../../../_components/loan-form";
import { ClientInfoCard } from "@/components/client-info-card";
import { LoanInfoCard } from "./loan-info-card";
import { LoanPaymentDaysCard } from "./loan-payment-days-card";
import { Button } from "@/components/ui/button";
import { DeleteLoanDialog } from "./delete-loan-dialog";
import { Pencil, X } from "lucide-react";

export const HandleInfoLoan = ({
  loan,
}: {
  loan: Loan & {
    client: Client;
    loanAccounts: (LoanAccount & { account: Account })[] | null;
    payments: Payment[];
    paymentDays: LoanPaymentDay[];
  };
}) => {
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex justify-end items-center">
        <Button variant="outline" onClick={() => setEditMode(!editMode)}>
          {editMode ? (
            <span className="flex items-center gap-2">
              <X className="w-4 h-4" /> Cancelar
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Editar
            </span>
          )}
        </Button>
      </div>

      {editMode ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Editar Préstamo</CardTitle>
              <CardDescription>
                Modifica los detalles del préstamo según sea necesario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoanForm client={loan.client} loan={loan} disabled={false} />
            </CardContent>
          </Card>

          <LoanPaymentDaysCard
            loanId={loan.id}
            paymentFrequency={loan.paymentFrequency}
            paymentDays={loan.paymentDays}
          />

          {/* Solo mostrar el botón de eliminar si el préstamo está activo o pendiente */}
          {(loan.status === "ACTIVE" || loan.status === "PENDING") && (
            <DeleteLoanDialog loan={loan} />
          )}
        </>
      ) : (
        <div className="grid gap-6 ">
          <LoanInfoCard loan={loan} paymentDays={loan.paymentDays} />
          <LoanPaymentDaysCard
            loanId={loan.id}
            paymentFrequency={loan.paymentFrequency}
            paymentDays={loan.paymentDays}
          />
          <ClientInfoCard client={loan.client} />
        </div>
      )}
    </div>
  );
};
