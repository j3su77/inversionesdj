import { buttonVariants } from "@/components/ui/button";
import { authOptions } from "@/lib/auth-options";
import { cn } from "@/lib/utils";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { User, Users } from "lucide-react";
import { TabsClientList } from "./_components/tabs-client-list";
import { TitlePage } from "@/components/title-page";

const ClientPage = async () => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/");
  }

  return (
    <div className="p-6">
      <TitlePage icon={Users} text="Todos los clientes registrados">
        <Link
          className={cn(buttonVariants())}
          href="/dashboard/clientes/agregar"
        >
          <User /> Nuevo cliente
        </Link>
      </TitlePage>

      <TabsClientList />
    </div>
  );
};

export default ClientPage;
