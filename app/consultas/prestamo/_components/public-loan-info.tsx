"use client";

import React, { useMemo } from "react";
import { Client, Loan, Payment } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getPaymentFrequencyLabel } from "@/lib/utils";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  differenceInDays,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  User,
  CreditCard,
} from "lucide-react";
import Image from "next/image";

interface PublicLoanInfoProps {
  loan: Loan & { client: Client; payments: Payment[] };
}

interface PaymentScheduleItem {
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  capitalAmount: number;
  interestAmount: number;
  status: "paid" | "pending" | "overdue";
  actualPayment?: Payment;
}

export const PublicLoanInfo = ({ loan }: PublicLoanInfoProps) => {
  // Calcular estadísticas
  const totalCapitalPaid = loan.payments.reduce(
    (sum, payment) => sum + payment.capitalAmount,
    0
  );
  const totalInterestPaid = loan.payments.reduce(
    (sum, payment) => sum + payment.interestAmount,
    0
  );
  const totalPaid = totalCapitalPaid + totalInterestPaid;
  const capitalProgress = (totalCapitalPaid / loan.totalAmount) * 100;
  const paymentsCount = loan.payments.length;

  // Función para calcular la fecha de la próxima cuota
  const calculateNextPaymentDate = (
    startDate: Date,
    installmentNumber: number,
    frequency: string
  ): Date => {
    const start = new Date(startDate);

    switch (frequency) {
      case "DAILY":
        return addDays(start, installmentNumber - 1);
      case "WEEKLY":
        return addWeeks(start, installmentNumber - 1);
      case "BIWEEKLY":
        return addDays(start, (installmentNumber - 1) * 15);
      case "MONTHLY":
        return addMonths(start, installmentNumber - 1);
      default:
        return addMonths(start, installmentNumber - 1);
    }
  };

  // Función para calcular interés según el tipo
  const calculateInterest = (
    remainingBalance: number,
    interestRate: number,
    interestType: string,
    totalAmount: number
  ): number => {
    if (interestType === "FIXED") {
      return totalAmount * (interestRate / 100);
    } else {
      return remainingBalance * (interestRate / 100);
    }
  };

  // Generar cronograma completo de pagos
  const paymentSchedule = useMemo(() => {
    const schedule: PaymentScheduleItem[] = [];
    let remainingBalance = loan.totalAmount;
    const baseCapitalAmount = loan.totalAmount / loan.installments;

    // Determinar el número total de cuotas a mostrar
    // Si hay más pagos que cuotas originales, mostrar hasta el último pago + algunas cuotas futuras
    const maxInstallments = Math.max(loan.installments, paymentsCount + 3);

    for (let i = 1; i <= maxInstallments; i++) {
      const dueDate = calculateNextPaymentDate(
        loan.startDate,
        i,
        loan.paymentFrequency
      );

      // Buscar si existe un pago real para esta cuota
      const actualPayment = loan.payments.find(
        (p) => p.installmentNumber === i
      );

      let capitalAmount = baseCapitalAmount;
      let interestAmount = calculateInterest(
        remainingBalance,
        loan.interestRate,
        loan.interestType,
        loan.totalAmount
      );

      // Si hay un pago real, usar esos valores
      if (actualPayment) {
        capitalAmount = actualPayment.capitalAmount;
        interestAmount = actualPayment.interestAmount;
      }

      const totalAmount = capitalAmount + interestAmount;

      // Determinar estado
      let status: "paid" | "pending" | "overdue" = "pending";
      if (actualPayment) {
        status = "paid";
      } else if (dueDate < new Date()) {
        status = "overdue";
      }

      schedule.push({
        installmentNumber: i,
        dueDate,
        amount: totalAmount,
        capitalAmount,
        interestAmount,
        status,
        actualPayment,
      });

      // Actualizar balance restante
      if (actualPayment) {
        remainingBalance -= actualPayment.capitalAmount;
      } else {
        remainingBalance -= capitalAmount;
      }

      // Si el balance llega a 0 o menos, no generar más cuotas futuras
      if (remainingBalance <= 0 && !actualPayment && i >= loan.installments) {
        break;
      }
    }

    return schedule;
  }, [loan, paymentsCount]);

  // Filtrar pagos por estado
  const paidPayments = paymentSchedule.filter((p) => p.status === "paid");
  const pendingPayments = paymentSchedule.filter((p) => p.status === "pending");
  const overduePayments = paymentSchedule.filter((p) => p.status === "overdue");

  // Obtener estado del préstamo
  const getLoanStatus = () => {
    if (loan.balance <= 0)
      return { label: "Pagado", color: "bg-green-100 text-green-800" };
    if (overduePayments.length > 0)
      return { label: "En Mora", color: "bg-red-100 text-red-800" };
    return { label: "Activo", color: "bg-blue-100 text-blue-800" };
  };

  const loanStatus = getLoanStatus();

  // Obtener tipo de interés en español
  const getInterestTypeLabel = (type: string) => {
    switch (type) {
      case "FIXED":
        return "Fijo sobre monto inicial";
      case "DECREASING":
        return "Decreciente sobre saldo";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Image
                  src="/images/inversiones-dj.png"
                  alt="Inversiones DJ Logo"
                  width={150}
                  height={150}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Consulta de Préstamo
                </h1>
                <p className="text-gray-600">
                  Información detallada de su préstamo
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900 mb-1">
                #{loan.loanNumber}
              </div>
              <Badge className={loanStatus.color}>{loanStatus.label}</Badge>
            </div>
          </div>
        </div>

        {/* Información del Cliente y Préstamo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Datos del Cliente */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre:</span>
                <span className="font-semibold">
                  {loan.client.fullName.slice(0, 9)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Identificación:</span>
                <span className="font-semibold">
                  {`${loan.client.identification
                    .toString()
                    .slice(0, 3)}...${loan.client.identification
                    .toString()
                    .slice(-1)}`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Datos del Préstamo */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Datos del Préstamo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Monto:</span>
                <span className="font-semibold">
                  {formatCurrency({ value: loan.totalAmount, symbol: true })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cuotas:</span>
                <span className="font-semibold">{loan.installments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tasa:</span>
                <span className="font-semibold">{loan.interestRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frecuencia:</span>
                <span className="font-semibold">
                  {getPaymentFrequencyLabel(loan.paymentFrequency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo de interés:</span>
                <span className="font-semibold text-sm">
                  {getInterestTypeLabel(loan.interestType)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumen Financiero */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resumen Financiero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-1">Total Pagado</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency({ value: totalPaid, symbol: true })}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-1">Capital Pagado</div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency({ value: totalCapitalPaid, symbol: true })}
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-1">
                  Intereses Pagados
                </div>
                <div className="text-xl font-bold text-orange-600">
                  {formatCurrency({ value: totalInterestPaid, symbol: true })}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-1">
                  Saldo Pendiente
                </div>
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency({ value: loan.balance, symbol: true })}
                </div>
              </div>
            </div>

            {/* Barra de Progreso */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Progreso del Capital</span>
                <span className="font-semibold">
                  {capitalProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(capitalProgress, 100)}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Información */}

        {/* Tab Resumen */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Próximo Pago */}
          {pendingPayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Próximo Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-semibold">
                      {format(
                        pendingPayments[0].dueDate,
                        "dd 'de' MMMM 'de' yyyy",
                        { locale: es }
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cuota #:</span>
                    <span className="font-semibold">
                      {pendingPayments[0].installmentNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto:</span>
                    <span className="font-semibold text-lg">
                      {formatCurrency({
                        value: pendingPayments[0].amount,
                        symbol: true,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Días restantes:</span>
                    <span
                      className={`font-semibold ${
                        differenceInDays(
                          pendingPayments[0].dueDate,
                          new Date()
                        ) < 0
                          ? "text-red-600"
                          : differenceInDays(
                              pendingPayments[0].dueDate,
                              new Date()
                            ) <= 3
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {differenceInDays(pendingPayments[0].dueDate, new Date())}{" "}
                      días
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Último Pago */}
          {paidPayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Último Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-semibold">
                      {format(
                        paidPayments[paidPayments.length - 1].actualPayment!
                          .paymentDate,
                        "dd 'de' MMMM 'de' yyyy",
                        { locale: es }
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cuota #:</span>
                    <span className="font-semibold">
                      {paidPayments[paidPayments.length - 1].installmentNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto:</span>
                    <span className="font-semibold text-lg">
                      {formatCurrency({
                        value:
                          paidPayments[paidPayments.length - 1].actualPayment!
                            .amount,
                        symbol: true,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Alertas */}
          {overduePayments.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  Pagos Vencidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700 mb-2">
                  Tiene {overduePayments.length} pago(s) vencido(s). Por favor,
                  póngase al día con sus pagos.
                </p>
                <div className="text-sm text-red-600">
                  Monto total vencido:{" "}
                  {formatCurrency({
                    value: overduePayments.reduce(
                      (sum, p) => sum + p.amount,
                      0
                    ),
                    symbol: true,
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Tab Cronograma Completo */}

          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Cronograma Completo de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-semibold">#</th>
                      <th className="text-left p-3 font-semibold">Fecha</th>
                      <th className="text-right p-3 font-semibold">Capital</th>
                      <th className="text-right p-3 font-semibold">Interés</th>
                      <th className="text-right p-3 font-semibold">Total</th>
                      <th className="text-center p-3 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentSchedule.map((payment, index) => {
                      const daysUntilDue = differenceInDays(
                        payment.dueDate,
                        new Date()
                      );
                      const isOverdue = payment.status === "overdue";
                      const isDueSoon =
                        daysUntilDue <= 3 &&
                        daysUntilDue >= 0 &&
                        payment.status === "pending";
                      const isPaid = payment.status === "paid";

                      return (
                        <tr
                          key={payment.installmentNumber}
                          className={
                            isPaid
                              ? "bg-green-50"
                              : isOverdue
                              ? "bg-red-50"
                              : isDueSoon
                              ? "bg-orange-50"
                              : index % 2 === 0
                              ? "bg-white"
                              : "bg-gray-50"
                          }
                        >
                          <td className="p-3 font-medium">
                            {payment.installmentNumber}
                          </td>
                          <td className="p-3">
                            {format(payment.dueDate, "dd/MM/yyyy", {
                              locale: es,
                            })}
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency({
                              value: payment.capitalAmount,
                              symbol: true,
                            })}
                          </td>
                          <td className="p-3 text-right text-orange-600">
                            {formatCurrency({
                              value: payment.interestAmount,
                              symbol: true,
                            })}
                          </td>
                          <td className="p-3 text-right font-semibold">
                            {formatCurrency({
                              value: payment.amount,
                              symbol: true,
                            })}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              className={
                                isPaid
                                  ? "bg-green-100 text-green-800"
                                  : isOverdue
                                  ? "bg-red-100 text-red-800"
                                  : isDueSoon
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-blue-100 text-blue-800"
                              }
                            >
                              {isPaid ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Pagado
                                </>
                              ) : isOverdue ? (
                                <>
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Vencido
                                </>
                              ) : isDueSoon ? (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Próximo
                                </>
                              ) : (
                                <>
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Pendiente
                                </>
                              )}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            © 2025 Inversiones DJ - Consulta generada el{" "}
            {format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
          </p>
          <p>Para más información, contacte </p>
        </div>
      </div>
    </div>
  );
};
