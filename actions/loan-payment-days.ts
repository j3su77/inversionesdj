"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  frequencyUsesPaymentDayConfig,
  validatePaymentDaysForFrequency,
} from "@/lib/loan-payment-days";

export async function updateLoanPaymentDays(loanId: string, days: number[]) {
  try {
    const loan = await db.loan.findUnique({
      where: { id: loanId },
      select: { id: true, paymentFrequency: true },
    });

    if (!loan) {
      return { ok: false as const, error: "Préstamo no encontrado" };
    }

    const validation = validatePaymentDaysForFrequency(
      loan.paymentFrequency,
      days
    );
    if (!validation.ok) {
      return { ok: false as const, error: validation.message };
    }

    await db.$transaction(async (tx) => {
      await tx.loanPaymentDay.deleteMany({ where: { loanId } });

      if (frequencyUsesPaymentDayConfig(loan.paymentFrequency)) {
        await tx.loanPaymentDay.createMany({
          data: days.map((dayOfCycle, sortOrder) => ({
            loanId,
            dayOfCycle,
            sortOrder,
          })),
        });
      }
    });

    revalidatePath(`/dashboard/prestamos/gestionar/${loanId}`);
    revalidatePath("/dashboard/prestamos");

    return { ok: true as const };
  } catch (e) {
    console.error("updateLoanPaymentDays", e);
    return {
      ok: false as const,
      error: "No se pudo guardar la configuración de días de pago.",
    };
  }
}
