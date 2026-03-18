import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createLoanAuditLog } from "@/lib/loan-audit"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ loanId: string }> }
) {
  try {
    const { loanId } = await params
    const body = await req.json()
    const { approvedBy } = body

    // Obtener el préstamo actual
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      select: {
        status: true,
      },
    })

    if (!loan) {
      return new NextResponse("Préstamo no encontrado", { status: 404 })
    }

    if (loan.status !== "PENDING") {
      return new NextResponse(
        "Solo se pueden aprobar préstamos en estado pendiente",
        { status: 400 }
      )
    }

    // Aprobar el préstamo
    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        status: "ACTIVE",
        approvedAt: new Date(),
        approvedBy,
      },
    })

    // Registrar auditoría de aprobación
    await createLoanAuditLog({
      loanId,
      action: "APPROVED",
      description: `Préstamo aprobado por ${approvedBy || "usuario"}`,
      oldData: { status: loan.status },
      newData: { status: updatedLoan.status, approvedAt: updatedLoan.approvedAt },
    })

    return NextResponse.json(updatedLoan)
  } catch (error) {
    console.error("[LOAN_APPROVE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 