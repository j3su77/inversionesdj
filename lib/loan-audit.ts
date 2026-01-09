import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { LoanAuditAction } from "@prisma/client";
import { headers } from "next/headers";

interface CreateAuditLogParams {
  loanId: string;
  action: LoanAuditAction;
  description?: string;
  oldData?: any;
  newData?: any;
}

/**
 * Crea un registro de auditoría para un préstamo
 */
export async function createLoanAuditLog({
  loanId,
  action,
  description,
  oldData,
  newData,
}: CreateAuditLogParams) {
  try {
    // Obtener la sesión del usuario
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const username = session?.user?.username;

    // Obtener información de la solicitud
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Crear el registro de auditoría
    await prisma.loanAudit.create({
      data: {
        loanId,
        action,
        performedBy: userId || null,
        performedByUsername: username || null,
        description,
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // No lanzar error para no interrumpir el flujo principal
    // Solo registrar en consola
    console.error("[LOAN_AUDIT_ERROR]", error);
  }
}

