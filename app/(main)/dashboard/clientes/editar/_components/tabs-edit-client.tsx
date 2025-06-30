"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreditCard, User, File } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { AddClientForm } from "../../_components/add-client-form";
import { AddDocumentIdcard } from "../../_components/add-document-idcard";
import { AddDocumentUtilityBill } from "../../_components/add-document-utilityBill";
import { Client, Document, Loan, Payment } from "@prisma/client";
import Link from "next/link";

interface CreditStats {
  totalLoans: number;
  activeLoans: number;
  totalPaid: number;
  overduePayments: number;
}

interface TabsEditClientProps {
  client: Client & {
    loans: Loan[] & { payments: Payment[] | null };
    documents: Document[];
  };
  creditStats: CreditStats;
}

interface ClientSegment {
  riskLevel: "bajo" | "medio" | "alto";
  incomeCategory: "A" | "B" | "C" | "D";
  paymentBehavior: "excelente" | "bueno" | "regular" | "malo";
}

export const TabsEditClient = ({
  client,
  creditStats,
}: TabsEditClientProps) => {
  const [editBasicInfo, setEditBasicInfo] = useState(false);

  // En tu página, después de obtener el cliente:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientProfile = calculateClientProfile(client as any);
  const clientWithProfile = { ...client, ...clientProfile };

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="info">
          <User className="w-4 h-4 mr-2" />
          Información
        </TabsTrigger>
        <TabsTrigger value="credit">
          <CreditCard className="w-4 h-4 mr-2" />
          Historial Crediticio
        </TabsTrigger>
        <TabsTrigger value="documents">
          <File className="w-4 h-4 mr-2" />
          Documentos
        </TabsTrigger>
        {/* <TabsTrigger value="references">
          <Users className="w-4 h-4 mr-2" />
          Referencias
        </TabsTrigger> */}
      </TabsList>

      {/* Tab de Información Básica */}
      <TabsContent value="info" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              Información Personal
              <Button onClick={() => setEditBasicInfo(!editBasicInfo)}>
                {editBasicInfo ? "Cancelar" : "Editar"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editBasicInfo ? (
              <AddClientForm client={client} />
            ) : (
              <div className="space-y-4">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Nombre completo
                    </p>
                    <p className="font-medium">{client.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Identificación
                    </p>
                    <p className="font-medium">{client.identification}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium">
                      {client.cellphone || "No especificado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dirección</p>
                    <p className="font-medium">
                      {client.address || "No especificada"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Segmentación del cliente */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row justify-between">
            <CardTitle>
              <h3 className="font-semibold mb-3">Perfil Crediticio</h3>
            </CardTitle>
            <Link
              className={cn(buttonVariants())}
              href={`/dashboard/prestamos/registrar?clientId=${client.id}`}
            >
              Registrar Prestamo
            </Link>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Nivel de riesgo */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Nivel de riesgo
                </span>
                <Badge
                  variant={
                    clientWithProfile.riskLevel === "bajo"
                      ? "success"
                      : clientWithProfile.riskLevel === "medio"
                      ? "warning"
                      : "destructive"
                  }
                >
                  {clientWithProfile.riskLevel?.toUpperCase() || "NO EVALUADO"}
                </Badge>
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                Basado en historial de pagos
              </p>
            </div>

            {/* Categoría de ingresos */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Categoría salarial
                </span>
                <div className="flex items-center">
                  <span className="font-medium mr-2">
                    {clientWithProfile.incomeCategory || "N/A"}
                  </span>
                  {clientWithProfile.monthlyIncome && (
                    <span className="text-xs text-muted-foreground">
                      (
                      {formatCurrency({
                        value: clientWithProfile.monthlyIncome,
                        symbol: true,
                      })}
                      )
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                {getIncomeCategoryDescription(clientWithProfile.incomeCategory)}
              </p>
            </div>

            {/* Comportamiento de pagos */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Comportamiento
                </span>
                <Badge
                  variant={
                    clientWithProfile.paymentBehavior === "excelente"
                      ? "info"
                      : clientWithProfile.paymentBehavior === "bueno"
                      ? "success"
                      : clientWithProfile.paymentBehavior === "regular"
                      ? "warning"
                      : "destructive"
                  }
                >
                  {clientWithProfile.paymentBehavior?.toUpperCase() ||
                    "SIN HISTORIAL"}
                </Badge>
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                {getPaymentBehaviorDescription(
                  clientWithProfile.paymentBehavior
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab de Historial Crediticio */}
      <TabsContent value="credit">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Préstamos Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creditStats.totalLoans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Préstamos Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {creditStats.activeLoans}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pagado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency({ value: creditStats.totalPaid, symbol: true })}
              </div>
            </CardContent>
          </Card>
          {/* <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Pagos Atrasados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {creditStats.overduePayments}
              </div>
            </CardContent>
          </Card> */}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Préstamos</CardTitle>
            <CardDescription>
              Listado completo de préstamos y pagos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {client.loans.length > 0 ? (
                <div className="space-y-4">
                  {client.loans.map((loan) => (
                    <div key={loan.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            Préstamo #{loan.id.slice(0, 8)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {loan.startDate.toLocaleDateString()} -{" "}
                            {loan.endDate.toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={loan.balance > 0 ? "warning" : "default"}
                        >
                          {loan.balance > 0 ? "Activo" : "Pagado"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Monto</p>
                          <p>
                            {formatCurrency({
                              value: loan.totalAmount,
                              symbol: true,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Saldo</p>
                          <p>
                            {formatCurrency({
                              value: loan.balance,
                              symbol: true,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Cuotas
                          </p>
                          <p>
                            {loan.installments} ({loan.remainingInstallments}{" "}
                            restantes)
                          </p>
                        </div>
                      </div>

                      {/* {loan.payments.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Últimos pagos</h4>
                          <div className="space-y-2">
                            {loan.payments.slice(0, 3).map((payment) => (
                              <div
                                key={payment.id}
                                className="flex justify-between items-center border-b pb-2"
                              >
                                <div>
                                  <p>{payment.date.toLocaleDateString()}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {payment.paymentType}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p>
                                    {formatCurrency({
                                      value: payment.totalPaid,
                                      symbol: true,
                                    })}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Saldo:{" "}
                                    {formatCurrency({
                                      value: payment.remainingBalance,
                                      symbol: true,
                                    })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )} */}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    El cliente no tiene préstamos registrados
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="documents">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AddDocumentIdcard initialData={client} />
          <AddDocumentUtilityBill initialData={client} />
        </div>
      </TabsContent>

      {/* Tab de Referencias */}
      {/* <TabsContent value="references">
        {client.referenceContacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {client.referenceContacts.map((contact) => (
              <Card key={contact.id}>
                <CardHeader>
                  <CardTitle>{contact.name}</CardTitle>
                  <CardDescription>{contact.relationship}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Teléfono: {contact.phone || "No especificado"}</p>
                  <p>Email: {contact.email || "No especificado"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No se han registrado referencias para este cliente
          </p>
        )}
      </TabsContent> */}
    </Tabs>
  );
};
// Funciones auxiliares (pueden ir fuera del componente)
function getIncomeCategoryDescription(category?: string) {
  const descriptions: Record<string, string> = {
    A: "Ingresos Muy Altos (Más de $10.000.000/mes)",
    B: "Ingresos Altos ($6.000.000 - $9.999.999/mes)",
    C: "Ingresos Medios ($1.000.000 - $5.999.999/mes)",
    D: "Ingresos Bajos (Menos de $999.999/mes)",
  };
  return descriptions[category || ""] || "No categorizado";
}

function getPaymentBehaviorDescription(behavior?: string) {
  const descriptions: Record<string, string> = {
    excelente: "0 pagos atrasados",
    bueno: "1-2 pagos atrasados",
    regular: "3-5 pagos atrasados",
    malo: "Más de 5 pagos atrasados",
  };
  return descriptions[behavior || ""] || "Sin historial suficiente";
}

// Función para calcular el perfil del cliente
function calculateClientProfile(
  client: Client & { loans: Loan & { payments: Payment[] }[] }
): ClientSegment {
  // 1. Calcular categoría de ingresos
  let incomeCategory: "A" | "B" | "C" | "D" = "D";
  if (client.monthlyIncome) {
    if (client.monthlyIncome > 9999999) incomeCategory = "A";
    else if (client.monthlyIncome > 4999999) incomeCategory = "B";
    else if (client.monthlyIncome > 999999) incomeCategory = "C";
  }

  // 2. Calcular comportamiento de pagos
  // const latePayments = client.loans.flatMap((loan) =>
  //   loan.payments.filter((p) => p.paymentDate < new Date() && p. > 0)
  // ).length;

  const paymentBehavior: "excelente" | "regular" | "malo" = "excelente";
  // if (latePayments > 5) paymentBehavior = "malo";
  // else if (latePayments > 2) paymentBehavior = "regular";
  // else if (latePayments > 0) paymentBehavior = "excelente";

  // 3. Calcular nivel de riesgo (combina ingresos y pagos)
  let riskLevel: "bajo" | "medio" | "alto" = "medio";
  if (incomeCategory === "A" && paymentBehavior === "excelente")
    riskLevel = "bajo";
  // else if (incomeCategory === "D" || paymentBehavior === "malo")
  //   riskLevel = "alto";

  return {
    riskLevel,
    incomeCategory,
    paymentBehavior,
  };
}
