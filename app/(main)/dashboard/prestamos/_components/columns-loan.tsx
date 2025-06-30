"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

import { Loan, PaymentFrequency } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

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

export const columnsLoan: ColumnDef<
  Loan & {
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
  }
>[] = [
  {
    accessorKey: "Numero prestamo",
    accessorFn: (value) => value.loanNumber,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Número de préstamo
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
  // {
  //   accessorKey: "F. proxima cuota",
  //   accessorFn: (value) => value.remainingInstallments,
  //   header: ({ column }) => {
  //     return (
  //       <Button
  //         variant="ghost"
  //         onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
  //       >
  //         F. proxima cuota
  //         <ArrowUpDown className="ml-2 h-4 w-4" />
  //       </Button>
  //     );
  //   },
  //   cell: ({ row }) => {
  //     const remainingInstallments = row.original.remainingInstallments;
  //     return (
  //       <div className="text-center max-w-[80%]">{remainingInstallments}</div>
  //     );
  //   },
  // },
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
      const totalInterestPaid = value.payments.reduce((sum, payment) => sum + payment.interestAmount, 0);
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
      const totalInterestPaid = row.original.payments.reduce((sum, payment) => sum + payment.interestAmount, 0);
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
        <div className="">
          <Link
            className={buttonVariants()}
            href={`/dashboard/prestamos/gestionar/${row.original.id}`}
          >
            <Eye className="w-4 h-4" />
          </Link>
        </div>
      );
    },
  },
];
