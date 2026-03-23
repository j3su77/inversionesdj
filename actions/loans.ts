"use server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";
import {
  getCommercialDayOfMonth,
  isLoanDueToday,
} from "@/lib/loan-payment-days";

// export const getPaymentFrequencyFromAuditLog = async (paymentId: string) => {
//   const auditLog = await db.auditLog.findFirst({
//     where: {
//       entityId: paymentId,
//       entity: "PAYMENT",
//       action: "CREATE",
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//   });

//   return (auditLog?.oldData as any).paymentFrequency || null;
// };

export const getLoanPayments = async (loanId: string) => {
  // Get all payments first
  const payments = await db.payment.findMany({
    where: {
      loanId: loanId,
   
    },
    include: {
      loan: {
        select: {
          paymentFrequency: true,
        },
      },
    },
    orderBy: { paymentDate: "asc" },
  });

  return payments;
};

export type LoanStatusFilter = "active" | "dueToday" | "paid" | "overdue" | "cancelled" | "all";

export const getLoansByStatus = async (
  status: LoanStatusFilter,
  managedByUserId?: string | null
) => {
  try {
    const today = new Date();
    const whereClause: Prisma.LoanWhereInput = {};

    if (managedByUserId) {
      whereClause.managedByUserId = managedByUserId;
    }

    switch (status) {
      case "active":
        whereClause.status = "ACTIVE";
        break;
      case "paid":
        whereClause.status = "COMPLETED";
        break;
      case "cancelled":
        whereClause.status = "CANCELLED";
        break;
      case "dueToday": {
        /**
         * Vence hoy si:
         * - frecuencia diaria, o
         * - tiene días de ciclo 30 configurados y el día comercial de hoy coincide, o
         * - no tiene días configurados y nextPaymentDate sigue siendo hoy (préstamos legacy).
         * Y no tiene ya un pago registrado con fecha de hoy (cuota del día cubierta).
         */
        const commercialDay = getCommercialDayOfMonth(today);
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);
        whereClause.AND = [
          { status: "ACTIVE" },
          {
            NOT: {
              payments: {
                some: {
                  paymentDate: {
                    gte: dayStart,
                    lte: dayEnd,
                  },
                },
              },
            },
          },
          {
            OR: [
              { paymentFrequency: "DAILY" },
              {
                paymentDays: {
                  some: { dayOfCycle: commercialDay },
                },
              },
              {
                AND: [
                  { paymentDays: { none: {} } },
                  {
                    nextPaymentDate: {
                      gte: dayStart,
                      lte: dayEnd,
                    },
                  },
                ],
              },
            ],
          },
        ];
        break;
      }
      case "overdue":
        whereClause.AND = [
          { status: "ACTIVE" },
          {
            nextPaymentDate: {
              lt: startOfDay(today),
            },
          },
        ];
        break;
      case "all":
        // No aplicar filtros
        break;
    }

    const loans = await db.loan.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            fullName: true,
            identification: true,
            phone: true,
            cellphone: true,
          },
        },
        managedBy: {
          select: {
            id: true,
            username: true,
          },
        },
        payments: {
          select: {
            interestAmount: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          nextPaymentDate: "asc",
        },
      ],
    });

    return loans;
  } catch (error) {
    console.error("[GET_LOANS_BY_STATUS]", error);
    throw new Error("Error al obtener los préstamos");
  }
};



// Función para verificar si el pago vence hoy
// function isPaymentDueToday(paymentDate: Date, today: Date) {
//   return (
//     paymentDate.getFullYear() === today.getFullYear() &&
//     paymentDate.getMonth() === today.getMonth() &&
//     paymentDate.getDate() === today.getDate()
//   );
// }

export const getLoanById = async (loanId: string) => {
  try {
    const loan = await db.loan.findUnique({
      where: {
        id: loanId,
      NOT: {
        status: "CANCELLED",
      },
    },
    include: {
      client: true,
      payments: true,
    },
  });
  return loan;
  } catch (error) {
    console.error("[GET_LOAN_BY_ID]", error);
    throw new Error("Error al obtener el préstamo");
  }
};

