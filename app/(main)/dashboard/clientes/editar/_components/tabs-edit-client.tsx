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
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AddClientForm } from "../../_components/add-client-form";
import { AddDocumentIdcard } from "../../_components/add-document-idcard";
import { AddDocumentUtilityBill } from "../../_components/add-document-utilityBill";
import { IndependentClientStatusToggle } from "../../_components/client-status-form";
import { Client, Document, Loan, Payment } from "@prisma/client";
import Link from "next/link";

interface CreditStats {
  totalLoans: number;
  activeLoans: number;
  totalPaid: number;
  overduePayments: number;
  totalPayments: number;
  completedLoans: number;
  totalDebt: number;
  averagePaymentAmount: number;
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
              {editBasicInfo ? "Editar Información" : "Información Básica"}

              <Button onClick={() => setEditBasicInfo(!editBasicInfo)}>
                {editBasicInfo ? "Dejar de Editar" : "Editar"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editBasicInfo ? (
              <AddClientForm client={client} />
            ) : (
              <div className="space-y-4">
                {/* Control de estado independiente */}
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">
                        Estado del Cliente
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Controla si el cliente puede recibir nuevos préstamos
                      </p>
                    </div>
                    <div className="ml-4">
                      <IndependentClientStatusToggle
                        client={client}
                        onStatusChange={(isDisallowed) => {
                          // Opcional: actualizar el estado local o realizar otras acciones
                          console.log(
                            `Cliente ${
                              isDisallowed ? "restringido" : "activado"
                            }`
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <Separator className="my-4" />

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
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Estado General
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          client.status === "ACTIVE" ? "success" : "secondary"
                        }
                      >
                        {client.status === "ACTIVE"
                          ? "Activo"
                          : client.status === "INACTIVE"
                          ? "Inactivo"
                          : "Bloqueado"}
                      </Badge>
                      {client.isDisallowed && (
                        <Badge variant="destructive">Restringido</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Fecha de Registro
                    </p>
                    <p className="font-medium">
                      {client.createdAt.toLocaleDateString()}
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
            <Button variant="outline" disabled={client.isDisallowed}>
              <Link
                passHref
                href={`/dashboard/prestamos/registrar?clientId=${client.id}`}
              >
                Registrar Prestamo
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resumen estadístico */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {creditStats.totalLoans}
                </div>
                <div className="text-xs text-muted-foreground">
                  Préstamos Totales
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {creditStats.activeLoans}
                </div>
                <div className="text-xs text-muted-foreground">
                  Préstamos Activos
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency({
                    value: creditStats.totalPaid,
                    symbol: false,
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Pagado
                </div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${
                    creditStats.overduePayments > 0
                      ? "text-red-600"
                      : "text-gray-400"
                  }`}
                >
                  {creditStats.overduePayments}
                </div>
                <div className="text-xs text-muted-foreground">
                  Préstamos en Mora
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-700">
                  {creditStats.completedLoans}
                </div>
                <div className="text-xs text-muted-foreground">
                  Préstamos Completados
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-700">
                  {creditStats.totalPayments}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total de Pagos
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-700">
                  {formatCurrency({
                    value: creditStats.totalDebt,
                    symbol: false,
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Deuda Pendiente
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-700">
                  {formatCurrency({
                    value: creditStats.averagePaymentAmount,
                    symbol: false,
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Pago Promedio
                </div>
              </div>
            </div>

            {/* Indicadores de perfil */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nivel de riesgo */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Nivel de Riesgo
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
                    {clientWithProfile.riskLevel?.toUpperCase() ||
                      "NO EVALUADO"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Basado en ingresos y historial de pagos
                </p>
              </div>

              {/* Categoría de ingresos */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Categoría Salarial
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-medium">
                      {clientWithProfile.incomeCategory || "N/A"}
                    </Badge>
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
                <p className="text-xs text-muted-foreground">
                  {getIncomeCategoryDescription(
                    clientWithProfile.incomeCategory
                  )}
                </p>
              </div>

              {/* Comportamiento de pagos */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Comportamiento
                  </span>
                  <Badge
                    variant={
                      clientWithProfile.paymentBehavior === "excelente"
                        ? "success"
                        : clientWithProfile.paymentBehavior === "bueno"
                        ? "info"
                        : clientWithProfile.paymentBehavior === "regular"
                        ? "warning"
                        : "destructive"
                    }
                  >
                    {clientWithProfile.paymentBehavior?.toUpperCase() ||
                      "SIN HISTORIAL"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {getPaymentBehaviorDescription(
                    clientWithProfile.paymentBehavior
                  )}
                </p>
              </div>
            </div>

            {/* Recomendaciones basadas en el perfil */}
            {clientWithProfile.riskLevel && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">
                  Recomendaciones
                </h4>
                <p className="text-sm text-blue-800">
                  {clientWithProfile.riskLevel === "bajo"
                    ? "Cliente de bajo riesgo. Apto para préstamos con condiciones preferenciales."
                    : clientWithProfile.riskLevel === "medio"
                    ? "Cliente de riesgo medio. Evaluar condiciones estándar y seguimiento regular."
                    : "Cliente de alto riesgo. Considerar garantías adicionales y monitoreo frecuente."}
                </p>
              </div>
            )}
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
    A: "Ingresos Muy Altos ($10.000.000+/mes)",
    B: "Ingresos Altos ($6.000.000 - $9.999.999/mes)",
    C: "Ingresos Medios ($1.000.000 - $5.999.999/mes)",
    D: "Ingresos Bajos (Menos de $1.000.000/mes)",
  };
  return descriptions[category || ""] || "No categorizado";
}

function getPaymentBehaviorDescription(behavior?: string) {
  const descriptions: Record<string, string> = {
    excelente: "Sin pagos atrasados o historial impecable",
    bueno: "Hasta 10% de pagos con retraso menor",
    regular: "Entre 10-25% de pagos con retrasos",
    malo: "Más del 25% de pagos atrasados o en mora",
  };
  return descriptions[behavior || ""] || "Sin historial suficiente";
}


// Función para calcular el perfil del cliente
function calculateClientProfile(
  client: Client & { loans: (Loan & { payments: Payment[] })[] }
): ClientSegment {
  // 1. Calcular categoría de ingresos
  let incomeCategory: "A" | "B" | "C" | "D" = "D";
  if (client.monthlyIncome) {
    if (client.monthlyIncome >= 10000000) incomeCategory = "A";
    else if (client.monthlyIncome >= 6000000) incomeCategory = "B";
    else if (client.monthlyIncome >= 1000000) incomeCategory = "C";
    else incomeCategory = "D";
  }

  // 2. Calcular comportamiento de pagos basado en historial real
  let paymentBehavior: "excelente" | "bueno" | "regular" | "malo" = "excelente";

  if (client.loans.length > 0) {
    let totalLatePayments = 0;
    let totalPayments = 0;
    let totalActiveLoans = 0;

    client.loans.forEach((loan) => {
      totalPayments += loan.payments.length;

      // Contar préstamos activos
      if (loan.status === "ACTIVE" || loan.status === "PENDING") {
        totalActiveLoans++;

        // Verificar si hay pagos vencidos (nextPaymentDate en el pasado)
        if (
          loan.nextPaymentDate &&
          loan.nextPaymentDate < new Date() &&
          loan.balance > 0
        ) {
          totalLatePayments++;
        }
      }

      // Analizar historial de pagos para detectar patrones de retraso
      // Calcular fechas esperadas vs fechas reales de pago
      loan.payments.forEach((payment, index) => {
        const expectedDate = calculateExpectedPaymentDate(
          loan.startDate,
          index + 1,
          loan.paymentFrequency
        );
        const actualDate = new Date(payment.paymentDate);

        // Si el pago se hizo más de 5 días después de la fecha esperada, contar como tardío
        const daysDifference = Math.floor(
          (actualDate.getTime() - expectedDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysDifference > 5) {
          totalLatePayments++;
        }
      });
    });

    // Calcular el comportamiento basado en el porcentaje de pagos atrasados
    const latePaymentRate =
      totalPayments > 0 ? (totalLatePayments / totalPayments) * 100 : 0;

    if (latePaymentRate === 0) {
      paymentBehavior = "excelente";
    } else if (latePaymentRate <= 10) {
      paymentBehavior = "bueno";
    } else if (latePaymentRate <= 25) {
      paymentBehavior = "regular";
    } else {
      paymentBehavior = "malo";
    }

    // Ajustar comportamiento si hay préstamos activos en mora
    if (totalActiveLoans > 0 && totalLatePayments > 0) {
      const overdueRate = (totalLatePayments / totalActiveLoans) * 100;
      if (overdueRate > 50) {
        paymentBehavior = "malo";
      } else if (overdueRate > 25) {
        paymentBehavior = "regular";
      }
    }
  }

  // 3. Calcular nivel de riesgo (combina ingresos y comportamiento de pagos)
  let riskLevel: "bajo" | "medio" | "alto" = "medio";

  // Matriz de riesgo basada en ingresos y comportamiento
  if (incomeCategory === "A" || incomeCategory === "B") {
    if (paymentBehavior === "excelente" || paymentBehavior === "bueno") {
      riskLevel = "bajo";
    } else if (paymentBehavior === "regular") {
      riskLevel = "medio";
    } else {
      riskLevel = "alto";
    }
  } else if (incomeCategory === "C") {
    if (paymentBehavior === "excelente") {
      riskLevel = "bajo";
    } else if (paymentBehavior === "bueno" || paymentBehavior === "regular") {
      riskLevel = "medio";
    } else {
      riskLevel = "alto";
    }
  } else {
    // incomeCategory === "D"
    if (paymentBehavior === "excelente") {
      riskLevel = "medio";
    } else {
      riskLevel = "alto";
    }
  }

  // Ajustar riesgo si no hay historial crediticio
  if (client.loans.length === 0) {
    riskLevel = "medio"; // Sin historial = riesgo medio
    paymentBehavior = "excelente"; // Sin historial negativo
  }

  return {
    riskLevel,
    incomeCategory,
    paymentBehavior,
  };
}

// Función auxiliar para calcular la fecha esperada de pago
function calculateExpectedPaymentDate(
  startDate: Date,
  installmentNumber: number,
  frequency: string
): Date {
  const start = new Date(startDate);

  switch (frequency) {
    case "DAILY":
      return new Date(
        start.getTime() + (installmentNumber - 1) * 24 * 60 * 60 * 1000
      );
    case "WEEKLY":
      return new Date(
        start.getTime() + (installmentNumber - 1) * 7 * 24 * 60 * 60 * 1000
      );
    case "BIWEEKLY":
      return new Date(
        start.getTime() + (installmentNumber - 1) * 15 * 24 * 60 * 60 * 1000
      );
    case "MONTHLY":
      const monthlyDate = new Date(start);
      monthlyDate.setMonth(monthlyDate.getMonth() + (installmentNumber - 1));
      return monthlyDate;
    default:
      return new Date(
        start.getTime() + (installmentNumber - 1) * 30 * 24 * 60 * 60 * 1000
      );
  }
}
