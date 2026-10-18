"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { startOfDay } from "date-fns";
import {
  frequencyUsesPaymentDayConfig,
  validatePaymentDaysForFrequency,
  validateFirstPaymentDate,
  getLastInstallmentDate,
  getLoanDisbursementDate,
} from "@/lib/loan-payment-days";
import { createLoanAuditLog } from "@/lib/loan-audit";

export type UpdateLoanPaymentDaysInput = {
  days: number[];
  /** Solo aplica si aún no hay pagos registrados. */
  firstPaymentDate?: string;
};

export async function updateLoanPaymentDays(
  loanId: string,
  input: UpdateLoanPaymentDaysInput | number[],
) {
  const payload: UpdateLoanPaymentDaysInput = Array.isArray(input)
    ? { days: input }
    : input;

  const { days, firstPaymentDate: firstPaymentDateRaw } = payload;

  try {
    const loan = await db.loan.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        paymentFrequency: true,
        startDate: true,
        disbursementDate: true,
        installments: true,
        firstPaymentDate: true,
        nextPaymentDate: true,
        _count: { select: { payments: true } },
      },
    });

    if (!loan) {
      return { ok: false as const, error: "Préstamo no encontrado" };
    }

    const validation = validatePaymentDaysForFrequency(
      loan.paymentFrequency,
      days,
    );
    if (!validation.ok) {
      return { ok: false as const, error: validation.message };
    }

    const hasPayments = loan._count.payments > 0;
    let normalizedFirstPayment: Date | null = null;

    if (firstPaymentDateRaw != null && firstPaymentDateRaw !== "") {
      if (hasPayments) {
        return {
          ok: false as const,
          error:
            "No se puede cambiar la fecha del primer pago después de registrar la primera cuota.",
        };
      }

      normalizedFirstPayment = startOfDay(new Date(firstPaymentDateRaw));
      if (Number.isNaN(normalizedFirstPayment.getTime())) {
        return { ok: false as const, error: "Fecha del primer pago inválida." };
      }

      const firstValidation = validateFirstPaymentDate(
        getLoanDisbursementDate(loan),
        normalizedFirstPayment,
        loan.paymentFrequency,
        days,
      );
      if (!firstValidation.ok) {
        return { ok: false as const, error: firstValidation.message };
      }
    }

    const scheduleAnchor =
      normalizedFirstPayment ??
      loan.firstPaymentDate ??
      loan.nextPaymentDate ??
      loan.startDate;

    const newEndDate = getLastInstallmentDate(
      startOfDay(scheduleAnchor),
      loan.installments,
      loan.paymentFrequency,
      days,
    );

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

      const loanUpdate: {
        endDate?: Date;
        startDate?: Date;
        firstPaymentDate?: Date;
        nextPaymentDate?: Date;
      } = {};

      if (!hasPayments) {
        loanUpdate.endDate = newEndDate;
      }
      if (normalizedFirstPayment) {
        loanUpdate.firstPaymentDate = normalizedFirstPayment;
        loanUpdate.nextPaymentDate = normalizedFirstPayment;
        loanUpdate.startDate = normalizedFirstPayment;
      }

      if (Object.keys(loanUpdate).length > 0) {
        await tx.loan.update({
          where: { id: loanId },
          data: loanUpdate,
        });
      }
    });

    if (normalizedFirstPayment) {
      await createLoanAuditLog({
        loanId,
        action: "NEXT_PAYMENT_DATE_CHANGED",
        description: "Fecha del primer pago actualizada desde edición de calendario",
        oldData: {
          firstPaymentDate: loan.firstPaymentDate,
          nextPaymentDate: loan.nextPaymentDate,
        },
        newData: {
          startDate: normalizedFirstPayment,
          endDate: newEndDate,
          firstPaymentDate: normalizedFirstPayment,
          nextPaymentDate: normalizedFirstPayment,
        },
      });
    }

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
