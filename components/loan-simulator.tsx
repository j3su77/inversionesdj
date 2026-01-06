"use client";

import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas-pro";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import {
  Calculator,
  TrendingUp,
  Calendar,
  DollarSign,
  ArrowLeft,
  Download,
} from "lucide-react";
import { Button } from "./ui/button";
import { FormattedInput } from "./ui/formatted-input";

interface LoanConfig {
  totalAmount: number;
  installments: number;
  interestRate: number;
  interestType: "FIXED" | "DECREASING";
  paymentFrequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY";
}

interface PaymentSchedule {
  installmentNumber: number;
  paymentDate: Date;
  capitalAmount: number;
  interestAmount: number;
  totalPayment: number;
  remainingBalance: number;
}

interface LoanSummary {
  totalInterest: number;
  totalPayments: number;
  monthlyPayment: number;
  effectiveRate: number;
}

const paymentFrequencyOptions = [
  { label: "Diario", value: "DAILY" },
  { label: "Semanal", value: "WEEKLY" },
  { label: "Quincenal", value: "BIWEEKLY" },
  { label: "Mensual", value: "MONTHLY" },
  { label: "Trimestral", value: "QUARTERLY" },
];

const interestTypeOptions = [
  { label: "Decreciente sobre saldo", value: "DECREASING" },
  { label: "Fijo sobre monto inicial", value: "FIXED" },
];

