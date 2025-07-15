import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { expenseId } = await params;
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

    // Obtener el gasto con sus cuentas asociadas
    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      include: {
        expenseAccounts: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!expense) {
      return new NextResponse("Expense not found", { status: 404 });
    }

    if (!expense.isActive) {
      return new NextResponse("Expense is already deleted", { status: 400 });
    }

    // Usar transacción para eliminar el gasto y devolver el dinero a las cuentas
    const result = await db.$transaction(async (tx) => {
      // 1. Marcar el gasto como inactivo
      const deletedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          isActive: false,
          notes: reason 
            ? `${expense.notes || ''} - Eliminado: ${reason} - ${user.username}`.trim()
            : `${expense.notes || ''} - Eliminado por ${user.username}`.trim(),
        },
      });

      // 2. Devolver el dinero a las cuentas
      for (const expenseAccount of expense.expenseAccounts) {
        await tx.account.update({
          where: { id: expenseAccount.accountId },
          data: {
            balance: {
              increment: expenseAccount.amount, // Sumar el dinero de vuelta
            },
          },
        });
      }

      return { action: "deleted", expense: deletedExpense };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[DELETE_EXPENSE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 