export const getLoanStats = async () => {
  try {
    const now = new Date();
    const startOfToday = startOfDay(now);
    const endOfToday = endOfDay(now);

    // Obtener todos los préstamos activos
    const activeLoans = await db.loan.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        nextPaymentDate: true,
        balance: true,
        totalAmount: true,
        paymentFrequency: true,
        paymentDays: { select: { dayOfCycle: true } },
        payments: {
          where: {
            paymentDate: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
          select: { id: true },
          take: 1,
        },
        client: {
          select: {
            fullName: true,
          },
        },
      },
    });

    // Calcular estadísticas
    const totalActiveLoans = activeLoans.length;
    
    // Préstamos en mora (fecha de pago vencida)
    const overdueLoans = activeLoans.filter(loan => 
      loan.nextPaymentDate && loan.nextPaymentDate < startOfToday
    );
    
    // Préstamos al día (fecha de pago hoy o futura)
    const currentLoans = activeLoans.filter(loan => 
      loan.nextPaymentDate && loan.nextPaymentDate >= startOfToday
    );

    // Préstamos que vencen hoy (ciclo 30 + diario + fallback nextPaymentDate), sin pago hoy
    const dueTodayLoans = activeLoans.filter((loan) =>
      isLoanDueToday(
        {
          paymentFrequency: loan.paymentFrequency,
          nextPaymentDate: loan.nextPaymentDate,
          paymentDays: loan.paymentDays,
          hasPaymentToday: loan.payments.length > 0,
        },
        now
      )
    );

    // Calcular montos totales
    const totalActiveAmount = activeLoans.reduce((sum, loan) => sum + loan.totalAmount, 0);
    const totalPendingAmount = activeLoans.reduce((sum, loan) => sum + loan.balance, 0);
    const overdueAmount = overdueLoans.reduce((sum, loan) => sum + loan.balance, 0);

    return {
      success: true,
      data: {
        totalActiveLoans,
        currentLoans: currentLoans.length,
        overdueLoans: overdueLoans.length,
        dueTodayLoans: dueTodayLoans.length,
        totalActiveAmount,
        totalPendingAmount,
        overdueAmount,
        overduePercentage: totalActiveLoans > 0 ? (overdueLoans.length / totalActiveLoans) * 100 : 0,
      },
    };
  } catch (error) {
    console.error("[GET_LOAN_STATS]", error);
    return {
      success: false,
      error: "Error al obtener estadísticas de préstamos",
    };
  }
};

export const calculateNextPaymentDate = async (loanId: string, currentPaymentDate: Date) => {
  try {
    // Obtener el préstamo y sus cambios de frecuencia
    const loan = await db.loan.findUnique({
      where: { id: loanId },
      select: {
        paymentFrequency: true,
        startDate: true,
      },
    });

    if (!loan) {
      throw new Error("Préstamo no encontrado");
    }

    // Obtener el último cambio de frecuencia activo
    const lastFrequencyChange = await db.paymentFrequencyChange.findFirst({
      where: {
        loanId,
        effectiveDate: {
          lte: currentPaymentDate,
        },
      },
      orderBy: {
        effectiveDate: "desc",
      },
    });

    // Determinar la frecuencia actual
    const currentFrequency = lastFrequencyChange?.newFrequency || loan.paymentFrequency;

    // Calcular la próxima fecha de pago
    const nextPaymentDate = new Date(currentPaymentDate);

    switch (currentFrequency) {
      case "DAILY":
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 1);
        break;
      case "WEEKLY":
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);
        break;
      case "BIWEEKLY":
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 15);
        break;
      case "MONTHLY":
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        break;
      default:
        throw new Error("Frecuencia de pago no válida");
    }

    return {
      success: true,
      nextPaymentDate,
      currentFrequency,
    };
  } catch (error) {
    console.error("[CALCULATE_NEXT_PAYMENT_DATE]", error);
    return {
      success: false,
      error: "Error al calcular la próxima fecha de pago",
    };
  }
};

export const cancelLoan = async (loanId: string, reason?: string) => {
  try {
    const loan = await db.loan.findUnique({
      where: { id: loanId },
      select: { status: true, balance: true },
    });

    if (!loan) {
      throw new Error("Préstamo no encontrado");
    }

    if (loan.status === "COMPLETED") {
      throw new Error("No se puede cancelar un préstamo que ya está completado");
    }

    if (loan.status === "CANCELLED") {
      throw new Error("El préstamo ya está cancelado");
    }

    // Actualizar el préstamo a estado CANCELLED
    const updatedLoan = await db.loan.update({
      where: { id: loanId },
      data: {
        status: "CANCELLED",
        nextPaymentDate: null,
        currentInstallmentAmount: 0,
        // Opcionalmente agregar una nota sobre la cancelación
        ...(reason && { notes: reason }),
      },
    });

    return {
      success: true,
      loan: updatedLoan,
    };
  } catch (error) {
    console.error("[CANCEL_LOAN]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cancelar el préstamo",
    };
  }
};
