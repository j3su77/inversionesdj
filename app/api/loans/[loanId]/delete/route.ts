import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createLoanAuditLog } from "@/lib/loan-audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ loanId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { loanId } = await params;
    const { password, reason } = await req.json();

    if (!password) {
      return new NextResponse("Password is required", { status: 400 });
    }

    // Verificar la contraseña del usuario
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, username: true },
    });

    if (!user || !user.password) {
      return new NextResponse("User not found", { status: 404 });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    
    if (!isValidPassword) {
      return new NextResponse("Invalid password", { status: 401 });
    }

    // Obtener el préstamo
    const loan = await db.loan.findUnique({
      where: { id: loanId },
      include: {
        client: { select: { fullName: true } },
        payments: true,
      },
    });

    if (!loan) {
      return new NextResponse("Loan not found", { status: 404 });
    }

    if (loan.status === "COMPLETED") {
      return new NextResponse("Cannot delete a completed loan", { status: 400 });
    }

    if (loan.status === "CANCELLED") {
      return new NextResponse("Loan is already cancelled", { status: 400 });
    }

    // Verificar si el préstamo tiene pagos
    // Comentado: Ahora siempre cancelamos en lugar de eliminar
    // if (loan.payments.length > 0) {
    //   return new NextResponse("Cannot delete a loan with payments. Use cancel instead.", { status: 400 });
    // }

    // Usar transacción para cancelar el préstamo
    const result = await db.$transaction(async (tx) => {
      // Siempre cancelar el préstamo en lugar de eliminarlo
      // Esto mantiene el registro para auditoría y trazabilidad
      const cancelledLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          status: "CANCELLED",
          nextPaymentDate: null,
          currentInstallmentAmount: 0,
          notes: reason ? `${reason} - ${user.username}` : `Préstamo cancelado por ${user.username}`,
        },
      });

      return { action: "cancelled", loan: cancelledLoan };
    });

    // Registrar auditoría de cancelación
    await createLoanAuditLog({
      loanId,
      action: "CANCELLED",
      description: `Préstamo cancelado. Razón: ${reason || "Sin razón especificada"}`,
      oldData: {
        status: loan.status,
        balance: loan.balance,
      },
      newData: {
        status: result.loan.status,
        balance: result.loan.balance,
        notes: result.loan.notes,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[DELETE_LOAN]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 