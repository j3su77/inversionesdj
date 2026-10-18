"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, CircleDollarSign, Eye, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { differenceInCalendarDays, startOfDay } from "date-fns";

import { Loan, LoanStatus, PaymentFrequency } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { DeleteLoanDialog } from "../gestionar/[loanId]/_components/delete-loan-dialog";

/** Fila de la tabla de préstamos (lista en dashboard). */
export type LoanTableRow = Loan & {
  client: {
    fullName: string;
    identification: number;
    phone: string | null;
    cellphone: string | null;
  } | null;
  payments: {
    interestAmount: number;
  }[];
  _count: {
    payments: number;
  } | null;
};

/**
 * Días calendario desde `nextPaymentDate` hasta hoy (para mora: cuánto lleva vencido).
 * Si no hay fecha, devuelve 0.
 */
export function getDaysOverdueSinceNextPayment(
  nextPaymentDate: Date | string | null | undefined
): number {
  if (!nextPaymentDate) return 0;
  const due = startOfDay(new Date(nextPaymentDate));
  const today = startOfDay(new Date());
  return Math.max(0, differenceInCalendarDays(today, due));
}

const translatePaymentFrequency = (frequency: PaymentFrequency) => {
  switch (frequency) {
    case "WEEKLY":
      return "Semanal";
    case "MONTHLY":
      return "Mensual";
    case "BIWEEKLY":
      return "Quincenal";
    case "DAILY":
      return "Diario";
    default:
      return "N/A";
  }
};

const getLoanStatusText = (status: LoanStatus) => {
  switch (status) {
    case "ACTIVE":
      return "Activo";
    case "COMPLETED":
      return "Pagado";
    case "CANCELLED":
      return "Cancelado";
    case "DEFAULTED":
      return "En mora";
    case "PENDING":
      return "Pendiente";
    default:
      return status;
  }
};

/** Fondo de fila alineado con badges de la ficha del préstamo. */
export function getLoanRowClassName(loan: LoanTableRow): string {
  const base = "transition-colors border-b-border/60";

  switch (loan.status) {
    case "PENDING":
      return `${base} bg-amber-50/90 hover:bg-amber-100/80`;
    case "COMPLETED":
      return `${base} bg-sky-50/90 hover:bg-sky-100/70`;
    case "CANCELLED":
      return `${base} bg-muted/40 hover:bg-muted/60 text-muted-foreground`;
    case "DEFAULTED":
      return `${base} bg-red-50/90 hover:bg-red-100/80`;
    case "ACTIVE": {
      const overdue =
        loan.nextPaymentDate != null &&
        getDaysOverdueSinceNextPayment(loan.nextPaymentDate) > 0;
      if (overdue) {
        return `${base} bg-red-50/80 hover:bg-red-100/70`;
      }
      return `${base} bg-emerald-50/50 hover:bg-emerald-100/60`;
    }
    default:
      return base;
  }
}

const loanStatusBadgeClass: Record<LoanStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-200",
  ACTIVE: "bg-emerald-100 text-emerald-900 border-emerald-200",
  COMPLETED: "bg-sky-100 text-sky-900 border-sky-200",
  DEFAULTED: "bg-red-100 text-red-900 border-red-200",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export function getLoanStatusBadgeClass(
  loan: Pick<LoanTableRow, "status" | "nextPaymentDate">
): string {
  if (
    loan.status === "ACTIVE" &&
    loan.nextPaymentDate != null &&
    getDaysOverdueSinceNextPayment(loan.nextPaymentDate) > 0
  ) {
    return loanStatusBadgeClass.DEFAULTED;
  }
  return loanStatusBadgeClass[loan.status] ?? loanStatusBadgeClass.CANCELLED;
}

