"use client";

import React from "react";
import { Client, Loan, Payment } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getPaymentFrequencyLabel } from "@/lib/utils";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  User,
  CreditCard,
} from "lucide-react";
import Image from "next/image";

interface PublicLoanInfoProps {
  loan: Loan & { client: Client; payments: Payment[] };
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

  // Obtener el último pago
  const lastPayment = loan.payments.length > 0 
    ? loan.payments.reduce((latest, payment) => 
        new Date(payment.paymentDate) > new Date(latest.paymentDate) ? payment : latest
      )
    : null;

  // Función para calcular la próxima fecha de pago basada en la frecuencia
  const calculateNextPaymentDate = (baseDate: Date, frequency: string): Date => {
    const date = new Date(baseDate);
    
    switch (frequency) {
      case "DAILY":
        return addDays(date, 1);
      case "WEEKLY":
        return addWeeks(date, 1);
      case "BIWEEKLY":
        return addDays(date, 15);
      case "MONTHLY":
        return addMonths(date, 1);
      case "QUARTERLY":
        return addMonths(date, 3);
      case "YEARLY":
        return addMonths(date, 12);
      default:
        return addMonths(date, 1);
    }
  };

  // Determinar la fecha del próximo pago
  const getNextPaymentDate = (): Date | null => {
    // Si existe nextPaymentDate en el loan, usarlo
    if (loan.nextPaymentDate) {
      return loan.nextPaymentDate;
    }
    
    // Si no existe pero hay pagos, calcular basado en el último pago
    if (lastPayment) {
      return calculateNextPaymentDate(lastPayment.paymentDate, loan.paymentFrequency);
    }
    
    // Si no hay pagos, calcular basado en la fecha de inicio
    if (loan.startDate) {
      return calculateNextPaymentDate(loan.startDate, loan.paymentFrequency);
    }
    
    return null;
  };

  const nextPaymentDate = getNextPaymentDate();

  // Obtener estado del préstamo
  const getLoanStatus = () => {
    if (loan.balance <= 0)
      return { label: "Pagado", color: "bg-green-100 text-green-800" };
    if (nextPaymentDate && nextPaymentDate < new Date())
      return { label: "En Mora", color: "bg-red-100 text-red-800" };
    return { label: "Activo", color: "bg-blue-100 text-blue-800" };
  };

  const loanStatus = getLoanStatus();

  // Verificar si hay pagos vencidos
  const isOverdue = nextPaymentDate && nextPaymentDate < new Date() && loan.balance > 0;

  // Calcular días hasta el próximo pago
  const daysUntilNextPayment = nextPaymentDate 
    ? Math.ceil((nextPaymentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

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
          <Card>
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
          <Card>
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

        {/* Información de Pagos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Próximo Pago */}
          {loan.balance > 0 && nextPaymentDate && (
            <Card className={isOverdue ? "border-red-200 bg-red-50" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {isOverdue ? "Pago Vencido" : "Próximo Pago"}
                  {!loan.nextPaymentDate && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Calculado
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-semibold">
                      {format(
                        nextPaymentDate,
                        "dd 'de' MMMM 'de' yyyy",
                        { locale: es }
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto:</span>
                    <span className="font-semibold text-lg">
                      {formatCurrency({
                        value: loan.currentInstallmentAmount || loan.feeAmount || 0,
                        symbol: true,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {isOverdue ? "Días vencidos:" : "Días restantes:"}
                    </span>
                    <span
                      className={`font-semibold ${
                        isOverdue
                          ? "text-red-600"
                          : daysUntilNextPayment && daysUntilNextPayment <= 3
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {daysUntilNextPayment !== null 
                        ? `${Math.abs(daysUntilNextPayment)} días`
                        : "N/A"
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cuotas restantes:</span>
                    <span className="font-semibold">
                      {loan.remainingInstallments || (loan.installments - paymentsCount)}
                    </span>
                  </div>
                  {!loan.nextPaymentDate && (
                    <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                      * Fecha calculada basada en {lastPayment ? "el último pago" : "la fecha de inicio"} y la frecuencia de pago
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Último Pago */}
          {lastPayment && (
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
                        lastPayment.paymentDate,
                        "dd 'de' MMMM 'de' yyyy",
                        { locale: es }
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cuota #:</span>
                    <span className="font-semibold">
                      {lastPayment.installmentNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto:</span>
                    <span className="font-semibold text-lg">
                      {formatCurrency({
                        value: lastPayment.amount,
                        symbol: true,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capital:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency({
                        value: lastPayment.capitalAmount,
                        symbol: true,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interés:</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency({
                        value: lastPayment.interestAmount,
                        symbol: true,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Alerta de pago vencido */}
        {isOverdue && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                Pago Vencido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-2">
                Su pago está vencido. Por favor, póngase al día con sus pagos lo antes posible.
              </p>
              <div className="text-sm text-red-600">
                Monto vencido: {formatCurrency({
                  value: loan.currentInstallmentAmount || loan.feeAmount || 0,
                  symbol: true,
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información adicional */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-gray-700">
                  {paymentsCount}
                </div>
                <div className="text-sm text-gray-600">Pagos Realizados</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-gray-700">
                  {format(loan.startDate, "dd/MM/yyyy")}
                </div>
                <div className="text-sm text-gray-600">Fecha de Inicio</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-gray-700">
                  {format(loan.endDate, "dd/MM/yyyy")}
                </div>
                <div className="text-sm text-gray-600">Fecha de Fin</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            © 2025 Inversiones DJ - Consulta generada el{" "}
            {format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
          </p>
          <p>Para más información, contacte a su asesor</p>
        </div>
      </div>
    </div>
  );
};
