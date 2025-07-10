"use client";

import React, { useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { formatCurrency, getPaymentFrequencyLabel } from "@/lib/utils";
import { Download, CheckCircle } from "lucide-react";
import { Loan, Payment, Client } from "@prisma/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface LoanPaymentCardProps {
  loan: Loan;
  payments: Payment[];
  client: Client;
}

export const LoanPaymentCard = ({
  loan,
  payments,
  client,
}: LoanPaymentCardProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Calcular estadísticas
  const totalCapitalPaid = payments.reduce(
    (sum, payment) => sum + payment.capitalAmount,
    0
  );
  const totalInterestPaid = payments.reduce(
    (sum, payment) => sum + payment.interestAmount,
    0
  );
  const totalPaid = totalCapitalPaid + totalInterestPaid;
  const capitalProgress = (totalCapitalPaid / loan.totalAmount) * 100;
  const paymentsCount = payments.length;
  const remainingInstallments = Math.max(0, loan.installments - paymentsCount);

  // Obtener estado del préstamo en español
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Activo";
      case "COMPLETED":
        return "Completado";
      case "PENDING":
        return "Pendiente";
      case "DEFAULTED":
        return "En Mora";
      case "CANCELLED":
        return "Cancelado";
      default:
        return status;
    }
  };

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
        width: 1000,
        height: 1400,
        logging: false,
        removeContainer: true,
        foreignObjectRendering: false,
        ignoreElements: (element) => {
          return element.tagName === "SCRIPT" || element.tagName === "STYLE";
        },
      });

      // Descargar la imagen
      const link = document.createElement("a");
      link.download = `prestamo-${loan.loanNumber}-${
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
    <div className="space-y-1">
      <Button
        onClick={downloadCard}
        disabled={isDownloading}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        {isDownloading ? "Generando..." : "Descargar Reporte"}
      </Button>

      {/* Tarjeta para Descarga */}
      <div className="fixed -left-[9999px] -top-[9999px] z-[-1]">
        <div
          ref={cardRef}
          data-card-ref="true"
          className="w-[1000px] h-[1400px] p-8 font-sans"
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: "#f1f5f9",
            background: "#f1f5f9",
          }}
        >
          <div
            className="rounded-lg shadow-lg p-8 h-full flex flex-col"
            style={{
              backgroundColor: "white",
              background: "white",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div
                  className="p-4 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#eff6ff" }}
                >
                  <Image
                    src="/images/inversiones-dj.png"
                    alt="Inversiones DJ Logo"
                    width={140}
                    height={140}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Reporte de Préstamo
                  </h1>
                  <p className="text-gray-600 text-lg">
                    {new Date().toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  #{loan.loanNumber}
                </div>
                <div
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    loan.status === "ACTIVE"
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : loan.status === "COMPLETED"
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : "bg-gray-100 text-gray-800 border border-gray-300"
                  }`}
                >
                  {getStatusLabel(loan.status)}
                </div>
              </div>
            </div>

            {/* Información del Cliente y Préstamo */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Datos del Cliente */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Información del Cliente
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nombre:</span>
                    <span className="font-semibold">{client.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Identificación:</span>
                    <span className="font-semibold">
                      {client.identification.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Teléfono:</span>
                    <span className="font-semibold">
                      {client.cellphone || client.phone || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Datos del Préstamo */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Datos del Préstamo
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto:</span>
                    <span className="font-semibold">
                      {formatCurrency({
                        value: loan.totalAmount,
                        symbol: true,
                      })}
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
                </div>
              </div>
            </div>

            {/* Resumen Financiero */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Resumen Financiero
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: "#eff6ff" }}
                >
                  <div className="text-sm text-gray-600 mb-1">Total Pagado</div>
                  <div
                    className="text-xl font-bold"
                    style={{ color: "#2563eb" }}
                  >
                    {formatCurrency({ value: totalPaid, symbol: true })}
                  </div>
                </div>
                <div
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: "#f0fdf4" }}
                >
                  <div className="text-sm text-gray-600 mb-1">
                    Capital Pagado
                  </div>
                  <div
                    className="text-xl font-bold"
                    style={{ color: "#16a34a" }}
                  >
                    {formatCurrency({ value: totalCapitalPaid, symbol: true })}
                  </div>
                </div>
                <div
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: "#fff7ed" }}
                >
                  <div className="text-sm text-gray-600 mb-1">
                    Intereses Pagados
                  </div>
                  <div
                    className="text-xl font-bold"
                    style={{ color: "#ea580c" }}
                  >
                    {formatCurrency({ value: totalInterestPaid, symbol: true })}
                  </div>
                </div>
                <div
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: "#fef2f2" }}
                >
                  <div className="text-sm text-gray-600 mb-1">
                    Saldo Pendiente
                  </div>
                  <div
                    className="text-xl font-bold"
                    style={{ color: "#dc2626" }}
                  >
                    {formatCurrency({ value: loan.balance, symbol: true })}
                  </div>
                </div>
              </div>

              {/* Barra de Progreso */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Progreso del Capital</span>
                  <span className="font-semibold">
                    {capitalProgress.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="h-4 rounded-full"
                    style={{
                      backgroundColor: "#16a34a",
                      width: `${Math.min(capitalProgress, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Historial de Pagos */}
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Historial de Pagos ({paymentsCount} de {loan.installments})
              </h3>

              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay pagos registrados
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "#f8fafc",
                          borderBottom: "2px solid #e2e8f0",
                        }}
                      >
                        <th className="text-left p-3 font-semibold">#</th>
                        <th className="text-left p-3 font-semibold">Fecha</th>
                        <th className="text-right p-3 font-semibold">
                          Capital
                        </th>
                        <th className="text-right p-3 font-semibold">
                          Interés
                        </th>
                        <th className="text-right p-3 font-semibold">Total</th>
                        <th className="text-left p-3 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 15).map((payment, index) => (
                        <tr
                          key={payment.id}
                          style={{
                            borderBottom: "1px solid #e2e8f0",
                            backgroundColor:
                              index % 2 === 0 ? "#ffffff" : "#f8fafc",
                          }}
                        >
                          <td className="p-3 font-medium">
                            {payment.installmentNumber}
                          </td>
                          <td className="p-3">
                            {format(
                              new Date(payment.paymentDate),
                              "dd/MM/yyyy",
                              { locale: es }
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency({
                              value: payment.capitalAmount,
                              symbol: true,
                            })}
                          </td>
                          <td
                            className="p-3 text-right"
                            style={{ color: "#ea580c" }}
                          >
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
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <CheckCircle
                                className="h-4 w-4"
                                style={{ color: "#16a34a" }}
                              />
                              <span
                                className="text-sm"
                                style={{ color: "#16a34a" }}
                              >
                                Pagado
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {payments.length > 15 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-3 text-center text-gray-500 italic"
                          >
                            ... y {payments.length - 15} pagos más
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr
                        style={{
                          backgroundColor: "#f1f5f9",
                          borderTop: "2px solid #cbd5e1",
                        }}
                      >
                        <td className="p-3 font-bold" colSpan={2}>
                          TOTALES
                        </td>
                        <td className="p-3 text-right font-bold">
                          {formatCurrency({
                            value: totalCapitalPaid,
                            symbol: true,
                          })}
                        </td>
                        <td
                          className="p-3 text-right font-bold"
                          style={{ color: "#ea580c" }}
                        >
                          {formatCurrency({
                            value: totalInterestPaid,
                            symbol: true,
                          })}
                        </td>
                        <td className="p-3 text-right font-bold">
                          {formatCurrency({ value: totalPaid, symbol: true })}
                        </td>
                        <td className="p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Reporte generado automáticamente</span>
                <div className="text-right">
                  <div>
                    Cuotas restantes:{" "}
                    <span className="font-semibold">
                      {remainingInstallments}
                    </span>
                  </div>
                  <div>
                    Fecha de generación:{" "}
                    {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
