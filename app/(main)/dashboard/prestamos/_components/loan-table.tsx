"use client"

import { useRouter } from "next/navigation"
import { Loan } from "@prisma/client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface LoanTableProps {
  loans: (Loan & {
    client: {
      fullName: string
      identification: number
      phone: string | null
      cellphone: string | null
    }
    _count: {
      payments: number
    }
  })[]
}

const getLoanStatusColor = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-green-500"
    case "COMPLETED":
      return "bg-blue-500"
    case "DEFAULTED":
      return "bg-red-500"
    case "PENDING":
      return "bg-yellow-500"
    default:
      return "bg-gray-500"
  }
}

const getLoanStatusText = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "Activo"
    case "COMPLETED":
      return "Pagado"
    case "DEFAULTED":
      return "En mora"
    case "PENDING":
      return "Pendiente"
    default:
      return status
  }
}

export function LoanTable({ loans }: LoanTableProps) {
  const router = useRouter()

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Monto Total</TableHead>
            <TableHead>Saldo</TableHead>
            <TableHead>Cuotas</TableHead>
            <TableHead>Próximo Pago</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow key={loan.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{loan.client.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    CI: {loan.client.identification}
                  </p>
                </div>
              </TableCell>
              <TableCell>{formatCurrency({ value: loan.totalAmount })}</TableCell>
              <TableCell>{formatCurrency({ value: loan.balance })}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <p>Pagadas: {loan._count.payments}</p>
                  <p>Restantes: {loan.remainingInstallments}</p>
                </div>
              </TableCell>
              <TableCell>
                {loan.nextPaymentDate ? (
                  format(new Date(loan.nextPaymentDate), "PPP", { locale: es })
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                <Badge className={getLoanStatusColor(loan.status)}>
                  {getLoanStatusText(loan.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/dashboard/prestamos/gestionar/${loan.id}`)}
                  >
                    Gestionar
                  </Button>
                  {loan.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/prestamos/gestionar/${loan.id}/registrar-pago`)}
                    >
                      Pagar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {loans.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No hay préstamos para mostrar
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
} 