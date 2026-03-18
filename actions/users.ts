"use server";

import { db } from "@/lib/db";

export type ManagerUser = {
  id: string;
  username: string;
};

/**
 * Usuarios activos para asignar como gestor de préstamos y clientes
 */
export async function getManagers(): Promise<ManagerUser[]> {
  return db.user.findMany({
    where: { isActive: true },
    select: { id: true, username: true },
    orderBy: { username: "asc" },
  });
}
