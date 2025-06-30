import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  try {
    const values = await req.json();

    if (!session) return new NextResponse("Unauthorized", { status: 401 });
    if (!values.fileUrl) return new NextResponse("Image not inco", { status: 400 });

    // Iniciar transacción
    const result = await db.$transaction(async (tx) => {
      let document = null;
      let existingDocument = null;

      // 1. Buscar documento existente
      existingDocument = await tx.document.findFirst({
        where: { clientId: values.clientId, type: "UTILITY_BILL" },
      });

      // 2. Crear o actualizar documento
      if (existingDocument) {
        document = await tx.document.update({
          where: { id: existingDocument.id },
          data: { ...values },
        });
      } else {
        document = await tx.document.create({
          data: { ...values },
        });
      }

      if (!document || !document.clientId) {
        throw new Error("Documento no creado o sin cliente asociado");
      }

      // 3. Actualizar cliente
       await tx.client.update({
        where: { id: document.clientId },
        data: {
          documents: {
            connect: { id: document.id },
          },
        },
      });

      // 4. Crear registro de auditoría
      // await tx.auditLog.create({
      //   data: {
      //     action: existingDocument ? "UPDATE" : "CREATE",
      //     entity: "Document",
      //     entityId: document.id,
      //     userId: session.user.id!,
      //     oldData: existingDocument ? JSON.stringify(existingDocument) : undefined,
      //     newData: JSON.stringify(document),
      //   },
      // });

      return document;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.log("[CLIENT-UTILITY-BILL-CREATE]", error);
    return new NextResponse("Internal Error: " + error, { status: 500 });
  }
}