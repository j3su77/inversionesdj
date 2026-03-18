import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Providers } from "@/components/providers/providers";
import { BackButton } from "./_components/back-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/");
  }

  return (
    <Providers>
      <main className="overflow-auto w-full border-none">
        <div className="p-4 md:p-6">
          <BackButton />
          {children}
        </div>
      </main>
    </Providers>
  );
}
