import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import {
  IDENTIFICATION_TAKEN_MESSAGE,
  isIdentificationAvailableForNewClient,
  isPrismaUniqueViolation,
} from "@/lib/client-identification";
import { parseClientCreateBody } from "@/lib/client-create-data";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  try {
    const values = await req.json();

    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const parsed = parseClientCreateBody(values);
    if (!parsed.ok) {
      return new NextResponse(parsed.message, { status: parsed.status });
    }

    const { data } = parsed;

    const available = await isIdentificationAvailableForNewClient(
      data.identification,
    );
    if (!available) {
      return new NextResponse(IDENTIFICATION_TAKEN_MESSAGE, { status: 400 });
    }

    const client = await db.client.create({
      data,
    });

    return NextResponse.json(client);
  } catch (error) {
    console.log("[CLIENT-CREATE]", error);
    if (isPrismaUniqueViolation(error)) {
      return new NextResponse(IDENTIFICATION_TAKEN_MESSAGE, { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
