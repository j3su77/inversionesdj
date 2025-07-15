import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { accountId } = await params;
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

    // Obtener la cuenta con sus relaciones
    const account = await db.account.findUnique({
      where: { id: accountId },
      include: {
        loanAccounts: {
          include: {
            loan: {
              select: {
                id: true,
                loanNumber: true,
                status: true,
              },
            },
          },
        },
        expenseAccounts: {
          include: {
            expense: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!account) {
      return new NextResponse("Account not found", { status: 404 });
    }

    if (!account.isActive) {
      return new NextResponse("Account is already deleted", { status: 400 });
    }

    // Verificar si la cuenta tiene préstamos asociados
    const activeLoans = account.loanAccounts.filter(
      (loanAccount) => loanAccount.loan.status === "ACTIVE"
    );

    if (activeLoans.length > 0) {
      return new NextResponse(
        "Cannot delete account with active loans. Please complete or cancel the loans first.",
        { status: 400 }
      );
    }

    // Verificar si la cuenta tiene gastos activos asociados
    const activeExpenses = account.expenseAccounts.filter(
      (expenseAccount) => expenseAccount.expense.isActive
    );

    if (activeExpenses.length > 0) {
      return new NextResponse(
        "Cannot delete account with active expenses. Please delete the expenses first.",
        { status: 400 }
      );
    }

    // Eliminar la cuenta (soft delete)
    const deletedAccount = await db.account.update({
      where: { id: accountId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        description: reason 
          ? `${account.description || ''} - Eliminada: ${reason} - ${user.username}`.trim()
          : `${account.description || ''} - Eliminada por ${user.username}`.trim(),
      },
    });

    return NextResponse.json({ 
      action: "deleted", 
      account: deletedAccount 
    });
  } catch (error) {
    console.error("[DELETE_ACCOUNT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 