import { Suspense } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TitlePage } from "@/components/title-page";
import { ExpenseForm } from "./_components/expense-form";
// import { getAccounts } from "@/actions/accounts";

async function ExpenseFormContent() {
  try {
    // const accounts = await getAccounts();
    return <ExpenseForm 
    // accounts={accounts}
     />;
  } catch (error) {
    console.error("Error loading accounts:", error);
    return (
      <div className="text-center text-red-600">
        Error al cargar las cuentas. Por favor, intenta de nuevo.
      </div>
    );
  }
}

export default function RegisterExpensePage() {
  return (
    <div className="container mx-auto py-6">
      <TitlePage text="Registrar Gasto" />
      <Suspense fallback={
        <Card>
          <CardHeader className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent className="animate-pulse">
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      }>
        <ExpenseFormContent />
      </Suspense>
    </div>
  );
} 