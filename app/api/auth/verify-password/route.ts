import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { password } = await req.json();
    
    if (!password) {
      return new NextResponse("Password is required", { status: 400 });
    }

    // Obtener el usuario actual con su contraseña
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user || !user.password) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Verificar la contraseña
    const isValidPassword = bcrypt.compareSync(password, user.password);
    
    if (!isValidPassword) {
      return new NextResponse("Invalid password", { status: 401 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("[VERIFY_PASSWORD]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 