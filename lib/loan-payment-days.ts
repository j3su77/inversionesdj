import { PaymentFrequency } from "@prisma/client";
import { addDays, addMonths, addWeeks, endOfDay, startOfDay } from "date-fns";

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
 * - Diario: cualquier día aplica (si no hubo pago hoy).
 * - Con `nextPaymentDate`: vence hoy si esa fecha cae en el día calendario actual
 *   (incluye fechas fijadas manualmente al registrar pagos).
 * - Sin `nextPaymentDate` (legacy): fallback al día comercial del ciclo 30.
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

  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  if (loan.nextPaymentDate) {
    const npd = new Date(loan.nextPaymentDate);
    return npd >= dayStart && npd <= dayEnd;
  }

  if (loan.paymentDays.length > 0) {
    const commercialDay = getCommercialDayOfMonth(today);
    return loan.paymentDays.some((d) => d.dayOfCycle === commercialDay);
  }

  return false;
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

  for (let i = 1; i < days.length; i++) {
    if (days[i] < days[i - 1]) {
      return {
        ok: false,
        message: `El día ${i + 1} no puede ser menor que el día ${i} (${days[i - 1]}).`,
      };
    }
  }

  return { ok: true };
}

export function parsePaymentDaySlotValue(
  raw: string | undefined,
): number | null {
  const trimmed = raw?.trim() ?? "";
  if (trimmed === "") return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isNaN(n) ? null : n;
}

/** Mínimo día comercial en la ranura `slotIndex` según el día anterior elegido. */
export function getMinCommercialDayForPaymentSlot(
  slotValues: string[],
  slotIndex: number,
): number | undefined {
  if (slotIndex <= 0) return undefined;
  const prev = parsePaymentDaySlotValue(slotValues[slotIndex - 1]);
  return prev ?? undefined;
}

/** Actualiza una ranura y limpia las posteriores que queden inválidas. */
export function applyPaymentDaySlotChange(
  slotValues: string[],
  slotIndex: number,
  day: number,
): string[] {
  const len = slotValues.length;
  const next = [...slotValues];
  while (next.length < len) next.push("");
  next[slotIndex] = String(day);

  for (let j = slotIndex + 1; j < next.length; j++) {
    const prevDay = parsePaymentDaySlotValue(next[j - 1]);
    if (prevDay == null) {
      next[j] = "";
      continue;
    }
    const later = parsePaymentDaySlotValue(next[j]);
    if (later != null && later < prevDay) {
      next[j] = "";
    }
  }

  return next;
}

/**
 * Siguiente vencimiento respetando el orden pactado (sortOrder), no el orden numérico.
 * Tras un pago en `fromDate`, avanza al siguiente día en la lista rotatoria.
 */
