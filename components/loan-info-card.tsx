"use client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Client, Loan, Payment } from "@prisma/client";
import { ClientInfoCard } from "./client-info-card";

interface LoanCardProps {
  loan: Loan & { payments: Payment[] };
  client: Client;
}

export function LoanInfoProgressCard({ loan, client }: LoanCardProps) {
  // Calcular capital e intereses pagados por separado
  const totalCapitalPaid = loan.payments.reduce((sum, payment) => sum + payment.capitalAmount, 0);
  const totalInterestPaid = loan.payments.reduce((sum, payment) => sum + payment.interestAmount, 0);
  const totalPaid = totalCapitalPaid + totalInterestPaid;
  
  // El progreso se basa en el capital pagado vs el monto total del préstamo
  const capitalProgress = (totalCapitalPaid / loan.totalAmount) * 100;
  
  // Calcular cuotas restantes basado en los pagos realizados
  const paymentsCount = loan.payments.length;
  const remainingInstallments = Math.max(0, loan.installments - paymentsCount);

  // Determinar el estado basado en los datos del préstamo
  const getLoanStatus = () => {
    if (loan.balance <= 0) return "Pagado";
    if (loan.nextPaymentDate && loan.nextPaymentDate < new Date()) return "En mora";
    return "Activo";
  };

  const status = getLoanStatus();
  const lastPayment =
    loan.payments.length > 0
      ? new Date(
          Math.max(
            ...loan.payments.map((p) => new Date(p.paymentDate).getTime())
          )
        )
      : null;

  return (
    <Card className="rounded-none border-none mx-auto w-full ">
      <CardHeader className="border-b-2 border-slate-200 p-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              Préstamo #{loan.loanNumber}
            </CardTitle>
            <CardDescription className="mt-1">
              {formatDate(loan.startDate)} - {formatDate(loan.endDate)}
            </CardDescription>
          </div>
          <Badge
            variant={
              status === "Pagado"
                ? "success"
                : status === "En mora"
                ? "destructive"
                : "default"
            }
          >
            {status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex flex-col items-center mx-auto w-full ">
        <ClientInfoCard client={client} variant="compact" />
        
        {/* Barra de progreso del capital */}
        <div className="w-full">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progreso del capital</span>
            <span className="font-medium">{capitalProgress.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(capitalProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Resumen de pagos */}
        <div className="grid grid-cols-3 gap-4 text-sm w-full bg-muted/50 p-3 rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Capital pagado</p>
            <p className="font-bold text-green-600">
              {formatCurrency({ value: totalCapitalPaid, symbol: true })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Intereses pagados</p>
            <p className="font-bold text-blue-600">
              {formatCurrency({ value: totalInterestPaid, symbol: true })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Total pagado</p>
            <p className="font-bold">
              {formatCurrency({ value: totalPaid, symbol: true })}
            </p>
          </div>
        </div>

        {/* Detalles del préstamo */}
        <div className="grid md:grid-cols-3 gap-4 text-sm w-full">
          <div className="space-y-1">
            <p className="text-muted-foreground">Monto total</p>
            <p className="font-medium">
              {formatCurrency({ value: loan.totalAmount, symbol: true })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Saldo pendiente</p>
            <p className="font-medium text-green-600">
              {formatCurrency({ value: loan.balance, symbol: true })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Valor cuota</p>
            <p className="font-medium">
              {formatCurrency({ value: loan.feeAmount, symbol: true })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Tasa interés</p>
            <p className="font-medium">{loan.interestRate}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Cuotas restantes</p>
            <p className="font-medium text-blue-600">
              {remainingInstallments} de {loan.installments}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Frecuencia</p>
            <p className="font-medium capitalize">
              {loan.paymentFrequency === "DAILY"
                ? "Diario"
                : loan.paymentFrequency === "WEEKLY"
                ? "Semanal"
                : loan.paymentFrequency === "BIWEEKLY"
                ? "Quincenal"
                : loan.paymentFrequency === "MONTHLY"
                ? "Mensual"
                : loan.paymentFrequency === "QUARTERLY"
                ? "Trimestral"
                : loan.paymentFrequency === "YEARLY"
                ? "Anual"
                : ""}
            </p>
          </div>
        </div>

        {/* Información adicional */}
        <div className="pt-2 mt-2 border-t grid grid-cols-2 gap-4 text-sm w-full">
          <div className="space-y-1">
            <p className="text-muted-foreground">Último pago</p>
            <p className="font-medium">
              {lastPayment ? formatDate(lastPayment) : "Ninguno"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Próximo pago</p>
            <p className="font-medium">
              {loan.nextPaymentDate ? formatDate(loan.nextPaymentDate) : "N/A"}
            </p>
          </div>
        </div>

        {/* Alerta de interés pendiente */}
        {loan.pendingInterest > 0 && (
          <div className="w-full p-3 rounded-lg bg-yellow-100 border border-yellow-300">
            <p className="text-yellow-800 text-sm">
              <strong>¡Atención!</strong> Interés pendiente acumulado: {" "}
              <span className="font-bold">
                {formatCurrency({ value: loan.pendingInterest, symbol: true })}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
