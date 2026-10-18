import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { clientId } = await params;
    const { password, reason } = await req.json();

    if (!password) {
      return new NextResponse("Password is required", { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { message: "La razón de eliminación es obligatoria" },
        { status: 400 }
      );
    }

    // Verificar la contraseña del usuario
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, username: true },
    });

    if (!user || !user.password) {
      return new NextResponse("User not found", { status: 404 });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { message: "Contraseña incorrecta" },
        { status: 401 }
      );
    }

    // Obtener el cliente con sus préstamos activos
    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        loans: {
          where: { status: { in: ["ACTIVE", "PENDING"] } },
          select: { id: true, loanNumber: true, status: true },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { message: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    if (client.deletedAt) {
      return NextResponse.json(
        { message: "El cliente ya fue eliminado" },
        { status: 400 }
      );
    }

    if (client.loans.length > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar el cliente porque tiene ${client.loans.length} préstamo(s) activo(s) o pendiente(s).`,
        },
        { status: 400 }
      );
    }

    // Soft delete: marcar con deletedAt, actualizar status e incluir razón en notes
    const deletedClient = await db.client.update({
      where: { id: clientId },
      data: {
        deletedAt: new Date(),
        activeIdentificationKey: null,
        status: "INACTIVE",
        notes: `Eliminado por ${user.username}: ${reason.trim()}`,
      },
    });

    return NextResponse.json({ client: deletedClient });
  } catch (error) {
    console.error("[DELETE_CLIENT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
