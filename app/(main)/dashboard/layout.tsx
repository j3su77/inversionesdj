import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Providers } from "@/components/providers/providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  console.log({ session });
  if (!session) {
    redirect("/");
  }

  return (
    <Providers>
      <main className="flex-1 overflow-auto w-full">{children}</main>
    </Providers>
  );
}
