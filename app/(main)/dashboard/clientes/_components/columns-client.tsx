"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  CircleDollarSign,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Client, Loan, LoanStatus } from "@prisma/client";
import Link from "next/link";
import { DeleteClientDialog } from "./delete-client-dialog";
import { ClientCreditHistoryPopover } from "./client-credit-history-popover";

export function createColumnsClient(
  onDeleted?: () => void
): ColumnDef<Client & { loans: Loan[] }>[] {
  return [
  {
    accessorKey: "fullName",

    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombre completo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <ClientCreditHistoryPopover client={row.original} />
    ),
  },
  {
    accessorKey: "identification",

    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          # documento
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "address",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Dirección
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "cellphone",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Celular
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "hasActiveLoan",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          prestamo activo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const hasActiveLoan = row.original.loans.some(
        (loan) => loan.status === LoanStatus.ACTIVE,
      );

      return <div>{hasActiveLoan ? <div>si</div> : <div>no</div>}</div>;
    },
  },
  {
    accessorKey: "loanCount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          # prestamos
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const loanCount = row.original.loans.length;

      return <div>{loanCount}</div>;
    },
  },
  {
    accessorKey: "actions",
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
            href={`/dashboard/clientes/editar/${row.original.id}`}
            className={buttonVariants()}
          >
            <Pencil className="w-6 h-6 text-white" />
          </Link>

          <Link
            className={buttonVariants()}
            href={`/dashboard/prestamos/registrar?clientId=${row.original.id}`}
          >
            <CircleDollarSign className="w-6 h-6 text-white" />
          </Link>

          <DeleteClientDialog
            client={row.original}
            onDeleted={onDeleted}
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
}
