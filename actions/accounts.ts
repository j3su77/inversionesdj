"use server";

import { db } from "@/lib/db";
import { AccountType, AccountSubtype } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface CreateAccountData {
  name: string;
  number: string;
  type: AccountType;
  subtype?: AccountSubtype;
  accountHolder?: string;
  balance: number;
  description?: string;
}

export interface UpdateAccountData extends Partial<CreateAccountData> {
  id: string;
}

// Crear una nueva cuenta
export const createAccount = async (data: CreateAccountData) => {
  try {
    const account = await db.account.create({
      data: {
        name: data.name,
        number: data.number,
        type: data.type,
        subtype: data.subtype || "NOT_APPLICABLE",
        accountHolder: data.accountHolder,
        balance: data.balance,
        description: data.description,
      },
    });

    revalidatePath("/dashboard/cuentas");
    return { success: true, data: account };
  } catch (error) {
    console.error("[CREATE_ACCOUNT]", error);
    return { success: false, error: "Error al crear la cuenta" };
  }
};

// Obtener todas las cuentas activas
export const getAccounts = async () => {
  try {
    const accounts = await db.account.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: {
        name: "asc",
      },
    });

    return accounts;
  } catch (error) {
    console.error("[GET_ACCOUNTS]", error);
    throw new Error("Error al obtener las cuentas");
  }
};

// Obtener una cuenta por ID
export const getAccountById = async (id: string) => {
  try {
    const account = await db.account.findUnique({
      where: {
        id,
        isActive: true,
        deletedAt: null,
      },
      include: {
        loanAccounts: {
          include: {
            loan: {
              select: {
                id: true,
                loanNumber: true,
                totalAmount: true,
                client: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return account;
  } catch (error) {
    console.error("[GET_ACCOUNT_BY_ID]", error);
    throw new Error("Error al obtener la cuenta");
  }
};

// Actualizar una cuenta
export const updateAccount = async (data: UpdateAccountData) => {
  try {
    const { id, ...updateData } = data;
    
    const account = await db.account.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/dashboard/cuentas");
    revalidatePath(`/dashboard/cuentas/${id}`);
    return { success: true, data: account };
  } catch (error) {
    console.error("[UPDATE_ACCOUNT]", error);
    return { success: false, error: "Error al actualizar la cuenta" };
  }
};

// Eliminar una cuenta (soft delete)
export const deleteAccount = async (id: string) => {
  try {
    // Verificar si la cuenta tiene préstamos asociados
    const loanCount = await db.loanAccount.count({
      where: { accountId: id },
    });

    if (loanCount > 0) {
      return { 
        success: false, 
        error: "No se puede eliminar la cuenta porque tiene préstamos asociados" 
      };
    }

    await db.account.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/cuentas");
    return { success: true };
  } catch (error) {
    console.error("[DELETE_ACCOUNT]", error);
    return { success: false, error: "Error al eliminar la cuenta" };
  }
};

// Actualizar el saldo de una cuenta
export const updateAccountBalance = async (id: string, newBalance: number) => {
  try {
    const account = await db.account.update({
      where: { id },
      data: { balance: newBalance },
    });

    revalidatePath("/dashboard/cuentas");
    revalidatePath(`/dashboard/cuentas/${id}`);
    return { success: true, data: account };
  } catch (error) {
    console.error("[UPDATE_ACCOUNT_BALANCE]", error);
    return { success: false, error: "Error al actualizar el saldo" };
  }
};

// Obtener cuentas con saldo suficiente para un monto específico
export const getAccountsWithSufficientBalance = async (minAmount: number) => {
  try {
    const accounts = await db.account.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        balance: {
          gte: minAmount,
        },
      },
      orderBy: {
        balance: "desc",
      },
    });

    return accounts;
  } catch (error) {
    console.error("[GET_ACCOUNTS_WITH_SUFFICIENT_BALANCE]", error);
    throw new Error("Error al obtener las cuentas");
  }
}; 