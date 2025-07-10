import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LoanStatus } from "@prisma/client";

interface AccountSelection {
  accountId: string;
  amount: number;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ loanId: string }> }
) {
  try {
    const { loanId } = await params;
    const body = await req.json();
    console.log({ body });
    const {
      paymentDate,
      nextPaymentDate,
      notes,
      capitalAmount,
      interestAmount,
      accounts,
    }: {
      paymentDate: string;
      nextPaymentDate: string;
      notes?: string;
      capitalAmount: number;
      interestAmount: number;
      accounts: AccountSelection[];
    } = body;

    // Validar que se hayan proporcionado cuentas
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return new NextResponse("Debe seleccionar al menos una cuenta de destino", { status: 400 });
    }

    // Validar que el total de las cuentas coincida con el monto del pago
    const totalAccountAmount = accounts.reduce((sum: number, acc: AccountSelection) => sum + acc.amount, 0);
    const expectedAmount = capitalAmount + interestAmount;
    
    if (Math.abs(totalAccountAmount - expectedAmount) > 2.0) {
      return new NextResponse("El total asignado a las cuentas debe coincidir con el monto del pago (tolerancia de ±2 pesos)", { status: 400 });
    }

    // Verificar que todas las cuentas existan y tengan saldo suficiente
    const accountIds = accounts.map((acc: AccountSelection) => acc.accountId);
    const accountsData = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        isActive: true,
      },
    });

    if (accountsData.length !== accountIds.length) {
      return new NextResponse("Una o más cuentas no existen o están inactivas", { status: 400 });
    }

    // Validar saldos suficientes
    for (const accountSelection of accounts) {
      const accountData = accountsData.find(acc => acc.id === accountSelection.accountId);
      if (!accountData || accountData.balance < accountSelection.amount) {
        return new NextResponse(`Saldo insuficiente en la cuenta ${accountData?.name || 'desconocida'}`, { status: 400 });
      }
    }

    // Obtener el préstamo actual y sus pagos
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      select: {
        balance: true,
        remainingInstallments: true,
        status: true,
        totalAmount: true,
        installments: true,
        feeAmount: true,
        fixedInterestAmount: true,
        interestType: true,
        interestRate: true,
        currentInstallmentAmount: true,
        payments: {
          orderBy: {
            installmentNumber: "desc",
          },
          take: 1,
          select: {
            installmentNumber: true,
          },
        },
        pendingInterest: true,
      },
    });

    if (!loan) {
      return new NextResponse("Préstamo no encontrado", { status: 404 });
    }

    if (loan.status !== "ACTIVE") {
      return new NextResponse(
        "Solo se pueden registrar pagos en préstamos activos",
        { status: 400 }
      );
    }

    if (loan.balance <= 0) {
      return new NextResponse(
        "No se pueden registrar pagos en préstamos sin saldo pendiente",
        { status: 400 }
      );
    }

    // Calcular el interés de la cuota actual (incluye interés pendiente acumulado)
    let currentInterest = 0;
    if (loan.interestType === "FIXED") {
      currentInterest =
        (loan.fixedInterestAmount || 0) + (loan.pendingInterest || 0);
    } else {
      currentInterest =
        loan.balance * (loan.interestRate / 100) + (loan.pendingInterest || 0);
    }

    // Usar directamente los montos proporcionados por el frontend
    let finalCapitalAmount = capitalAmount || 0;
    const finalInterestAmount = interestAmount || 0;

    // Validar que el capital a pagar no sea mayor al saldo pendiente
    if (finalCapitalAmount > loan.balance) {
      finalCapitalAmount = loan.balance;
    }

    // Si el pago está muy cerca del saldo total (diferencia <= 2 pesos), pagar el saldo completo
    if (Math.abs(finalCapitalAmount - loan.balance) <= 2 && finalCapitalAmount >= loan.balance - 2) {
      finalCapitalAmount = loan.balance;
    }

    // Calcular el interés pendiente
    const pendingInterest = Math.max(0, currentInterest - finalInterestAmount);

    // Acumular el interés pendiente
    let newPendingInterest = 0;
    if (pendingInterest > 0) {
      newPendingInterest = pendingInterest;
    }

    // Calcular nuevo saldo
    const newBalance = Math.max(0, loan.balance - finalCapitalAmount);

    // Si el nuevo saldo es menor a 2 pesos, considerarlo como 0 (saldado)
    const adjustedNewBalance = newBalance <= 2 ? 0 : newBalance;
    
    // Si ajustamos el saldo a 0, también ajustar el capital pagado
    if (newBalance <= 2 && newBalance > 0) {
      finalCapitalAmount = loan.balance;
    }

    // Calcular el monto de la próxima cuota (incluye pendientes)
    const baseCapitalAmount = loan.totalAmount / loan.installments;
    const nextInterest =
      loan.interestType === "FIXED"
        ? loan.fixedInterestAmount || 0
        : adjustedNewBalance * (loan.interestRate / 100);
    const nextInstallmentAmount =
      baseCapitalAmount + nextInterest + newPendingInterest;

    // Determinar el nuevo estado del préstamo
    let newStatus: LoanStatus = loan.status;
    if (adjustedNewBalance <= 0) {
      newStatus = "COMPLETED";
    }

    // Calcular el número de cuota - Ahora siempre incrementa
    const lastPayment = loan.payments[0];
    const installmentNumber = (lastPayment?.installmentNumber || 0) + 1;

    // Registrar el pago y actualizar el préstamo en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Registrar el pago
      const payment = await tx.payment.create({
        data: {
          loanId,
          paymentDate: new Date(paymentDate),
          amount: finalCapitalAmount + finalInterestAmount,
          capitalAmount: finalCapitalAmount,
          interestAmount: finalInterestAmount,
          notes,
          installmentNumber,
        },
      });

      // 2. Actualizar los saldos de las cuentas
      for (const accountSelection of accounts) {
        await tx.account.update({
          where: { id: accountSelection.accountId },
          data: {
            balance: {
              increment: accountSelection.amount,
            },
          },
        });
      }

      // 3. Actualizar el préstamo
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          balance: adjustedNewBalance,
          remainingInstallments: adjustedNewBalance > 0 ? Math.max(0, loan.remainingInstallments - 1) : 0,
          lastPaymentDate: new Date(paymentDate),
          nextPaymentDate: adjustedNewBalance > 0 ? new Date(nextPaymentDate) : null,
          currentInstallmentAmount: adjustedNewBalance > 0 ? nextInstallmentAmount : 0,
          pendingInterest: newPendingInterest,
          status: newStatus,
        },
      });

      return { payment, updatedLoan };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[PAYMENT_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
