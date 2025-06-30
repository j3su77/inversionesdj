 "use server";
import { db } from "@/lib/db";
import {  Prisma } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";

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

export type LoanStatusFilter = "active" | "dueToday" | "paid" | "overdue" | "all";

export const getLoansByStatus = async (status: LoanStatusFilter) => {
  try {
    const today = new Date();
    const whereClause: Prisma.LoanWhereInput = {};

    switch (status) {
      case "active":
        whereClause.status = "ACTIVE";
        break;
      case "paid":
        whereClause.status = "COMPLETED";
        break;
      case "dueToday":
        whereClause.AND = [
          { status: "ACTIVE" },
          {
            OR: [
              {
                nextPaymentDate: {
                  gte: startOfDay(today),
                  lte: endOfDay(today),
                },
              },
              {
                nextPaymentDate: {
                  lt: startOfDay(today),
                },
              },
            ],
          },
        ];
        break;
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
      status: "ACTIVE",
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
