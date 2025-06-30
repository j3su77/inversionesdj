import React from "react";
import { db } from "@/lib/db";
import { TitlePage } from "@/components/title-page";
import { UserRoundPen } from "lucide-react";
import { TabsEditClient } from "../_components/tabs-edit-client";

const EditClientPage = async ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = await params;
  
  const client = await db.client.findUnique({
    where: { id: clientId },
    include: {
      documents: true,
      loans: {
        include: { 
          payments: { orderBy: { paymentDate: 'desc' } },
        
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    return "Cliente no encontrado";
  }

  // Calcular estadísticas de crédito
  const creditStats = {
    totalLoans: client.loans.length,
    activeLoans: client.loans.filter(loan => loan.balance > 0).length,
    totalPaid: client.loans.reduce((sum, loan) => sum + (loan.totalAmount - loan.balance), 0),
    overduePayments: client.loans.flatMap(loan => 
      loan.payments.filter(p => p.paymentDate < new Date() && p.amount > 0)
    ).length
  };

  return (
    <div className="space-y-4">
      <TitlePage icon={UserRoundPen} text={`Editar cliente: ${client.fullName}`} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <TabsEditClient client={client as any} creditStats={creditStats} />
    </div>
  );
};

export default EditClientPage;