export const LoanSimulator = () => {
  const [calculate, setCalculate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<LoanConfig>({
    totalAmount: 0,
    installments: 0,
    interestRate: 0,
    interestType: "DECREASING",
    paymentFrequency: "MONTHLY",
  });

  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([]);
  const [loanSummary, setLoanSummary] = useState<LoanSummary>({
    totalInterest: 0,
    totalPayments: 0,
    monthlyPayment: 0,
    effectiveRate: 0,
  });

  // Función para calcular días entre pagos según frecuencia
  const getDaysBetweenPayments = (frequency: string): number => {
    switch (frequency) {
      case "DAILY":
        return 1;
      case "WEEKLY":
        return 7;
      case "BIWEEKLY":
        return 15;
      case "MONTHLY":
        return 30;
      case "QUARTERLY":
        return 90;
      default:
        return 30;
    }
  };

  // Función para calcular la tabla de amortización
  const calculateAmortization = (
    loanConfig: LoanConfig
  ): { schedule: PaymentSchedule[]; summary: LoanSummary } => {
    const {
      totalAmount,
      installments,
      interestRate,
      interestType,
      paymentFrequency,
    } = loanConfig;

    if (!totalAmount || !installments || !interestRate) {
      return {
        schedule: [],
        summary: {
          totalInterest: 0,
          totalPayments: 0,
          monthlyPayment: 0,
          effectiveRate: 0,
        },
      };
    }

    const schedule: PaymentSchedule[] = [];
    let remainingBalance = totalAmount;
    const baseCapitalAmount = totalAmount / installments;
    const daysBetweenPayments = getDaysBetweenPayments(paymentFrequency);

    // Calcular interés según el tipo
    let totalInterest = 0;
    let fixedInterestAmount = 0;

    // Función para calcular el interés diario
    const calculateDailyInterest = (amount: number, rate: number): number => {
      const monthlyInterest = amount * (rate / 100);
      return monthlyInterest / 30;
    };

    // Calcular días según la frecuencia de pago
    const getDaysForFrequency = (frequency: string): number => {
      switch (frequency) {
        case "DAILY":
          return 1;
        case "WEEKLY":
          return 7;
        case "BIWEEKLY":
          return 15;
        case "MONTHLY":
          return 30;
        case "QUARTERLY":
          return 90;
        default:
          return 30;
      }
    };

    if (interestType === "FIXED") {
      // Para interés fijo: calcular interés diario y multiplicar por días de frecuencia
      const dailyInterest = calculateDailyInterest(totalAmount, interestRate);
      const daysForFrequency = getDaysForFrequency(paymentFrequency);
      fixedInterestAmount = dailyInterest * daysForFrequency;
    }

    for (let i = 1; i <= installments; i++) {
      let interestAmount: number;
      let capitalAmount: number;

      if (interestType === "FIXED") {
        // Interés fijo: calcular según días de frecuencia
        const dailyInterest = calculateDailyInterest(totalAmount, interestRate);
        const daysForFrequency = getDaysForFrequency(paymentFrequency);
        interestAmount = dailyInterest * daysForFrequency;
        capitalAmount = baseCapitalAmount;
      } else {
        // Interés decreciente: calcular interés diario sobre saldo y multiplicar por días
        const dailyInterest = calculateDailyInterest(remainingBalance, interestRate);
        const daysForFrequency = getDaysForFrequency(paymentFrequency);
        interestAmount = dailyInterest * daysForFrequency;
        capitalAmount = baseCapitalAmount;
      }

      const totalPayment = capitalAmount + interestAmount;
      const newRemainingBalance = Math.max(0, remainingBalance - capitalAmount);

      // Calcular fecha de pago
      const paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() + i * daysBetweenPayments);

      schedule.push({
        installmentNumber: i,
        paymentDate,
        capitalAmount,
        interestAmount,
        totalPayment,
        remainingBalance: newRemainingBalance,
      });

      totalInterest += interestAmount;
      remainingBalance = newRemainingBalance;
    }

    const totalPayments = totalAmount + totalInterest;
    const averagePayment =
      schedule.length > 0
        ? schedule.reduce((sum, payment) => sum + payment.totalPayment, 0) /
          schedule.length
        : 0;
    const effectiveRate =
      totalAmount > 0 ? (totalInterest / totalAmount) * 100 : 0;

    return {
      schedule,
      summary: {
        totalInterest,
        totalPayments,
        monthlyPayment: averagePayment,
        effectiveRate,
      },
    };
  };

  // Recalcular cuando cambie la configuración
  useEffect(() => {
    const { schedule, summary } = calculateAmortization(config);
    setPaymentSchedule(schedule);
    setLoanSummary(summary);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleConfigChange = (field: keyof LoanConfig, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [field]:
        field === "totalAmount" ||
        field === "installments" ||
        field === "interestRate"
          ? Number(value) || 0
          : value,
    }));
  };

  const getFrequencyLabel = (frequency: string) => {
    return (
      paymentFrequencyOptions.find((opt) => opt.value === frequency)?.label ||
      frequency
    );
  };

  const getInterestTypeLabel = (type: string) => {
    return interestTypeOptions.find((opt) => opt.value === type)?.label || type;
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;

    setIsDownloading(true);

    try {
      // Esperar un poco para asegurar que el DOM esté listo
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Generar la imagen usando html2canvas-pro
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#ffffff",
        scale: 1,
        useCORS: true,
        allowTaint: true,
        width: 800,
        height: 600,
        logging: true,
        ignoreElements: (element) => {
          // Ignorar elementos que puedan causar problemas
          return element.tagName === "SCRIPT" || element.tagName === "STYLE";
        },
      });

      // Descargar la imagen
      const link = document.createElement("a");
      link.download = `simulacion-prestamo-${
        new Date().toISOString().split("T")[0]
      }.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Error al generar la imagen:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calculator className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Simulador de Préstamos
          </h1>
          <p className="text-gray-600">
            Calcula y visualiza la tabla de amortización del préstamo
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Panel de Configuración */}
        {!calculate && (
          <div className="">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Configuración del Préstamo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Monto Total */}
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Monto Total</Label>
                  <FormattedInput
                    id="totalAmount"
                    type="number"
                    value={config.totalAmount || ""}
                    onChange={(e) =>
                      handleConfigChange("totalAmount", e)
                    }
                    placeholder="Ingrese el monto"
                  />
                </div>

                {/* Número de Cuotas */}
                <div className="space-y-2">
                  <Label htmlFor="installments">Número de Cuotas</Label>
                  <Input
                    id="installments"
                    type="number"
                    value={config.installments || ""}
                    onChange={(e) =>
                      handleConfigChange("installments", e.target.value)
                    }
                    placeholder="Número de cuotas"
                  />
                </div>

                {/* Tasa de Interés */}
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Tasa de Interés (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    value={config.interestRate || ""}
                    onChange={(e) =>
                      handleConfigChange("interestRate", e.target.value)
                    }
                    placeholder="Tasa de interés"
                  />
                </div>

                {/* Tipo de Interés */}
                <div className="space-y-2">
                  <Label>Tipo de Interés</Label>
                  <Select
                    value={config.interestType}
                    onValueChange={(value) =>
                      handleConfigChange("interestType", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {interestTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Frecuencia de Pago */}
                <div className="space-y-2">
                  <Label>Frecuencia de Pago</Label>
                  <Select
                    value={config.paymentFrequency}
                    onValueChange={(value) =>
                      handleConfigChange("paymentFrequency", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentFrequencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setCalculate(true)}>Calcular</Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Panel de Resultados */}
        {calculate && (
          <div className="">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => setCalculate(false)}>
                  <ArrowLeft className="h-5 w-5" />
                  Volver
                </Button>
                <Button
                  onClick={downloadCard}
                  disabled={isDownloading}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isDownloading ? "Generando..." : "Descargar Tarjeta"}
                </Button>
              </div>
            </div>
            <Tabs defaultValue="summary" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Resumen</TabsTrigger>
                <TabsTrigger value="schedule">
                  Tabla de Amortización
                </TabsTrigger>
              </TabsList>

              {/* Tab de Resumen */}
              <TabsContent value="summary" className="space-y-4">
                {/* Resumen Principal */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Resumen del Préstamo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Monto del préstamo:
                          </span>
                          <span className="font-semibold">
                            {formatCurrency({
                              value: config.totalAmount,
                              symbol: true,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Total de intereses:
                          </span>
                          <span className="font-semibold text-orange-600">
                            {formatCurrency({
                              value: loanSummary.totalInterest,
                              symbol: true,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Total a pagar:
                          </span>
                          <span className="font-bold text-lg text-blue-600">
                            {formatCurrency({
                              value: loanSummary.totalPayments,
                              symbol: true,
                            })}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Cuota promedio:
                          </span>
                          <span className="font-semibold">
                            {formatCurrency({
                              value: loanSummary.monthlyPayment,
                              symbol: true,
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Tasa efectiva:
                          </span>
                          <Badge variant="outline">
                            {loanSummary.effectiveRate.toFixed(2)}%
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Tipo de interés:
                          </span>
                          <Badge
                            variant={
                              config.interestType === "FIXED"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {getInterestTypeLabel(config.interestType)}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Frecuencia:
                          </span>
                          <Badge variant="outline">
                            {getFrequencyLabel(config.paymentFrequency)}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Número de cuotas:
                          </span>
                          <span className="font-semibold">
                            {config.installments}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico de Composición */}
                <Card>
                  <CardHeader>
                    <CardTitle>Composición del Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-500 rounded"></div>
                          <span className="text-sm">Capital</span>
                        </div>
                        <span className="font-semibold">
                          {formatCurrency({
                            value: config.totalAmount,
                            symbol: true,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-orange-500 rounded"></div>
                          <span className="text-sm">Intereses</span>
                        </div>
                        <span className="font-semibold">
                          {formatCurrency({
                            value: loanSummary.totalInterest,
                            symbol: true,
                          })}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-orange-500 h-4 rounded-full flex"
                          style={{ width: "100%" }}
                        >
                          <div
                            className="bg-blue-500 h-full rounded-l-full"
                            style={{
                              width: `${
                                (config.totalAmount /
                                  loanSummary.totalPayments) *
                                100
                              }%`,
                            }}
                          ></div>
                          <div
                            className="bg-orange-500 h-full rounded-r-full"
                            style={{
                              width: `${
                                (loanSummary.totalInterest /
                                  loanSummary.totalPayments) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab de Tabla de Amortización */}
              <TabsContent value="schedule">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Tabla de Amortización
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">#</th>
                            <th className="text-left p-2">Fecha</th>
                            <th className="text-right p-2">Capital</th>
                            <th className="text-right p-2">Interés</th>
                            <th className="text-right p-2">Cuota Total</th>
                            <th className="text-right p-2">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentSchedule.map((payment, index) => (
                            <tr
                              key={index}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="p-2 font-medium">
                                {payment.installmentNumber}
                              </td>
                              <td className="p-2">
                                {payment.paymentDate.toLocaleDateString(
                                  "es-CO"
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {formatCurrency({
                                  value: payment.capitalAmount,
                                  symbol: true,
                                })}
                              </td>
                              <td className="p-2 text-right text-orange-600">
                                {formatCurrency({
                                  value: payment.interestAmount,
                                  symbol: true,
                                })}
                              </td>
                              <td className="p-2 text-right font-semibold">
                                {formatCurrency({
                                  value: payment.totalPayment,
                                  symbol: true,
                                })}
                              </td>
                              <td className="p-2 text-right text-blue-600">
                                {formatCurrency({
                                  value: payment.remainingBalance,
                                  symbol: true,
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 bg-gray-50 font-bold">
                            <td className="p-2" colSpan={2}>
                              TOTALES
                            </td>
                            <td className="p-2 text-right">
                              {formatCurrency({
                                value: config.totalAmount,
                                symbol: true,
                              })}
                            </td>
                            <td className="p-2 text-right text-orange-600">
                              {formatCurrency({
                                value: loanSummary.totalInterest,
                                symbol: true,
                              })}
                            </td>
                            <td className="p-2 text-right">
                              {formatCurrency({
                                value: loanSummary.totalPayments,
                                symbol: true,
                              })}
                            </td>
                            <td className="p-2 text-right">$ 0</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Tarjeta para Descarga */}
      <div className="fixed -left-[9999px] -top-[9999px] z-[-1]">
        <div
          ref={cardRef}
          data-card-ref="true"
          className="w-[800px] h-[600px] bg-gradient-to-br from-blue-50 to-indigo-100 p-8 font-sans"
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
            {/* Header de la tarjeta */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calculator className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Simulación de Préstamo
                  </h1>
                  <p className="text-gray-600 text-sm">
                    {new Date().toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    config.interestType === "FIXED"
                      ? "bg-gray-100 text-gray-800 border border-gray-300"
                      : "bg-blue-100 text-blue-800 border border-blue-300"
                  }`}
                >
                  {getInterestTypeLabel(config.interestType)}
                </div>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="flex-1 grid grid-cols-2 gap-8">
              {/* Columna izquierda - Datos del préstamo */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Datos del Préstamo
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monto:</span>
                      <span className="font-semibold">
                        {formatCurrency({
                          value: config.totalAmount,
                          symbol: true,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cuotas:</span>
                      <span className="font-semibold">
                        {config.installments}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tasa de interés:</span>
                      <span className="font-semibold">
                        {config.interestRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frecuencia:</span>
                      <span className="font-semibold">
                        {getFrequencyLabel(config.paymentFrequency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gráfico visual */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Composición
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: "#3b82f6" }}
                        ></div>
                        <span className="text-sm">Capital</span>
                      </div>
                      <span className="font-semibold text-sm">
                        {formatCurrency({
                          value: config.totalAmount,
                          symbol: true,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: "#f97316" }}
                        ></div>
                        <span className="text-sm">Intereses</span>
                      </div>
                      <span className="font-semibold text-sm">
                        {formatCurrency({
                          value: loanSummary.totalInterest,
                          symbol: true,
                        })}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                      <div className="h-3 rounded-full flex">
                        <div
                          className="h-full rounded-l-full"
                          style={{
                            backgroundColor: "#3b82f6",
                            width: `${
                              (config.totalAmount / loanSummary.totalPayments) *
                              100
                            }%`,
                          }}
                        ></div>
                        <div
                          className="h-full rounded-r-full"
                          style={{
                            backgroundColor: "#f97316",
                            width: `${
                              (loanSummary.totalInterest /
                                loanSummary.totalPayments) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna derecha - Resumen financiero */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Resumen Financiero
                  </h3>
                  <div className="space-y-4">
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: "#eff6ff" }}
                    >
                      <div className="text-sm text-gray-600 mb-1">
                        Total a Pagar
                      </div>
                      <div
                        className="text-2xl font-bold"
                        style={{ color: "#2563eb" }}
                      >
                        {formatCurrency({
                          value: loanSummary.totalPayments,
                          symbol: true,
                        })}
                      </div>
                    </div>
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: "#fff7ed" }}
                    >
                      <div className="text-sm text-gray-600 mb-1">
                        Total Intereses
                      </div>
                      <div
                        className="text-xl font-bold"
                        style={{ color: "#ea580c" }}
                      >
                        {formatCurrency({
                          value: loanSummary.totalInterest,
                          symbol: true,
                        })}
                      </div>
                    </div>
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: "#f0fdf4" }}
                    >
                      <div className="text-sm text-gray-600 mb-1">
                        Cuota Promedio
                      </div>
                      <div
                        className="text-xl font-bold"
                        style={{ color: "#16a34a" }}
                      >
                        {formatCurrency({
                          value: loanSummary.monthlyPayment,
                          symbol: true,
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Información Adicional
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tasa efectiva:</span>
                      <span className="font-semibold">
                        {loanSummary.effectiveRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Ahorro vs tasa fija:
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: "#16a34a" }}
                      >
                        {config.interestType === "DECREASING"
                          ? "Aplicable"
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Simulación generada automáticamente</span>
                <span>Los valores son aproximados y pueden variar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
