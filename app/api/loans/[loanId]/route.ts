import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ loanId: string }> }
) {
  try {
    const { loanId } = await params
    const body = await req.json()

    const {
      totalAmount,
      installments,
      interestRate,
      interestType,
      startDate,
      paymentFrequency,
      notes,
      coDebtor,
      productInfo,
      managedByUserId,
    } = body

    const data: Record<string, unknown> = {}
    if (totalAmount != null) data.totalAmount = totalAmount
    if (installments != null) data.installments = installments
    if (interestRate != null) data.interestRate = interestRate
    if (interestType != null) data.interestType = interestType
    if (startDate != null) data.startDate = new Date(startDate)
    if (paymentFrequency != null) data.paymentFrequency = paymentFrequency
    if (notes !== undefined) data.notes = notes
    if (coDebtor !== undefined) {
      const cd = coDebtor as { fullName?: string; identification?: string; position?: string; phone?: string } | null
      const isEmpty =
        cd == null ||
        (typeof cd === "object" &&
          [cd.fullName, cd.identification, cd.position, cd.phone].every((v) => v == null || String(v).trim() === ""))
      data.coDebtor = isEmpty ? null : cd
    }
    if (productInfo !== undefined) {
      const pi = productInfo as { productName?: string; supplierName?: string; cost?: number; paymentDate?: string } | null
      const hasContent =
        pi != null &&
        typeof pi === "object" &&
        (([pi.productName, pi.supplierName].some((v) => v != null && String(v).trim() !== "")) ||
          pi.cost != null ||
          (pi.paymentDate != null && String(pi.paymentDate).trim() !== ""))
      data.productInfo = hasContent ? pi : null
    }
    if (managedByUserId !== undefined) data.managedByUserId = managedByUserId ?? null

    const loan = await prisma.loan.update({
      where: {
        id: loanId,
      },
      data: data as Parameters<typeof prisma.loan.update>[0]["data"],
    })

    return NextResponse.json(loan)
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