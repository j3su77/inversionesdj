import { endOfDay, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/** Zona horaria de negocio (Colombia, UTC−5, sin horario de verano). */
export const APP_TIMEZONE =
  process.env.APP_TIMEZONE?.trim() || "America/Bogota";

export function toAppZonedTime(date: Date): Date {
  return toZonedTime(date, APP_TIMEZONE);
}

/** Inicio del día calendario en Colombia, como instante UTC (para Prisma/DB). */
export function startOfAppDay(date: Date): Date {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  return fromZonedTime(startOfDay(zoned), APP_TIMEZONE);
}

/** Fin del día calendario en Colombia, como instante UTC. */
export function endOfAppDay(date: Date): Date {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  return fromZonedTime(endOfDay(zoned), APP_TIMEZONE);
}

/** Día del mes (1–31) según calendario en Colombia. */
export function getAppCalendarDay(date: Date): number {
  return toZonedTime(date, APP_TIMEZONE).getDate();
}

/** Mes (0–11) según calendario en Colombia. */
export function getAppCalendarMonth(date: Date): number {
  return toZonedTime(date, APP_TIMEZONE).getMonth();
}

/** Año según calendario en Colombia. */
export function getAppCalendarYear(date: Date): number {
  return toZonedTime(date, APP_TIMEZONE).getFullYear();
}
