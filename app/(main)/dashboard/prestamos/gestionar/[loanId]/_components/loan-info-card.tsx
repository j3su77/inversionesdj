import { Account, Loan, LoanAccount, LoanStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, getPaymentFrequencyLabel } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  DollarSign,
  Percent,
  Clock,
  BarChart2,
  // CreditCard,
  Code,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LoanInfoCardProps {
  loan: Loan & {
    loanAccounts: (LoanAccount & { account: Account | null })[] | null;
  };
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  className?: string;
}

function InfoItem({ icon, label, value, className }: InfoItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`font-medium ${className}`}>{value}</p>
      </div>
    </div>
  );
}

const loanStatusMap: Record<LoanStatus, { label: string; className: string }> =
  {
    PENDING: { label: "Pendiente", className: "bg-yellow-200 text-yellow-800" },
    ACTIVE: { label: "Activo", className: "bg-green-200 text-green-800" },
    COMPLETED: { label: "Completado", className: "bg-blue-200 text-blue-800" },
    DEFAULTED: { label: "Moroso", className: "bg-red-200 text-red-800" },
    CANCELLED: { label: "Cancelado", className: "bg-gray-200 text-gray-800" },
  };

export function LoanInfoCard({ loan }: LoanInfoCardProps) {
  return (
    <Card className="w-full  border border-slate-200 rounded-sm ">
      <CardHeader className="py-1">
        <div className="flex justify-between items-center">
          <CardTitle>Información del préstamo</CardTitle>
          <Badge className={loanStatusMap[loan.status].className}>
            {loanStatusMap[loan.status].label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoItem
            icon={<Code className="h-4 w-4" />}
            label="Código de préstamo"
            value={loan.loanNumber}
            className="font-bold"
          />
          <InfoItem
            icon={<DollarSign className="h-4 w-4" />}
            label="Monto total"
            value={formatCurrency({ value: loan.totalAmount, symbol: true })}
          />
          <InfoItem
            icon={<BarChart2 className="h-4 w-4" />}
            label="Cuotas"
            value={`${loan.installments} cuotas`}
          />
          <InfoItem
            icon={<Percent className="h-4 w-4" />}
            label="Tasa de interés"
            value={`${loan.interestRate}% ${
              loan.interestType === "FIXED" ? "Fijo" : "Decreciente"
            }`}
          />
          <InfoItem
            icon={<Clock className="h-4 w-4" />}
            label="Frecuencia de pago"
            value={getPaymentFrequencyLabel(loan.paymentFrequency)}
          />
          <InfoItem
            icon={<Calendar className="h-4 w-4" />}
            label="Fecha de inicio"
            value={format(new Date(loan.startDate), "dd 'de' MMMM 'de' yyyy", {
              locale: es,
            })}
          />
          {/* <div className=" flex flex-col gap-2 bg-slate-50 p-2 rounded-sm border border-slate-200">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Cuentas
            </p>
            <div className="flex flex-wrap gap-2">
              {loan.loanAccounts &&
                loan.loanAccounts.length > 0 &&
                loan.loanAccounts.map((loanAccount) => (
                  <div
                    key={loanAccount.account?.id}
                    className="flex items-center gap-2 border border-slate-200 rounded-sm p-2 bg-white"
                  >
                    <div>
                      <p className="font-medium">{loanAccount.account?.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {loanAccount.account?.type}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div> */}
        </div>
      </CardContent>
    </Card>
  );
}
