"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ExpenseCategory } from "@prisma/client";

export interface CreateExpenseData {
  name: string;
  description?: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: Date;
  notes?: string;
  accounts: {
    accountId: string;
    amount: number;
  }[];
}

export async function createExpense(data: CreateExpenseData) {
  try {
    // Verificar que las cuentas existan y estén activas
    const accountIds = data.accounts.map(acc => acc.accountId);
    const accounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        isActive: true
      }
    });

    if (accounts.length !== accountIds.length) {
      return { success: false, error: "Una o más cuentas no son válidas" };
    }

    // Verificar que la suma de las cuentas sea igual al monto total
    const totalAccountAmount = data.accounts.reduce((sum, acc) => sum + acc.amount, 0);
    if (Math.abs(totalAccountAmount - data.amount) > 0.01) {
      return { success: false, error: "La suma de los montos de las cuentas debe ser igual al monto total" };
    }

    // Verificar que las cuentas tengan suficiente saldo
    for (const accountData of data.accounts) {
      const account = accounts.find(acc => acc.id === accountData.accountId);
      if (account && account.balance < accountData.amount) {
        return { 
          success: false, 
          error: `Saldo insuficiente en la cuenta ${account.name}. Saldo disponible: $${account.balance.toLocaleString()}` 
        };
      }
    }

    // Crear el gasto y las relaciones de cuentas en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear el gasto
      const expense = await tx.expense.create({
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          amount: data.amount,
          expenseDate: data.expenseDate,
          notes: data.notes,
          expenseAccounts: {
            create: data.accounts.map((accountData) => ({
              accountId: accountData.accountId,
              amount: accountData.amount,
            })),
          },
        },
        include: {
          expenseAccounts: {
            include: {
              account: true,
            },
          },
        },
      });

      // Actualizar los saldos de las cuentas
      for (const accountData of data.accounts) {
        await tx.account.update({
          where: { id: accountData.accountId },
          data: {
            balance: {
              decrement: accountData.amount,
            },
          },
        });
      }

      return expense;
    });

    revalidatePath("/dashboard/gastos");
    revalidatePath("/dashboard/cuentas");
    revalidatePath("/dashboard");

    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating expense:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

export async function getExpenses(page = 1, limit = 10, category?: ExpenseCategory) {
  try {
    const skip = (page - 1) * limit;

    const where = {
      isActive: true, // Solo mostrar gastos activos
      ...(category && { category }),
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          expenseAccounts: {
            include: {
              account: true,
            },
          },
        },
        orderBy: {
          expenseDate: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    return {
      success: true,
      data: {
        expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function getExpenseById(id: string) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { 
        id,
        isActive: true, // Solo obtener gastos activos
      },
      include: {
        expenseAccounts: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!expense) {
      return {
        success: false,
        error: "Gasto no encontrado",
      };
    }

    return {
      success: true,
      data: expense,
    };
  } catch (error) {
    console.error("Error fetching expense:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function getExpenseStats() {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const [totalExpenses, monthlyExpenses, expensesByCategory] = await Promise.all([
      prisma.expense.aggregate({
        _sum: {
          amount: true,
        },
      }),
      prisma.expense.aggregate({
        where: {
          expenseDate: {
            gte: currentMonth,
            lt: nextMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.expense.groupBy({
        by: ["category"],
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalExpenses: totalExpenses._sum.amount || 0,
        monthlyExpenses: monthlyExpenses._sum.amount || 0,
        expensesByCategory: expensesByCategory.map((item) => ({
          category: item.category,
          amount: item._sum.amount || 0,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching expense stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

