import { PaymentFrequency } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

/**
 * Primera fecha calendario estrictamente posterior a `fromDate` cuyo día comercial
 * (1–30, día 31 → 30) coincide con algún valor en `cycleDays`.
 * - `DAILY`: siempre el día siguiente calendario (no usa `cycleDays`).
 * - Sin días en `cycleDays` (y no diario): devuelve `null` (usar otro criterio).
 */
export function getNextDateFromPaymentCycle(
  fromDate: Date,
  cycleDays: number[],
  frequency: PaymentFrequency
): Date | null {
  const start = startOfDay(fromDate);

  if (frequency === "DAILY") {
    const d = new Date(start);
    d.setDate(d.getDate() + 1);
    return startOfDay(d);
  }

  const unique = [
    ...new Set(
      cycleDays.filter(
        (n) => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 30
      )
    ),
  ].sort((a, b) => a - b);

  if (unique.length === 0) {
    return null;
  }

  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);

  for (let i = 0; i < 120; i++) {
    if (unique.includes(getCommercialDayOfMonth(cursor))) {
      return startOfDay(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
}

/**
 * Día del calendario dentro del mes comercial de 30 días (1–30).
 * Los días 31 se alinean con 30, igual que en el resto de la app.
 */
export function getCommercialDayOfMonth(date: Date): number {
  const d = date.getDate();
  return d > 30 ? 30 : d;
}

/** Datos mínimos para saber si “vence hoy” según ciclo 30 o nextPaymentDate. */
export type LoanDueTodayInput = {
  paymentFrequency: PaymentFrequency;
  nextPaymentDate: Date | null;
  paymentDays: { dayOfCycle: number }[];
  /** Si ya hubo al menos un pago registrado hoy, no se considera pendiente la cuota de hoy. */
  hasPaymentToday?: boolean;
};

/**
 * - Diario: cualquier día aplica.
 * - Con días configurados en BD: hoy coincide con algún dayOfCycle (ciclo 30).
 * - Sin días configurados: mismo criterio que antes (nextPaymentDate calendario hoy).
 * - Si `hasPaymentToday`, no aplica (ya cubrieron la cuota del día).
 */
export function isLoanDueToday(
  loan: LoanDueTodayInput,
  today: Date = new Date()
): boolean {
  if (loan.hasPaymentToday) {
    return false;
  }

  if (loan.paymentFrequency === "DAILY") {
    return true;
  }

  const commercialDay = getCommercialDayOfMonth(today);

  if (loan.paymentDays.length > 0) {
    return loan.paymentDays.some((d) => d.dayOfCycle === commercialDay);
  }

  if (!loan.nextPaymentDate) {
    return false;
  }

  const npd = new Date(loan.nextPaymentDate);
  return npd >= startOfDay(today) && npd <= endOfDay(today);
}

/**
 * Cantidad de “ranuras” de día de pago según frecuencia (ciclo comercial de 30 días).
 * Diario: no usa filas en BD (0).
 */
export function getPaymentDaySlotsForFrequency(
  frequency: PaymentFrequency
): number {
  switch (frequency) {
    case "WEEKLY":
      return 4;
    case "BIWEEKLY":
      return 2;
    case "MONTHLY":
    case "QUARTERLY":
      return 1;
    case "DAILY":
    default:
      return 0;
  }
}

export function frequencyUsesPaymentDayConfig(
  frequency: PaymentFrequency
): boolean {
  return getPaymentDaySlotsForFrequency(frequency) > 0;
}

export function validatePaymentDaysForFrequency(
  frequency: PaymentFrequency,
  days: number[]
): { ok: true } | { ok: false; message: string } {
  const slots = getPaymentDaySlotsForFrequency(frequency);

  if (slots === 0) {
    if (days.length > 0) {
      return {
        ok: false,
        message:
          "La frecuencia diaria no utiliza días fijos del ciclo; no debe enviar días.",
      };
    }
    return { ok: true };
  }

  if (days.length !== slots) {
    return {
      ok: false,
      message: `Debe indicar exactamente ${slots} día(s) de pago para esta frecuencia.`,
    };
  }

  for (const d of days) {
    if (!Number.isInteger(d) || d < 1 || d > 30) {
      return {
        ok: false,
        message: "Cada día debe ser un entero entre 1 y 30 (ciclo comercial).",
      };
    }
  }

  const unique = new Set(days);
  if (unique.size !== days.length) {
    return {
      ok: false,
      message: "Los días de pago no pueden repetirse.",
    };
  }

  return { ok: true };
}
