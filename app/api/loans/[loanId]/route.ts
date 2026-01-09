import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createLoanAuditLog } from "@/lib/loan-audit"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ loanId: string }> }
) {
  try {
    const { loanId } = await params
    const body = await req.json()

    // Obtener el préstamo actual antes de actualizarlo para auditoría
    const currentLoan = await prisma.loan.findUnique({
      where: { id: loanId },
    })

    if (!currentLoan) {
      return new NextResponse("Préstamo no encontrado", { status: 404 })
    }

    // Si se está actualizando el totalAmount, necesitamos recalcular el balance
    if (body.totalAmount !== undefined) {
      // Obtener pagos para calcular el capital pagado
      const loanWithPayments = await prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          payments: {
            select: {
              capitalAmount: true,
            },
          },
        },
      })

      if (!loanWithPayments) {
        return new NextResponse("Préstamo no encontrado", { status: 404 })
      }

      // Calcular el total de capital pagado
      const totalCapitalPaid = loanWithPayments.payments.reduce(
        (sum, payment) => sum + payment.capitalAmount,
        0
      )

      // Calcular el nuevo balance: totalAmount - capital pagado
      const newBalance = Math.max(0, body.totalAmount - totalCapitalPaid)

      // Actualizar el préstamo con el nuevo totalAmount y balance recalculado
      const loan = await prisma.loan.update({
        where: {
          id: loanId,
        },
        data: {
          ...body,
          balance: newBalance,
          // Si el nuevo balance es 0, actualizar el estado a COMPLETED
          ...(newBalance <= 0 && { status: "COMPLETED" }),
        },
      })

      // Registrar auditoría de actualización
      await createLoanAuditLog({
        loanId,
        action: "UPDATED",
        description: "Préstamo actualizado",
        oldData: {
          totalAmount: currentLoan.totalAmount,
          balance: currentLoan.balance,
          status: currentLoan.status,
          interestRate: currentLoan.interestRate,
          installments: currentLoan.installments,
          paymentFrequency: currentLoan.paymentFrequency,
          interestType: currentLoan.interestType,
        },
        newData: {
          totalAmount: loan.totalAmount,
          balance: loan.balance,
          status: loan.status,
          interestRate: loan.interestRate,
          installments: loan.installments,
          paymentFrequency: loan.paymentFrequency,
          interestType: loan.interestType,
        },
      })

      return NextResponse.json(loan)
    } else {
      // Si no se actualiza totalAmount, actualizar normalmente
      const loan = await prisma.loan.update({
        where: {
          id: loanId,
        },
        data: {
          ...body,
        },
      })

      // Registrar auditoría de actualización
      await createLoanAuditLog({
        loanId,
        action: "UPDATED",
        description: "Préstamo actualizado",
        oldData: {
          totalAmount: currentLoan.totalAmount,
          balance: currentLoan.balance,
          status: currentLoan.status,
          interestRate: currentLoan.interestRate,
          installments: currentLoan.installments,
          paymentFrequency: currentLoan.paymentFrequency,
          interestType: currentLoan.interestType,
        },
        newData: {
          totalAmount: loan.totalAmount,
          balance: loan.balance,
          status: loan.status,
          interestRate: loan.interestRate,
          installments: loan.installments,
          paymentFrequency: loan.paymentFrequency,
          interestType: loan.interestType,
        },
      })

      return NextResponse.json(loan)
    }
  } catch (error) {
    console.error("[LOAN_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ loanId: string }> }
) {
  try {
    const { loanId } = await params

    const loan = await prisma.loan.delete({
      where: {
        id: loanId,
      },
    })

    return NextResponse.json(loan)
  } catch (error) {
    console.error("[LOAN_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ loanId: string }> }
) {
  try {
    const { loanId } = await params

    const loan = await prisma.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        client: {
          select: {
            fullName: true,
            identification: true,
            phone: true,
            cellphone: true,
          },
        },
      },
    })

    if (!loan) {
      return new NextResponse("Préstamo no encontrado", { status: 404 })
    }

    return NextResponse.json(loan)
  } catch (error) {
    console.error("[LOAN_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 