const loanColumnsBase: ColumnDef<LoanTableRow>[] = [
  {
    accessorKey: "Numero prestamo",
    accessorFn: (value) => value.loanNumber,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Código
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const loanNumber = row.original.loanNumber;
      return <div className="">{loanNumber}</div>;
    },
  },
  {
    accessorKey: "Fecha inicio",
    accessorFn: (value) => formatDate(value.startDate, "P"),
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          F. Inicio
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const startDate = formatDate(row.original.startDate, "P");
      return <div className="">{startDate}</div>;
    },
  },
  {
    accessorKey: "Fecha final",
    accessorFn: (value) => formatDate(value.endDate, "P"),
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          F. Final
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const endDate = formatDate(row.original.endDate, "P");
      return <div className="">{endDate}</div>;
    },
  },
  {
    accessorKey: "Nombre del cliente",
    accessorFn: (value) => value.client?.fullName,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombres del cliente
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const fullName = row.original?.client?.fullName;
      return <div className="">{fullName}</div>;
    },
  },
  {
    accessorKey: "Identificación",
    accessorFn: (value) => value.client?.identification,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Identificación
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const identification = row.original.client?.identification;
      return <div className="">{identification}</div>;
    },
  },
  {
    accessorKey: "Monto prestado",
    accessorFn: (value) => formatCurrency({ value: value.totalAmount }),
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Monto Prestado
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const totalAmount = formatCurrency({ value: row.original.totalAmount });
      return <div className="">{totalAmount}</div>;
    },
  },
  {
    accessorKey: "Cuotas restantes",
    accessorFn: (value) => value.remainingInstallments,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          # Cuotas <br /> restantes
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const remainingInstallments = row.original.remainingInstallments;
      return (
        <div className="text-center max-w-[80%]">{remainingInstallments}</div>
      );
    },
  },
  {
    accessorKey: "Próximo pago",
    accessorFn: (value) =>
      value.nextPaymentDate
        ? new Date(value.nextPaymentDate).getTime()
        : null,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Próximo pago
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const next = row.original.nextPaymentDate;
      if (!next) {
        return <span className="text-muted-foreground">—</span>;
      }
      const d = next instanceof Date ? next : new Date(next);
      return (
        <div className="whitespace-nowrap">
          {formatDate(d, "P")}
        </div>
      );
    },
  },
  {
    accessorKey: "Saldo",
    accessorFn: (value) => formatCurrency({ value: value.balance }),
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Saldo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const balance = formatCurrency({ value: row.original.balance });
      return <div className="text-center">{balance}</div>;
    },
  },
  {
    accessorKey: "Intereses pagados",
    accessorFn: (value) => {
      const totalInterestPaid = value.payments.reduce(
        (sum, payment) => sum + payment.interestAmount,
        0,
      );
      return formatCurrency({ value: totalInterestPaid });
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Int. pagados
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const totalInterestPaid = row.original.payments.reduce(
        (sum, payment) => sum + payment.interestAmount,
        0,
      );
      const formattedAmount = formatCurrency({ value: totalInterestPaid });
      return <div className="">{formattedAmount}</div>;
    },
  },
  {
    accessorKey: "Frecuencia",
    // accessorFn: (value) => translatePaymentFrequency(value.paymentFrequency),
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Frecuencia
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const frequency = row.original
        .paymentFrequency as PaymentFrequency | null;
      return (
        <div className="text-left">
          {frequency ? translatePaymentFrequency(frequency) : "N/A"}
        </div>
      );
    },
  },
  {
    accessorKey: "Estado",
    accessorFn: (value) => value.status,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Estado
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const loan = row.original;
      return (
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getLoanStatusBadgeClass(loan)}`}
        >
          {loan.status === "ACTIVE" &&
          loan.nextPaymentDate != null &&
          getDaysOverdueSinceNextPayment(loan.nextPaymentDate) > 0
            ? "En mora"
            : getLoanStatusText(loan.status)}
        </span>
      );
    },
  },
  {
    accessorKey: "Acciones",

    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Acciones
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="flex gap-3">
          <Link
            className={buttonVariants()}
            href={`/dashboard/prestamos/gestionar/${row.original.id}`}
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            className={buttonVariants({ className: "!bg-blue-600 hover:!bg-blue-700" })}
            href={`/dashboard/prestamos/gestionar/${row.original.id}/registrar-pago`}
          >
            <CircleDollarSign className="w-4 h-4 text-white" />
          </Link>
          <DeleteLoanDialog
            loan={{
              ...row.original,
              client: row.original.client || { fullName: "" },
              payments: [],
            }}
            trigger={
              <Button variant="destructive" size="icon">
                <Trash2 className="w-5 h-5" />
              </Button>
            }
          />
        </div>
      );
    },
  },
];

/** Columna extra solo para el tab "En Mora": días vencidos desde el próximo pago programado. */
function createDaysOverdueColumn(): ColumnDef<LoanTableRow> {
  return {
    id: "daysWithoutPayment",
    accessorKey: "Días sin pagar",
    accessorFn: (row) => getDaysOverdueSinceNextPayment(row.nextPaymentDate),
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Días sin pagar
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const days = getDaysOverdueSinceNextPayment(row.original.nextPaymentDate);
      return (
        <div className="text-center font-semibold text-red-600 dark:text-red-500 tabular-nums">
          {days} {days === 1 ? "día" : "días"}
        </div>
      );
    },
  };
}

const saldoColumnIndex = loanColumnsBase.findIndex(
  (col) => "accessorKey" in col && col.accessorKey === "Saldo"
);

/** Mismas columnas que `columnsLoan` más "Días sin pagar" (uso en tab En Mora). */
export const columnsLoanOverdue: ColumnDef<LoanTableRow>[] =
  saldoColumnIndex >= 0
    ? [
        ...loanColumnsBase.slice(0, saldoColumnIndex),
        createDaysOverdueColumn(),
        ...loanColumnsBase.slice(saldoColumnIndex),
      ]
    : [...loanColumnsBase, createDaysOverdueColumn()];

export const columnsLoan = loanColumnsBase;
