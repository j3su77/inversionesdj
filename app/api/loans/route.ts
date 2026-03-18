import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, addMonths, addWeeks } from "date-fns";

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
      coDebtor,
      productInfo,
      managedByUserId,
      // accounts,
    } = body;

    if (!managedByUserId || typeof managedByUserId !== "string") {
      return NextResponse.json(
        { message: "Debe seleccionar el usuario asignado al préstamo" },
        { status: 400 }
      );
    }

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

    // Calcular el interés diario
    // Interés mensual = monto * tasa / 100
    // Interés diario = interés mensual / 30
    const calculateDailyInterest = (amount: number, rate: number): number => {
      const monthlyInterest = amount * (rate / 100);
      return monthlyInterest / 30;
    };

    // Calcular días según la frecuencia de pago
    const getDaysForFrequency = (frequency: string): number => {
      switch (frequency) {
        case "DAILY":
          return 1;
        case "WEEKLY":
          return 7;
        case "BIWEEKLY":
          return 15;
        case "MONTHLY":
          return 30;
        case "QUARTERLY":
          return 90;
        default:
          return 30;
      }
    };

    // Calcular el interés ajustado según la frecuencia de pago
    const daysForFrequency = getDaysForFrequency(paymentFrequency);
    const dailyInterest = calculateDailyInterest(totalAmount, interestRate);
    const adjustedInterestAmount = dailyInterest * daysForFrequency;

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
    const initialDecreasingInterest = calculateDailyInterest(totalAmount, interestRate) * daysForFrequency;
    
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
                coDebtor,
                productInfo: productInfo ?? undefined,
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
                coDebtor,
                productInfo: productInfo ?? undefined,
                managedByUserId: managedByUserId || undefined,
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
    const managedBy = searchParams.get("managedBy");

    const whereClause: {
      clientId?: string;
      status?: "PENDING" | "ACTIVE" | "COMPLETED" | "DEFAULTED";
      managedByUserId?: string;
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

    if (managedBy) {
      whereClause.managedByUserId = managedBy;
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
