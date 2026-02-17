import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LoanStatus } from "@prisma/client";
import { createLoanAuditLog } from "@/lib/loan-audit";

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
            pendingInterest: true,
          },
        },
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

    // Función para calcular el interés diario (igual que en el frontend)
    // Interés mensual = monto * tasa / 100
    // Interés diario = interés mensual / 30
    const calculateDailyInterest = (amount: number, interestRate: number): number => {
      const monthlyInterest = amount * (interestRate / 100);
      return monthlyInterest / 30;
    };

    // Función para calcular el interés según días transcurridos (igual que en el frontend)
    // Para mantener consistencia con el frontend, siempre dividimos entre 30 días
    const calculateInterestByDays = (
      amount: number,
      interestRate: number,
      days: number
    ): number => {
      const dailyInterest = calculateDailyInterest(amount, interestRate);
      return dailyInterest * days;
    };

    // Obtener el último pago para calcular el número de cuota
    const lastPayment = loan.payments[0];
    
    // Obtener el último pago completo con pendingInterest
    // Nota: pendingInterest se agregó al schema, regenerar Prisma Client si hay errores de tipo
    const lastPaymentFull = await prisma.payment.findFirst({
      where: { loanId },
      orderBy: { installmentNumber: "desc" },
    }) as { installmentNumber: number; paymentDate: Date; pendingInterest: number } | null;

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

    // Calcular el interés esperado basado en los días transcurridos
    const normalizeDate = (date: Date | string): Date => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const normalizedPaymentDate = normalizeDate(paymentDate);
    const referenceDate = lastPayment 
      ? normalizeDate(lastPayment.paymentDate)
      : normalizeDate(loan.startDate);
    
    // Calcular días para el cálculo de intereses
    // Método 30/360: Para préstamos mensuales y trimestrales, siempre usar 30 días por mes
    // Esto es estándar en créditos de consumo (no importa si el mes tiene 28, 30 o 31 días)
    let daysElapsed: number;
    if (loan.paymentFrequency === "MONTHLY" || loan.paymentFrequency === "QUARTERLY") {
      // Método 30/360: calcular meses completos × 30 + días proporcionales
      const year1 = referenceDate.getFullYear();
      const month1 = referenceDate.getMonth();
      const day1 = referenceDate.getDate();
      
      const year2 = normalizedPaymentDate.getFullYear();
      const month2 = normalizedPaymentDate.getMonth();
      const day2 = normalizedPaymentDate.getDate();
      
      // Calcular diferencia de meses completos
      const monthsDiff = (year2 - year1) * 12 + (month2 - month1);
      
      if (monthsDiff === 0) {
        // Mismo mes: usar días reales pero máximo 30
        daysElapsed = Math.min(30, Math.max(1, day2 - day1));
      } else {
        // Meses completos × 30 + días del mes inicial + días del mes final
        // Días del mes inicial: 30 - día1 (días restantes del mes)
        // Días del mes final: día2 (días transcurridos del mes)
        const daysFromStartMonth = 30 - day1;
        const daysFromEndMonth = day2;
        daysElapsed = (monthsDiff - 1) * 30 + daysFromStartMonth + daysFromEndMonth;
      }
      
      // Asegurar mínimo de 1 día
      daysElapsed = Math.max(1, daysElapsed);
    } else {
      // Para diarios, semanales y quincenales: usar días reales
      daysElapsed = Math.max(1, Math.floor(
        (normalizedPaymentDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
      ));
    }

    // Obtener el interés pendiente del último pago (si existe)
    const lastPaymentPendingInterest = lastPaymentFull?.pendingInterest || 0;

    // Calcular el interés esperado para este período usando el mismo método que el frontend
    // (base + pendiente del último pago)
    const baseExpectedInterest = loan.interestType === "FIXED"
      ? calculateInterestByDays(loan.totalAmount, loan.interestRate, daysElapsed)
      : calculateInterestByDays(loan.balance, loan.interestRate, daysElapsed);

    // El interés esperado total incluye el interés pendiente del último pago
    // Redondear para mantener consistencia con el frontend que usa Math.round()
    const expectedInterest = Math.round(baseExpectedInterest + lastPaymentPendingInterest);

    // Calcular la diferencia entre el interés esperado y el pagado
    // Si el interés pagado es menor al esperado, registrar la diferencia como pendiente de esta cuota
    const interestDifference = expectedInterest - finalInterestAmount;
    
    // El interés pendiente de esta cuota es la diferencia no pagada (no puede ser negativo)
    const paymentPendingInterest = Math.max(0, interestDifference);

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
    
    // Calcular los días del próximo período según la frecuencia
    // Método 30/360: Para préstamos mensuales y trimestrales, siempre usar 30 días por mes
    let daysInNextPeriod: number;
    switch (loan.paymentFrequency) {
      case "DAILY":
        daysInNextPeriod = 1;
        break;
      case "WEEKLY":
        daysInNextPeriod = 7;
        break;
      case "BIWEEKLY":
        daysInNextPeriod = 15;
        break;
      case "MONTHLY":
        // Método 30/360: siempre usar 30 días para meses
        daysInNextPeriod = 30;
        break;
      case "QUARTERLY":
        // Método 30/360: 3 meses × 30 días = 90 días
        daysInNextPeriod = 90;
        break;
      default:
        daysInNextPeriod = 30;
    }
    
    // Calcular el interés estimado para la próxima cuota usando el mismo método que el frontend
    const nextInterest =
      loan.interestType === "FIXED"
        ? Math.round(calculateInterestByDays(loan.totalAmount, loan.interestRate, daysInNextPeriod))
        : Math.round(calculateInterestByDays(adjustedNewBalance, loan.interestRate, daysInNextPeriod));
    
    const nextInstallmentAmount = baseCapitalAmount + nextInterest;

    // Determinar el nuevo estado del préstamo
    let newStatus: LoanStatus = loan.status;
    if (adjustedNewBalance <= 0) {
      newStatus = "COMPLETED";
    }

    // Calcular el número de cuota - Ahora siempre incrementa
    const installmentNumber = (lastPaymentFull?.installmentNumber || lastPayment?.installmentNumber || 0) + 1;

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
      // Nota: pendingInterest se agregó al schema, regenerar Prisma Client si hay errores de tipo
      const payment = await tx.payment.create({
        data: {
          loanId,
          paymentDate: new Date(paymentDate),
          amount: finalCapitalAmount + finalInterestAmount,
          capitalAmount: finalCapitalAmount,
          interestAmount: finalInterestAmount,
          pendingInterest: paymentPendingInterest, // Interés pendiente de esta cuota
          notes,
          installmentNumber,
        } as any,
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
      // Ya no usamos pendingInterest en el Loan, se maneja en cada Payment
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          balance: adjustedNewBalance,
          remainingInstallments: adjustedNewBalance > 0 ? Math.max(0, loan.remainingInstallments - 1) : 0,
          lastPaymentDate: new Date(paymentDate),
          nextPaymentDate: calculatedNextPaymentDate,
          currentInstallmentAmount: adjustedNewBalance > 0 ? nextInstallmentAmount : 0,
          pendingInterest: 0, // Ya no se usa, se mantiene en 0 para compatibilidad
          status: newStatus,
        },
      });

      return { payment, updatedLoan };
    });

    // Registrar auditoría de pago
    await createLoanAuditLog({
      loanId,
      action: "PAYMENT",
      description: `Pago registrado. Cuota #${result.payment.installmentNumber}. Capital: ${result.payment.capitalAmount}, Interés: ${result.payment.interestAmount}`,
      newData: {
        paymentId: result.payment.id,
        installmentNumber: result.payment.installmentNumber,
        capitalAmount: result.payment.capitalAmount,
        interestAmount: result.payment.interestAmount,
        pendingInterest: result.payment.pendingInterest,
        newBalance: result.updatedLoan.balance,
        newStatus: result.updatedLoan.status,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[PAYMENT_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
