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
      amount,
      notes,
      splitPayment,
      capitalAmount,
      interestAmount,
      accounts,
    }: {
      paymentDate: string;
      amount: number;
      notes?: string;
      splitPayment: boolean;
      capitalAmount?: number;
      interestAmount?: number;
      accounts: AccountSelection[];
    } = body;

    // Validar que se hayan proporcionado cuentas
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return new NextResponse("Debe seleccionar al menos una cuenta de destino", { status: 400 });
    }

    // Validar que el total de las cuentas coincida con el monto del pago
    const totalAccountAmount = accounts.reduce((sum: number, acc: AccountSelection) => sum + acc.amount, 0);
    const expectedAmount = splitPayment ? (capitalAmount || 0) + (interestAmount || 0) : amount;
    
    if (Math.abs(totalAccountAmount - expectedAmount) > 0.01) {
      return new NextResponse("El total asignado a las cuentas debe coincidir con el monto del pago", { status: 400 });
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

    // Obtener el monto total requerido para la cuota actual
    const requiredAmount =
      loan.currentInstallmentAmount || loan.feeAmount + currentInterest;

    // Determinar si es un pago parcial
    const isPartialPayment = amount < requiredAmount;

    // Calcular el capital base de la cuota
    const baseCapitalAmount = loan.totalAmount / loan.installments;

    // Calcular montos de capital e interés
    let finalCapitalAmount = 0;
    let finalInterestAmount = 0;
    let pendingInterest = 0;

    if (splitPayment) {
      finalCapitalAmount = capitalAmount || 0;
      finalInterestAmount = interestAmount || 0;
      pendingInterest = currentInterest - finalInterestAmount;
    } else {
      if (isPartialPayment) {
        finalInterestAmount = Math.min(amount, currentInterest);
        finalCapitalAmount =
          amount > currentInterest
            ? Math.min(amount - currentInterest, baseCapitalAmount)
            : 0;
        pendingInterest = currentInterest - finalInterestAmount;
      } else {
        finalInterestAmount = currentInterest;
        finalCapitalAmount = baseCapitalAmount;
      }
    }

    // Validar que el capital a pagar no sea mayor al saldo pendiente
    if (finalCapitalAmount > loan.balance) {
      finalCapitalAmount = loan.balance;
    }

    // Acumular el interés pendiente
    let newPendingInterest = loan.pendingInterest || 0;
    if (pendingInterest > 0) {
      newPendingInterest += pendingInterest;
    } else if (pendingInterest <= 0) {
      // Si se pagó todo el interés pendiente, limpiar
      newPendingInterest = 0;
    }

    // Calcular nuevo saldo
    const newBalance = loan.balance - finalCapitalAmount;

    // Calcular el monto de la próxima cuota (incluye pendientes)
    // const nextInstallmentAmount;
    const nextInterest =
      loan.interestType === "FIXED"
        ? loan.fixedInterestAmount || 0
        : newBalance * (loan.interestRate / 100);
    const nextInstallmentAmount =
      baseCapitalAmount + nextInterest + newPendingInterest;

    // Determinar el nuevo estado del préstamo
    let newStatus: LoanStatus = loan.status;
    if (newBalance <= 0) {
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
          balance: newBalance,
          remainingInstallments: loan.remainingInstallments,
          lastPaymentDate: new Date(paymentDate),
          currentInstallmentAmount: nextInstallmentAmount,
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
