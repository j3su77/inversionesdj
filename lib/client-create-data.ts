import { MaritalStatus } from "@prisma/client";
import {
  activeIdentificationKey,
  parseClientIdentification,
} from "@/lib/client-identification";

export type ClientCreateBody = Record<string, unknown>;

export type ParsedClientCreateInput =
  | { ok: true; data: {
      fullName: string;
      identification: number;
      activeIdentificationKey: string;
      nationality: string;
      dateOfBirth: Date;
      placeOfBirth: string;
      address: string | null;
      phone: string | null;
      cellphone: string | null;
      maritalStatus: MaritalStatus | null;
      occupation: string | null;
      companyName: string | null;
      currentPosition: string | null;
      companyTenure: number | null;
      monthlyIncome: number | null;
      workSchedule: string | null;
      workplace: string | null;
      isDisallowed: boolean;
      managedByUserId: string | null;
    } }
  | { ok: false; message: string; status: number };

function optionalString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  if (value == null || value === "") return null;
  const s = String(value);
  return allowed.includes(s as T) ? (s as T) : null;
}

export function parseClientCreateBody(body: ClientCreateBody): ParsedClientCreateInput {
  const fullName = optionalString(body.fullName);
  if (!fullName) {
    return { ok: false, message: "Nombre requerido", status: 400 };
  }

  const identification = parseClientIdentification(
    body.identification as number | string,
  );
  if (identification == null) {
    return {
      ok: false,
      message: "Identificación del cliente es requerida",
      status: 400,
    };
  }

  const nationality = optionalString(body.nationality) ?? "";
  const placeOfBirth = optionalString(body.placeOfBirth) ?? "";

  const rawDob = body.dateOfBirth;
  if (rawDob == null || rawDob === "") {
    return { ok: false, message: "Fecha de nacimiento requerida", status: 400 };
  }
  const dateOfBirth = new Date(rawDob as string | number | Date);
  if (Number.isNaN(dateOfBirth.getTime())) {
    return { ok: false, message: "Fecha de nacimiento inválida", status: 400 };
  }

  const maritalStatus = optionalEnum(
    body.maritalStatus,
    Object.values(MaritalStatus),
  );

  const managedByUserId = optionalString(body.managedByUserId);

  return {
    ok: true,
    data: {
      fullName,
      identification,
      activeIdentificationKey: activeIdentificationKey(identification),
      nationality,
      dateOfBirth,
      placeOfBirth,
      address: optionalString(body.address),
      phone: optionalString(body.phone),
      cellphone: optionalString(body.cellphone),
      maritalStatus,
      occupation: optionalString(body.occupation),
      companyName: optionalString(body.companyName),
      currentPosition: optionalString(body.currentPosition),
      companyTenure:
        body.companyTenure != null && body.companyTenure !== ""
          ? Number(body.companyTenure)
          : null,
      monthlyIncome:
        body.monthlyIncome != null && body.monthlyIncome !== ""
          ? Number(body.monthlyIncome)
          : null,
      workSchedule: optionalString(body.workSchedule),
      workplace: optionalString(body.workplace),
      isDisallowed: Boolean(body.isDisallowed),
      managedByUserId,
    },
  };
}
