import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Banknote, Plus } from "lucide-react";
import Link from "next/link";
import { getAccounts } from "@/actions/accounts";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AccountType } from "@prisma/client";
import { TitlePage } from "@/components/title-page";

const getAccountTypeLabel = (type: AccountType) => {
  switch (type) {
    case "BANCARIA":
      return "Bancaria";
    case "EFECTIVO":
      return "Efectivo";
    case "INVERSIONES":
      return "Inversiones";
    case "CREDITO":
      return "Crédito";
    case "OTROS":
      return "Otros";
    default:
      return type;
  }
};

const getAccountTypeColor = (type: AccountType) => {
  switch (type) {
    case "BANCARIA":
      return "bg-blue-100 text-blue-800";
    case "EFECTIVO":
      return "bg-green-100 text-green-800";
    case "INVERSIONES":
      return "bg-purple-100 text-purple-800";
    case "CREDITO":
      return "bg-orange-100 text-orange-800";
    case "OTROS":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

async function AccountsList() {
  const accounts = await getAccounts();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <Card key={account.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{account.name}</CardTitle>
              <Badge className={getAccountTypeColor(account.type)}>
                {getAccountTypeLabel(account.type)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Número: {account.number}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Saldo:</span>
                <span
                  className={`font-bold ${
                    account.balance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency({ value: account.balance, symbol: true })}
                </span>
              </div>
              {account.accountHolder && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Titular:</span>
                  <span className="text-sm">{account.accountHolder}</span>
                </div>
              )}
              {account.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {account.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {accounts.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-muted-foreground mb-4">
            No hay cuentas registradas
          </p>
          <Link href="/dashboard/cuentas/nueva">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Cuenta
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function CuentasPage() {
  return (
    <div className="space-y-6">
      <div className="flex">
        <TitlePage text="Cuentas" icon={Banknote}>
          <Link className={buttonVariants()} href="/dashboard/cuentas/nueva">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cuenta
          </Link>
        </TitlePage>
      </div>

      <Suspense fallback={<div>Cargando cuentas...</div>}>
        <AccountsList />
      </Suspense>
    </div>
  );
}
