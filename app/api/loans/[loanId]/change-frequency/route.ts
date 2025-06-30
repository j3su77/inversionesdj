import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addDays, addMonths, addWeeks } from "date-fns"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ loanId: string }> }
) {
  try {
    const { loanId } = await params
    const body = await req.json()
    const { newFrequency, effectiveDate, reason, changedBy } = body

    // Obtener el préstamo actual
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      select: {
        paymentFrequency: true,
        remainingInstallments: true,
        balance: true,
        feeAmount: true,
        endDate: true,
        status: true,
      },
    })

    if (!loan) {
      return new NextResponse("Préstamo no encontrado", { status: 404 })
    }

    if (loan.status !== "ACTIVE") {
      return new NextResponse(
        "Solo se puede cambiar la frecuencia de préstamos activos",
        { status: 400 }
      )
    }

    // Calcular nueva fecha de finalización
    let newEndDate = new Date(effectiveDate)
    const remainingBalance = loan.balance
    const newFeeAmount = remainingBalance / loan.remainingInstallments

    // Calcular nueva fecha de finalización basada en la frecuencia
    switch (newFrequency) {
      case "DAILY":
        newEndDate = addDays(newEndDate, loan.remainingInstallments)
        break
      case "WEEKLY":
        newEndDate = addWeeks(newEndDate, loan.remainingInstallments)
        break
      case "BIWEEKLY":
        newEndDate = addDays(newEndDate, loan.remainingInstallments * 15)
        break
      case "MONTHLY":
        newEndDate = addMonths(newEndDate, loan.remainingInstallments)
        break
    }

    // Actualizar el préstamo y registrar el cambio en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Registrar el cambio de frecuencia
      const frequencyChange = await tx.paymentFrequencyChange.create({
        data: {
          loanId,
          previousFrequency: loan.paymentFrequency,
          newFrequency,
          effectiveDate: new Date(effectiveDate),
          reason,
          previousEndDate: loan.endDate,
          newEndDate,
          previousFeeAmount: loan.feeAmount,
          newFeeAmount,
          changedBy,
        },
      })

      // 2. Actualizar el préstamo
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          paymentFrequency: newFrequency,
          endDate: newEndDate,
          feeAmount: newFeeAmount,
          updatedAt: new Date(),
        },
      })

      return { frequencyChange, updatedLoan }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[CHANGE_FREQUENCY_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 