import { Loan, Payment } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PaymentsListProps {
  payments: Payment[];
  loan: Loan;
}

export function PaymentsList({ payments, loan }: PaymentsListProps) {
  // Calcular capital e intereses pagados por separado
  const totalCapitalPaid = payments.reduce((sum, payment) => sum + payment.capitalAmount, 0);
  const totalInterestPaid = payments.reduce((sum, payment) => sum + payment.interestAmount, 0);
  const totalPaid = totalCapitalPaid + totalInterestPaid;
  
  // El progreso se basa en el capital pagado vs el monto total del préstamo
  const capitalProgress = (totalCapitalPaid / loan.totalAmount) * 100;
  
  // Calcular cuotas restantes basado en los pagos realizados
  // const paymentsCount = payments.length;
  const remainingInstallments = loan.remainingInstallments;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Resumen de Pagos</CardTitle>
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Capital pagado: </span>
                <span className="font-medium text-green-600">
                  {formatCurrency({ value: totalCapitalPaid, symbol: true })}
                </span>
                <span className="text-muted-foreground ml-2">de</span>
                <span className="font-medium ml-2">
                  {formatCurrency({ value: loan.totalAmount, symbol: true })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Intereses pagados: </span>
                <span className="font-medium text-blue-600">
                  {formatCurrency({ value: totalInterestPaid, symbol: true })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total pagado: </span>
                <span className="font-medium">
                  {formatCurrency({ value: totalPaid, symbol: true })}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progreso del capital</span>
                <span className="font-medium">{capitalProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(capitalProgress, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency({ value: loan.balance, symbol: true })}
                </p>
                <p className="text-sm text-muted-foreground">Saldo pendiente</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {remainingInstallments}
                </p>
                <p className="text-sm text-muted-foreground">Cuotas restantes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No hay pagos registrados aún
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cuota</TableHead>
                  <TableHead>Capital</TableHead>
                  <TableHead>Interés</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.paymentDate), "dd/MM/yyyy", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        Cuota {payment.installmentNumber}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        de {loan.installments}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatCurrency({ value: payment.capitalAmount, symbol: true })}
                    </TableCell>
                    <TableCell>
                      {formatCurrency({ value: payment.interestAmount, symbol: true })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency({ value: payment.amount, symbol: true })}
                    </TableCell>
                    <TableCell>{payment.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 