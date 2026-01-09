import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, addMonths, addWeeks } from "date-fns";
import { createLoanAuditLog } from "@/lib/loan-audit";

// interface AccountSelection {
//     accountId: string;
//     amount: number;
// }

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      clientId,
      totalAmount,
      installments,
      interestRate,
      interestType,
      startDate,
      paymentFrequency,
      notes,
      // accounts,
    } = body;

    // Validar que se proporcionen cuentas
    // if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
    //     return NextResponse.json(
    //         { message: "Debe seleccionar al menos una cuenta" },
    //         { status: 400 }
    //     )
    // }

    // Validar que el total de las cuentas coincida con el monto del préstamo
    // const totalAssigned = accounts.reduce((sum: number, acc: AccountSelection) => sum + acc.amount, 0)
    // if (Math.abs(totalAssigned - totalAmount) > 0.01) {
    //     return NextResponse.json(
    //         { message: "El total asignado a las cuentas debe coincidir con el monto del préstamo" },
    //         { status: 400 }
    //     )
    // }

    // Normalizar la fecha de inicio para evitar problemas de zona horaria
    // Asegurarse de que la fecha se interprete correctamente (solo fecha, sin hora)
    const normalizedStartDate = new Date(startDate);
    normalizedStartDate.setHours(0, 0, 0, 0); // Establecer a medianoche para evitar problemas de zona horaria

    // Calcular la fecha de finalización basada en la frecuencia de pagos
    let endDate = new Date(normalizedStartDate);

    // Calcular la fecha del próximo pago basándose en la frecuencia
    let nextPaymentDate = new Date(normalizedStartDate);

    // El monto de la cuota base (capital) es el mismo para ambos tipos
    const baseFeeAmount = totalAmount / installments;

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

    // Calcular los días reales del período programado basado en la frecuencia
    const daysInPeriod = getDaysInPeriod(normalizedStartDate, paymentFrequency);
    
    // Calcular el interés ajustado según la frecuencia de pago usando días reales
    const adjustedInterestAmount = calculateInterestByDays(
      totalAmount, 
      interestRate, 
      daysInPeriod, 
      daysInPeriod
    );

    // Para interés fijo:
    // - Cada cuota incluye el pago de capital (baseFeeAmount)
    // - MÁS el interés ajustado según frecuencia (adjustedInterestAmount)
    // Para interés decreciente:
    // - El feeAmount es solo el capital base (baseFeeAmount)
    // - El interés se calcula dinámicamente sobre el saldo actual en cada cuota según días transcurridos
    
    // Para FIXED: almacenar el interés por día * días de frecuencia para referencia
    // Nota: El interés real se calculará dinámicamente según días transcurridos en cada pago
    const fixedInterestAmount =
      interestType === "FIXED" ? adjustedInterestAmount : null;
    
    // Calcular el interés inicial para préstamos decrecientes (sobre el saldo total)
    const initialDecreasingInterest = calculateInterestByDays(
      totalAmount, 
      interestRate, 
      daysInPeriod, 
      daysInPeriod
    );
    
    // Para FIXED: cuota = capital + interés estimado (se calculará dinámicamente en cada pago)
    // Para DECREASING: cuota base = solo capital (el interés se calcula dinámicamente según días)
    const baseFee = 
      interestType === "FIXED"
        ? baseFeeAmount + adjustedInterestAmount // Capital + interés estimado
        : baseFeeAmount; // Solo capital para préstamos decrecientes
        
    // Para la primera cuota, incluir el interés estimado
    const firstInstallmentAmount = 
      interestType === "FIXED"
        ? baseFee // Para FIXED es capital + interés estimado
        : baseFeeAmount + initialDecreasingInterest; // Para DECREASING: capital + interés estimado

    // El balance inicial es diferente para cada tipo
    const initialBalance = totalAmount;

    // Calcular fecha de finalización basada en la frecuencia
    switch (paymentFrequency) {
      case "DAILY":
        endDate = addDays(endDate, installments);
        nextPaymentDate = addDays(nextPaymentDate, 1);
        break;
      case "WEEKLY":
        endDate = addWeeks(endDate, installments);
        nextPaymentDate = addWeeks(nextPaymentDate, 1);
        break;
      case "BIWEEKLY":
        endDate = addDays(endDate, installments * 15);
        nextPaymentDate = addDays(nextPaymentDate, 15);
        break;
      case "MONTHLY":
        endDate = addMonths(endDate, installments);
        nextPaymentDate = addMonths(nextPaymentDate, 1);
        break;
      case "QUARTERLY":
        endDate = addMonths(endDate, installments * 3);
        nextPaymentDate = addMonths(nextPaymentDate, 3);
        break;
    }

    // Crear el préstamo usando una transacción
    const loan = await prisma.$transaction(async (tx) => {
        // 1. Verificar el cliente
        const client = await tx.client.findUnique({
            where: { id: clientId },
            include: {
                loans: {
                    where: { status: "ACTIVE" },
                },
            },
        })

        if (!client) {
            throw new Error("Cliente no encontrado")
        }

        if (client.isDisallowed) {
            throw new Error("Cliente no está habilitado para préstamos")
        }

        // 2. Verificar que todas las cuentas existan y estén activas
        // for (const accountSelection of accounts) {
        //     const account = await tx.account.findUnique({
        //         where: {
        //             id: accountSelection.accountId,
        //             isActive: true,
        //             deletedAt: null,
        //         },
        //     })

        //     if (!account) {
        //         throw new Error(`Cuenta con ID ${accountSelection.accountId} no encontrada o inactiva`)
        //     }
        // }

        // 3. Crear el préstamo
        console.log({
            data: {
                loanNumber: String(Math.floor(1000000 + Math.random() * 9000000)),
                clientId,
                totalAmount,
                installments,
                remainingInstallments: installments,
                balance: initialBalance,
                interestRate,
                interestType,
                paymentFrequency,
                feeAmount: baseFee,
                fixedInterestAmount,
                startDate: normalizedStartDate,
                endDate,
                nextPaymentDate,
                notes,
                status: "PENDING",
                currentInstallmentAmount: firstInstallmentAmount,
            },
        })
        const loan = await tx.loan.create({
            data: {
                loanNumber: String(Math.floor(1000000 + Math.random() * 9000000)),
                clientId,
                totalAmount,
                installments,
                remainingInstallments: installments,
                balance: initialBalance,
                interestRate,
                interestType,
                paymentFrequency,
                feeAmount: baseFee,
                fixedInterestAmount,
                startDate: normalizedStartDate,
                endDate,
                nextPaymentDate,
                notes,
                status: "PENDING",
                currentInstallmentAmount: firstInstallmentAmount,
            },
        })

        // 4. Crear las relaciones LoanAccount (sin afectar saldos)
        // for (const accountSelection of accounts) {
        //     // Crear la relación
        //     await tx.loanAccount.create({
        //         data: {
        //             loanId: loan.id,
        //             accountId: accountSelection.accountId,
        //             amount: accountSelection.amount,
        //         },
        //     })
        // }

        return loan
    })

    // Registrar auditoría de creación
    await createLoanAuditLog({
        loanId: loan.id,
        action: "CREATED",
        description: `Préstamo creado para el cliente. Monto: ${totalAmount}, Cuotas: ${installments}`,
        newData: {
            loanNumber: loan.loanNumber,
            totalAmount: loan.totalAmount,
            installments: loan.installments,
            interestRate: loan.interestRate,
            interestType: loan.interestType,
            paymentFrequency: loan.paymentFrequency,
            status: loan.status,
        },
    })
   
    const completeLoan = await prisma.loan.findUnique({
        where: { id: loan.id },
        include: {
            client: {
                select: {
                    fullName: true,
                    identification: true,
                },
            },
            // loanAccounts: {
            //     include: {
            //         account: {
            //             select: {
            //                 name: true,
            //                 number: true,
            //                 type: true,
            //             },
            //         },
            //     },
            // },
        },
    })

    return NextResponse.json(completeLoan    );
  } catch (error) {
    console.error("[LOANS_POST]", error);

    // Devolver errores específicos
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");

    const whereClause: {
      clientId?: string;
      status?: "PENDING" | "ACTIVE" | "COMPLETED" | "DEFAULTED";
    } = {};

    if (clientId) {
      whereClause.clientId = clientId;
    }

    if (
      status &&
      ["PENDING", "ACTIVE", "COMPLETED", "DEFAULTED"].includes(status)
    ) {
      whereClause.status = status as
        | "PENDING"
        | "ACTIVE"
        | "COMPLETED"
        | "DEFAULTED";
    }

    const loans = await prisma.loan.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            fullName: true,
            identification: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(loans);
  } catch (error) {
    console.error("[LOANS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
