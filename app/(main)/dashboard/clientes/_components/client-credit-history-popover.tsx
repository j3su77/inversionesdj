"use client";

import Link from "next/link";
import { Client, Loan, LoanStatus } from "@prisma/client";
import { CreditCard, ExternalLink } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";

type LoanRow = Loan & {
  payments?: { paymentDate: Date; amount: number }[];
};

type Props = {
  client: Client & { loans: LoanRow[] };
};

function loanStatusLabel(loan: LoanRow): string {
  if (loan.status === LoanStatus.COMPLETED || loan.balance <= 0) {
    return "Pagado";
  }
  switch (loan.status) {
    case LoanStatus.ACTIVE:
      return "Activo";
    case LoanStatus.PENDING:
      return "Pendiente";
    case LoanStatus.DEFAULTED:
      return "En mora";
    default:
      return loan.status;
  }
}

function loanBadgeVariant(
  loan: LoanRow,
): "default" | "secondary" | "destructive" | "outline" {
  if (loan.status === LoanStatus.COMPLETED || loan.balance <= 0) {
    return "secondary";
  }
  if (
    loan.status === LoanStatus.DEFAULTED ||
    (loan.status === LoanStatus.ACTIVE &&
      loan.nextPaymentDate &&
      loan.nextPaymentDate < new Date() &&
      loan.balance > 0)
  ) {
    return "destructive";
  }
  if (loan.status === LoanStatus.PENDING) {
    return "outline";
  }
  return "default";
}

export function ClientCreditHistoryPopover({ client }: Props) {
  const loans = client.loans ?? [];
  const activeCount = loans.filter(
    (l) => l.status === LoanStatus.ACTIVE && l.balance > 0,
  ).length;
  const totalDebt = loans.reduce((sum, l) => sum + l.balance, 0);
  const totalPaid = loans.reduce(
    (sum, l) => sum + Math.max(0, l.totalAmount - l.balance),
    0,
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group inline-flex max-w-full items-center gap-1.5 text-left font-medium hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <span className="truncate">{client.fullName}</span>
          <CreditCard className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,420px)] p-0"
        align="start"
      >
        <div className="p-4 pb-2">
          <p className="font-semibold leading-tight">{client.fullName}</p>
          <p className="text-xs text-muted-foreground">
            Historial crediticio
          </p>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-2 p-4 text-center text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Préstamos</p>
            <p className="font-semibold">{loans.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Activos</p>
            <p className="font-semibold">{activeCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Deuda</p>
            <p className="font-semibold text-sm">
              {formatCurrency({ value: totalDebt, symbol: true })}
            </p>
          </div>
        </div>
        <p className="px-4 pb-2 text-xs text-muted-foreground">
          Total pagado:{" "}
          <span className="font-medium text-foreground">
            {formatCurrency({ value: totalPaid, symbol: true })}
          </span>
        </p>
        <Separator />
        <div
          className="max-h-[min(280px,45vh)] overflow-y-auto overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
        >
          {loans.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              Sin préstamos registrados
            </p>
          ) : (
            <ul className="space-y-2 p-2">
              {loans.map((loan) => (
                <li
                  key={loan.id}
                  className="rounded-md border bg-muted/30 p-3 text-sm space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        #{loan.loanNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(loan.startDate)} – {formatDate(loan.endDate)}
                      </p>
                    </div>
                    <Badge variant={loanBadgeVariant(loan)}>
                      {loanStatusLabel(loan)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Monto</span>
                    <span className="text-right">
                      {formatCurrency({
                        value: loan.totalAmount,
                        symbol: true,
                      })}
                    </span>
                    <span className="text-muted-foreground">Saldo</span>
                    <span className="text-right">
                      {formatCurrency({ value: loan.balance, symbol: true })}
                    </span>
                    <span className="text-muted-foreground">Cuotas</span>
                    <span className="text-right">
                      {loan.installments} ({loan.remainingInstallments}{" "}
                      rest.)
                    </span>
                    {loan.nextPaymentDate && loan.balance > 0 && (
                      <>
                        <span className="text-muted-foreground">
                          Próx. pago
                        </span>
                        <span className="text-right">
                          {formatDate(loan.nextPaymentDate)}
                        </span>
                      </>
                    )}
                  </div>
                  {loan.payments?.[0] && (
                    <p className="text-xs text-muted-foreground">
                      Último pago:{" "}
                      {formatDate(loan.payments[0].paymentDate)} —{" "}
                      {formatCurrency({
                        value: loan.payments[0].amount,
                        symbol: true,
                      })}
                    </p>
                  )}
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link
                      href={`/dashboard/prestamos/gestionar/${loan.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Ver préstamo
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Separator />
        <div className="p-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href={`/dashboard/clientes/editar/${client.id}`}>
              Editar cliente
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
