import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { format } from "date-fns";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { createMysqlDump, parseMysqlDatabaseUrl } from "@/lib/mysql-backup";

function isBackupEnabled() {
  const flag = process.env.DATABASE_BACKUP_ENABLED;
  if (flag === "false") return false;
  if (flag === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export async function POST(req: Request) {
  try {
    if (!isBackupEnabled()) {
      return NextResponse.json(
        { message: "La descarga de copias de la base de datos está deshabilitada." },
        { status: 403 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { message: "Solo administradores pueden descargar copias de la base de datos." },
        { status: 403 }
      );
    }

    const { password } = await req.json();
    if (!password || typeof password !== "string") {
      return NextResponse.json({ message: "La contraseña es requerida." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user?.password) {
      return new NextResponse("User not found", { status: 404 });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ message: "Contraseña incorrecta." }, { status: 401 });
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        { message: "DATABASE_URL no está configurada." },
        { status: 500 }
      );
    }

    const params = parseMysqlDatabaseUrl(databaseUrl);
    const dump = await createMysqlDump(params);

    const filename = `inversiones-dj-${params.database}-${format(new Date(), "yyyy-MM-dd-HHmm")}.sql`;

    return new NextResponse(new Uint8Array(dump), {
      status: 200,
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[DATABASE_BACKUP]", error);
    const message =
      error instanceof Error ? error.message : "No se pudo generar la copia de la base de datos.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
