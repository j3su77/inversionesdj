import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  try {
      const values = await req.json()

      if(!session) return new NextResponse("Unauthorized", {status: 401})

      const existingClient = await db.client.findUnique({
          where: { identification: values.identification, deletedAt: null}
      });
      
      if (existingClient) {
          return new NextResponse("Número de documento ya registrado", { status: 400 });
      }
      

      const client = await db.client.create({
          data: {
              ...values
          }
      })

      return NextResponse.json(client)
      
  } catch (error) {
      console.log("[CLIENT-CREATE]", error)
      return new NextResponse("Internal Error", { status: 500 })
  }
}