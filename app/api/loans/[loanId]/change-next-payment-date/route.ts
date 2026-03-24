import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLoanAuditLog } from "@/lib/loan-audit";
import { startOfDay } from "date-fns";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ loanId: string }> },
) {
  try {
    const { loanId } = await params;
    const body = await req.json();
    const { nextPaymentDate: nextPaymentDateRaw, reason } = body as {
      nextPaymentDate?: string;
      reason?: string;
    };

    const reasonTrim = typeof reason === "string" ? reason.trim() : "";
    if (reasonTrim.length < 10) {
      return NextResponse.json(
        { message: "La razón debe tener al menos 10 caracteres" },
        { status: 400 },
      );
    }

    if (!nextPaymentDateRaw) {
      return NextResponse.json(
        { message: "La fecha del próximo pago es requerida" },
        { status: 400 },
      );
    }

    const parsed = new Date(nextPaymentDateRaw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ message: "Fecha inválida" }, { status: 400 });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        status: true,
        nextPaymentDate: true,
        loanNumber: true,
      },
    });

    if (!loan) {
      return new NextResponse("Préstamo no encontrado", { status: 404 });
    }

    if (loan.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Solo se puede ajustar en préstamos activos" },
        { status: 400 },
      );
    }

    const newDate = startOfDay(parsed);

    const updated = await prisma.loan.update({
      where: { id: loanId },
      data: {
        nextPaymentDate: newDate,
      },
    });

    await createLoanAuditLog({
      loanId,
      action: "NEXT_PAYMENT_DATE_CHANGED",
      description: `Ajuste manual de la fecha del próximo pago (préstamo ${loan.loanNumber}). Motivo: ${reasonTrim}`,
      oldData: {
        nextPaymentDate: loan.nextPaymentDate?.toISOString() ?? null,
      },
      newData: {
        nextPaymentDate: newDate.toISOString(),
        reason: reasonTrim,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[CHANGE_NEXT_PAYMENT_DATE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