export function getNextDateFromPaymentCycleOrdered(
  fromDate: Date,
  orderedCycleDays: number[],
  frequency: PaymentFrequency
): Date | null {
  if (frequency === "DAILY") {
    const d = new Date(startOfDay(fromDate));
    d.setDate(d.getDate() + 1);
    return startOfDay(d);
  }

  const days = orderedCycleDays.filter(
    (n) => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 30
  );
  if (days.length === 0) {
    return null;
  }
  if (days.length === 1) {
    return getNextDateFromPaymentCycle(fromDate, days, frequency);
  }

  const paidCommercial = getCommercialDayOfMonth(fromDate);
  let idx = days.findIndex((d) => d === paidCommercial);
  if (idx === -1) {
    return getNextDateFromPaymentCycle(fromDate, days, frequency);
  }

  const nextDayInCycle = days[(idx + 1) % days.length];
  const cursor = new Date(startOfDay(fromDate));
  cursor.setDate(cursor.getDate() + 1);

  for (let i = 0; i < 120; i++) {
    if (getCommercialDayOfMonth(cursor) === nextDayInCycle) {
      return startOfDay(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
}

/** Avanza una cuota en el cronograma (desde una fecha de pago ya cumplida). */
export function advanceInstallmentDate(
  fromDate: Date,
  frequency: PaymentFrequency,
  orderedCycleDays: number[]
): Date {
  const from = startOfDay(fromDate);

  if (frequency === "DAILY") {
    const d = new Date(from);
    d.setDate(d.getDate() + 1);
    return startOfDay(d);
  }

  if (orderedCycleDays.length > 0) {
    const next = getNextDateFromPaymentCycleOrdered(
      from,
      orderedCycleDays,
      frequency
    );
    if (next) {
      return next;
    }
  }

  switch (frequency) {
    case "WEEKLY":
      return startOfDay(addWeeks(from, 1));
    case "BIWEEKLY":
      return startOfDay(addDays(from, 15));
    case "MONTHLY":
      return startOfDay(addMonths(from, 1));
    case "QUARTERLY":
      return startOfDay(addMonths(from, 3));
    default:
      return from;
  }
}

/** Fecha de la última cuota contando desde el primer vencimiento. */
export function getLastInstallmentDate(
  firstPaymentDate: Date,
  installments: number,
  frequency: PaymentFrequency,
  orderedCycleDays: number[]
): Date {
  let current = startOfDay(firstPaymentDate);
  for (let i = 1; i < installments; i++) {
    current = advanceInstallmentDate(current, frequency, orderedCycleDays);
  }
  return current;
}

/** Fecha de desembolso para intereses y validaciones (legacy: sin columna usa startDate). */
export function getLoanDisbursementDate(loan: {
  disbursementDate?: Date | null;
  startDate: Date;
}): Date {
  return startOfDay(
    loan.disbursementDate ? new Date(loan.disbursementDate) : loan.startDate
  );
}

export function validateFirstPaymentDate(
  disbursementDate: Date,
  firstPaymentDate: Date,
  frequency: PaymentFrequency,
  paymentDays: number[]
): { ok: true } | { ok: false; message: string } {
  const disbursement = startOfDay(disbursementDate);
  const first = startOfDay(firstPaymentDate);

  if (first < disbursement) {
    return {
      ok: false,
      message:
        "La fecha del primer pago no puede ser anterior a la fecha de desembolso.",
    };
  }

  if (frequencyUsesPaymentDayConfig(frequency)) {
    const dayValidation = validatePaymentDaysForFrequency(
      frequency,
      paymentDays
    );
    if (!dayValidation.ok) {
      return dayValidation;
    }
    const commercial = getCommercialDayOfMonth(first);
    if (!paymentDays.includes(commercial)) {
      return {
        ok: false,
        message: `La fecha del primer pago debe coincidir con uno de los días pactados del ciclo (${paymentDays.join(", ")}).`,
      };
    }
  }

  return { ok: true };
}

/** Propuesta automática de primer pago (editable en el formulario). */
export function suggestFirstPaymentDate(
  startDate: Date,
  frequency: PaymentFrequency,
  paymentDays: number[]
): Date {
  const start = startOfDay(startDate);

  if (frequency === "DAILY") {
    const d = new Date(start);
    d.setDate(d.getDate() + 1);
    return startOfDay(d);
  }

  if (
    frequencyUsesPaymentDayConfig(frequency) &&
    paymentDays.length > 0
  ) {
    const fromCycle = getNextDateFromPaymentCycle(
      start,
      paymentDays,
      frequency
    );
    if (fromCycle) {
      return fromCycle;
    }
  }

  switch (frequency) {
    case "WEEKLY":
      return startOfDay(addWeeks(start, 1));
    case "BIWEEKLY":
      return startOfDay(addDays(start, 15));
    case "MONTHLY":
      return startOfDay(addMonths(start, 1));
    case "QUARTERLY":
      return startOfDay(addMonths(start, 3));
    default:
      return startOfDay(addDays(start, 1));
  }
}
