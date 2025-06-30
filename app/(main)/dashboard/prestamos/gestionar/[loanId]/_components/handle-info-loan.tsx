"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Account, Client, Loan, LoanAccount } from "@prisma/client";
import React, { useState } from "react";
import { LoanForm } from "../../../_components/loan-form";
import { ClientInfoCard } from "@/components/client-info-card";
import { LoanInfoCard } from "./loan-info-card";
import { Button } from "@/components/ui/button";

export const HandleInfoLoan = ({
  loan,
}: {
  loan: Loan & {
    client: Client;
    loanAccounts: (LoanAccount & { account: Account })[] | null;
  };
}) => {
  const [editMode, setEditMode] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setEditMode(!editMode)}>
          {editMode ? "Cancelar" : "Editar"}
        </Button>
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
            <LoanForm client={loan.client} loan={loan} />
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
