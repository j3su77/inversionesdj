import React from "react";

import { db } from "@/lib/db";
import {
  Card,
  CardHeader,
} from "@/components/ui/card";

import { PaymentForm } from "./_components/payment-form";
import { LoanInfoProgressCard } from "@/components/loan-info-card";
import { TitlePage } from "@/components/title-page";
import { CreditCard } from "lucide-react";

interface RegisterPaymentPageProps {
  params: Promise<{ loanId: string }>;
}

export default async function RegisterPaymentPage({ params }: RegisterPaymentPageProps) {
  const { loanId } = await params;

  if (!loanId) {
    return <div>Identificador del prestamo no especificado o no es válido</div>;
  }

  const loan = await db.loan.findUnique({
    where: {
      id: loanId,
    },
    include: {
      client: true,
      payments: true,
    },
  });

  if (!loan) {
    return (
      <div className="grid place-items-center w-full p-2">
        <Card className="w-full">
          <CardHeader>
            <h2 className="text-2xl text-destructive text-center font-semibold">
              {" "}
              Prestamo no encontrado
            </h2>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid place-items-center w-full p-2">
      <div className="w-full">
        <TitlePage text="Registrar Pago" icon={CreditCard} />

        <div className="border-b w-full">
          <LoanInfoProgressCard loan={loan} client={loan.client} />
        </div>

        <div className="mt-2">
          <PaymentForm loan={loan} />
        </div>
      </div>
    </div>
  );
}
