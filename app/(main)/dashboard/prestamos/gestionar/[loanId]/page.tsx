import React from "react";
import { db } from "@/lib/db";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ApproveButton } from "./_components/approve-button";
import { TitlePage } from "@/components/title-page";
import { CreditCard, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Card, CardHeader } from "@/components/ui/card";
import { PaymentsList } from "./_components/payments-list";
import { HandleInfoLoan } from "./_components/handle-info-loan";
import { LoanPaymentCard } from "@/components/loan-payment-card";

async function GestionarPrestamo({ params }: { params: Promise<{ loanId: string }> }) {
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
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
      loanAccounts: {
        include: {
          account: true,
        },
      },
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
    <div className="space-y-0">
      <div className="flex justify-start gap-2 items-center bg-primary/10 p-4 rounded-lg">
        <LoanPaymentCard
          loan={loan}
          payments={loan.payments}
          client={loan.client}
        />
        <Link
          target="_blank"
          href={`/consultas/prestamo/${loan.id}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <ExternalLink className="w-4 h-4" /> link público
        </Link>
      </div>
      <div className="flex justify-between items-center">
        <TitlePage text="Gestionar Préstamo" icon={CreditCard} />
        <div className="space-x-2">
          {loan.status === "PENDING" && <ApproveButton loanId={loan.id} />}
          {loan.status === "ACTIVE" && (
            <Link
              className={cn(buttonVariants({className: "px-8 py-6 text-xl"}))}
              href={`/dashboard/prestamos/gestionar/${loan.id}/registrar-pago`}
            >
              Registrar Pago
            </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="space-y-6">
          <HandleInfoLoan loan={loan} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsList payments={loan.payments} loan={loan} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GestionarPrestamo;
