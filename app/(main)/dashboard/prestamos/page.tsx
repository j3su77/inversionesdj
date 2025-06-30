import { buttonVariants } from "@/components/ui/button";
import { authOptions } from "@/lib/auth-options";
import { cn } from "@/lib/utils";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Banknote, HandCoins } from "lucide-react";
import { TitlePage } from "@/components/title-page";

import { TabsLoanList } from "./_components/tabs-loan-list";

const LoanPage = async () => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/");
  }

  return (
    <div className="p-6">
      <TitlePage icon={HandCoins} text="Todos los prestamos registrados">
        <Link
          className={cn(buttonVariants())}
          href="/dashboard/prestamos/registrar"
        >
          <Banknote /> Nuevo prestamo
        </Link>
      </TitlePage>

      <TabsLoanList />
    </div>
  );
};

export default LoanPage;
