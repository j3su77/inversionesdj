import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLoanAuditLog } from "@/lib/loan-audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ loanId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { loanId } = await params;
    const body = await req.json();
    const reason =
      typeof body.reason === "string" ? body.reason.trim() : "";

    if (reason.length < 10) {
      return NextResponse.json(
        {
          message:
            "Describe el acuerdo con el cliente (mínimo 10 caracteres).",
        },
        { status: 400 },
      );
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        status: true,
        balance: true,
        loanNumber: true,
        notes: true,
        payments: {
          orderBy: { installmentNumber: "desc" },
          take: 1,
          select: { installmentNumber: true },
        },
      },
    });

    if (!loan) {
      return NextResponse.json(
        { message: "Préstamo no encontrado" },
        { status: 404 },
      );
    }

    if (loan.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Solo se pueden finalizar préstamos activos" },
        { status: 400 },
      );
    }

    if (loan.balance <= 0) {
      return NextResponse.json(
        { message: "El préstamo no tiene saldo pendiente" },
        { status: 400 },
      );
    }

    const forgivenBalance = loan.balance;
    const lastInstallment = loan.payments[0]?.installmentNumber ?? 0;
    const closureNote = `[Cierre por acuerdo ${new Date().toISOString().slice(0, 10)}] Saldo condonado: ${forgivenBalance.toFixed(2)}. ${reason}`;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          loanId,
          paymentDate: new Date(),
          amount: 0,
          capitalAmount: 0,
          interestAmount: 0,
          pendingInterest: 0,
          installmentNumber: lastInstallment + 1,
          notes: closureNote,
          createdBy: session.user!.id,
        },
      });

      return tx.loan.update({
        where: { id: loanId },
        data: {
          status: "COMPLETED",
          balance: 0,
          remainingInstallments: 0,
          nextPaymentDate: null,
          currentInstallmentAmount: 0,
          pendingInterest: 0,
          notes: loan.notes
            ? `${loan.notes}\n\n${closureNote}`
            : closureNote,
        },
      });
    });

    await createLoanAuditLog({
      loanId,
      action: "STATUS_CHANGED",
      description: `Préstamo finalizado por acuerdo. Saldo condonado: ${forgivenBalance}`,
      oldData: {
        status: loan.status,
        balance: forgivenBalance,
      },
      newData: {
        status: updated.status,
        balance: updated.balance,
        reason,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[LOAN_COMPLETE_BY_AGREEMENT]", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
