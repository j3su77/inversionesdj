import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LoanStatus } from "@prisma/client";

// interface AccountSelection {
//   accountId: string;
//   amount: number;
// }

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
      notes,
      capitalAmount,
      interestAmount,
      // accounts,
    }: {
      paymentDate: string;
      notes?: string;
      capitalAmount: number;
      interestAmount: number;
      // accounts: AccountSelection[];
    } = body;

    // Validar que se hayan proporcionado cuentas
    // if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
    //   return new NextResponse("Debe seleccionar al menos una cuenta de destino", { status: 400 });
    // }

    // Validar que el total de las cuentas coincida con el monto del pago
    // const totalAccountAmount = accounts.reduce((sum: number, acc: AccountSelection) => sum + acc.amount, 0);
    // const expectedAmount = capitalAmount + interestAmount;
    
    // if (Math.abs(totalAccountAmount - expectedAmount) > 2.0) {
    //   return new NextResponse("El total asignado a las cuentas debe coincidir con el monto del pago (tolerancia de ±2 pesos)", { status: 400 });
    // }

    // Verificar que todas las cuentas existan y tengan saldo suficiente
    // const accountIds = accounts.map((acc: AccountSelection) => acc.accountId);
    // const accountsData = await prisma.account.findMany({
    //   where: {
    //     id: { in: accountIds },
    //     isActive: true,
    //   },
    // });

    // if (accountsData.length !== accountIds.length) {
    //   return new NextResponse("Una o más cuentas no existen o están inactivas", { status: 400 });
    // }

    // Validar saldos suficientes
    // for (const accountSelection of accounts) {
    //   const accountData = accountsData.find(acc => acc.id === accountSelection.accountId);
    //   if (!accountData || accountData.balance < accountSelection.amount) {
    //     return new NextResponse(`Saldo insuficiente en la cuenta ${accountData?.name || 'desconocida'}`, { status: 400 });
    //   }
    // }

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
        paymentFrequency: true,
        currentInstallmentAmount: true,
        startDate: true,
        nextPaymentDate: true, // Necesitamos la fecha programada original
        payments: {
          orderBy: {
            installmentNumber: "desc",
          },
          take: 1,
          select: {
            installmentNumber: true,
            paymentDate: true,
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

    // Función auxiliar para calcular los días del período programado basado en la frecuencia
    // Para pagos diarios, semanales y quincenales: usar 30 días como base fija
    // Para pagos mensuales y trimestrales: calcular días reales entre fechas programadas
    const getDaysInPeriod = (
      referenceDate: Date,
      paymentFrequency: string
    ): number => {
      // Para pagos diarios, semanales y quincenales, usar 30 días como base
      if (paymentFrequency === "DAILY" || paymentFrequency === "WEEKLY" || paymentFrequency === "BIWEEKLY") {
        return 30;
      }
      
      // Para pagos mensuales y trimestrales, calcular días reales
      const normalizedRef = new Date(referenceDate);
      normalizedRef.setHours(0, 0, 0, 0);
      
      // Calcular la fecha del próximo pago programado según la frecuencia
      const nextProgrammedDate = new Date(normalizedRef);
      
      switch (paymentFrequency) {
        case "MONTHLY":
          // Mantener el mismo día del mes (ej: 15 de enero -> 15 de febrero)
          nextProgrammedDate.setMonth(nextProgrammedDate.getMonth() + 1);
          break;
        case "QUARTERLY":
          nextProgrammedDate.setMonth(nextProgrammedDate.getMonth() + 3);
          break;
        default:
          nextProgrammedDate.setMonth(nextProgrammedDate.getMonth() + 1);
      }
      
      // Calcular los días reales entre las fechas
      const daysDiff = Math.floor(
        (nextProgrammedDate.getTime() - normalizedRef.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return Math.max(1, daysDiff);
    };

    // Función para calcular el interés según días transcurridos
    // Interés mensual = monto * tasa / 100
    // Interés para el período = interés mensual * (días transcurridos / días del período programado)
    const calculateInterestByDays = (
      amount: number,
      interestRate: number,
      daysElapsed: number,
      daysInPeriod: number
    ): number => {
      const monthlyInterest = amount * (interestRate / 100);
      // Calcular el interés proporcional basado en los días reales del período
      return (monthlyInterest / daysInPeriod) * daysElapsed;
    };

    // Obtener el último pago para calcular el número de cuota
    const lastPayment = loan.payments[0];

    // Usar directamente los montos proporcionados por el frontend
    // (El frontend calcula el interés basado en días transcurridos)
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

    // Ya no hay interés pendiente acumulado, se calcula por días transcurridos
    const newPendingInterest = 0;

    // Calcular nuevo saldo
    const newBalance = Math.max(0, loan.balance - finalCapitalAmount);

    // Si el nuevo saldo es menor a 2 pesos, considerarlo como 0 (saldado)
    const adjustedNewBalance = newBalance <= 2 ? 0 : newBalance;
    
    // Si ajustamos el saldo a 0, también ajustar el capital pagado
    if (newBalance <= 2 && newBalance > 0) {
      finalCapitalAmount = loan.balance;
    }

    // Calcular el monto de la próxima cuota
    // El interés se calculará dinámicamente según los días transcurridos cuando se registre el próximo pago
    const baseCapitalAmount = loan.totalAmount / loan.installments;
    
    // Calcular la fecha base para el próximo período (fecha programada o fecha de pago actual)
    const baseDateForNextPeriod = loan.nextPaymentDate 
      ? new Date(loan.nextPaymentDate) 
      : new Date(paymentDate);
    
    // Calcular los días reales del período programado basado en la frecuencia
    const daysInPeriod = getDaysInPeriod(baseDateForNextPeriod, loan.paymentFrequency);
    
    // Calcular el interés estimado para la próxima cuota usando días reales del período
    const nextInterest =
      loan.interestType === "FIXED"
        ? calculateInterestByDays(loan.totalAmount, loan.interestRate, daysInPeriod, daysInPeriod)
        : calculateInterestByDays(adjustedNewBalance, loan.interestRate, daysInPeriod, daysInPeriod);
    
    const nextInstallmentAmount = baseCapitalAmount + nextInterest;

    // Determinar el nuevo estado del préstamo
    let newStatus: LoanStatus = loan.status;
    if (adjustedNewBalance <= 0) {
      newStatus = "COMPLETED";
    }

    // Calcular el número de cuota - Ahora siempre incrementa
    const installmentNumber = (lastPayment?.installmentNumber || 0) + 1;

    // Calcular la próxima fecha de pago basada en la fecha programada original
    // Si el pago se retrasa, la próxima fecha debe calcularse desde la fecha programada, no desde la fecha de pago real
    let calculatedNextPaymentDate: Date | null = null;
    if (adjustedNewBalance > 0) {
      // Usar la fecha programada original (nextPaymentDate del préstamo) si existe
      // Si no existe, usar la fecha de pago proporcionada
      const baseDate = loan.nextPaymentDate 
        ? new Date(loan.nextPaymentDate) 
        : new Date(paymentDate);
      
      // Calcular la próxima fecha de pago manteniendo el mismo día del mes para pagos mensuales
      calculatedNextPaymentDate = new Date(baseDate);
      
      switch (loan.paymentFrequency) {
        case "DAILY":
          calculatedNextPaymentDate.setDate(calculatedNextPaymentDate.getDate() + 1);
          break;
        case "WEEKLY":
          calculatedNextPaymentDate.setDate(calculatedNextPaymentDate.getDate() + 7);
          break;
        case "BIWEEKLY":
          calculatedNextPaymentDate.setDate(calculatedNextPaymentDate.getDate() + 15);
          break;
        case "MONTHLY":
          // Mantener el mismo día del mes (ej: 15 de enero -> 15 de febrero)
          calculatedNextPaymentDate.setMonth(calculatedNextPaymentDate.getMonth() + 1);
          break;
        case "QUARTERLY":
          calculatedNextPaymentDate.setMonth(calculatedNextPaymentDate.getMonth() + 3);
          break;
        default:
          calculatedNextPaymentDate.setMonth(calculatedNextPaymentDate.getMonth() + 1);
      }
    }

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
      // for (const accountSelection of accounts) {
      //   await tx.account.update({
      //     where: { id: accountSelection.accountId },
      //     data: {
      //       balance: {
      //         increment: accountSelection.amount,
      //       },
      //     },
      //   });
      // }

      // 3. Actualizar el préstamo
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          balance: adjustedNewBalance,
          remainingInstallments: adjustedNewBalance > 0 ? Math.max(0, loan.remainingInstallments - 1) : 0,
          lastPaymentDate: new Date(paymentDate),
          nextPaymentDate: calculatedNextPaymentDate,
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
