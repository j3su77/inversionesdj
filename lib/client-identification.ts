import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export function activeIdentificationKey(identification: number): string {
  return String(identification);
}

export function parseClientIdentification(
  identification: number | string | null | undefined,
): number | null {
  if (identification == null || identification === "") return null;
  const num =
    typeof identification === "string"
      ? Number.parseInt(identification, 10)
      : identification;
  if (!Number.isInteger(num) || num < 1) return null;
  return num;
}

/** Cliente activo (no eliminado) con ese documento, si existe. */
export async function findActiveClientByIdentification(
  identification: number,
) {
  return db.client.findFirst({
    where: {
      activeIdentificationKey: activeIdentificationKey(identification),
      deletedAt: null,
    },
  });
}

export async function isIdentificationAvailableForNewClient(
  identification: number,
): Promise<boolean> {
  const existing = await findActiveClientByIdentification(identification);
  return existing == null;
}

export async function isIdentificationAvailableForUpdate(
  identification: number,
  clientId: string,
): Promise<boolean> {
  const existing = await db.client.findFirst({
    where: {
      activeIdentificationKey: activeIdentificationKey(identification),
      deletedAt: null,
      id: { not: clientId },
    },
  });
  return existing == null;
}

export function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export const IDENTIFICATION_TAKEN_MESSAGE =
  "Número de documento ya registrado";

export const IDENTIFICATION_TAKEN_AFTER_DELETE_MESSAGE =
  "No se pudo registrar el documento. Si el cliente fue eliminado recientemente, contacte soporte.";
