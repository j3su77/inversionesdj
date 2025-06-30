import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ loanId: string }> }
) {
  try {
    const { loanId } = await params
    const body = await req.json()

    const loan = await prisma.loan.update({
      where: {
        id: loanId,
      },
      data: {
        ...body,
      },
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