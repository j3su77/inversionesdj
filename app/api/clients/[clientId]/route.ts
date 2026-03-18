import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { clientId } = await params;
    const body = await req.json();

    const {
      fullName,
      identification,
      address,
      phone,
      cellphone,
      nationality,
      dateOfBirth,
      placeOfBirth,
      maritalStatus,
      occupation,
      companyName,
      currentPosition,
      companyTenure,
      monthlyIncome,
      workSchedule,
      workplace,
      isDisallowed,
      managedByUserId,
    } = body;

    const data: Record<string, unknown> = {};

    if (fullName != null) data.fullName = fullName;
    if (identification != null) data.identification = Number(identification);
    if (address !== undefined) data.address = address || null;
    if (phone !== undefined) data.phone = phone || null;
    if (cellphone !== undefined) data.cellphone = cellphone || null;
    if (nationality != null) data.nationality = nationality;
    if (dateOfBirth != null) data.dateOfBirth = new Date(dateOfBirth);
    if (placeOfBirth != null) data.placeOfBirth = placeOfBirth;
    if (maritalStatus !== undefined) data.maritalStatus = maritalStatus ?? null;
    if (occupation !== undefined) data.occupation = occupation ?? null;
    if (companyName !== undefined) data.companyName = companyName || null;
    if (currentPosition !== undefined) data.currentPosition = currentPosition || null;
    if (companyTenure !== undefined) data.companyTenure = companyTenure != null ? Number(companyTenure) : null;
    if (monthlyIncome !== undefined) data.monthlyIncome = monthlyIncome != null ? Number(monthlyIncome) : null;
    if (workSchedule !== undefined) data.workSchedule = workSchedule || null;
    if (workplace !== undefined) data.workplace = workplace || null;
    if (isDisallowed !== undefined) data.isDisallowed = Boolean(isDisallowed);

    await db.client.update({
      where: { id: clientId },
      data: data as Parameters<typeof db.client.update>[0]["data"],
    });

    if (managedByUserId !== undefined) {
      const value = managedByUserId === "" || managedByUserId == null ? null : managedByUserId;
      await db.$executeRaw`UPDATE Client SET managedByUserId = ${value} WHERE id = ${clientId}`;
    }

    const client = await db.client.findUnique({
      where: { id: clientId },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("[CLIENT-PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
