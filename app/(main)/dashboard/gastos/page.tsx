import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TitlePage } from "@/components/title-page";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt, Calendar, Filter } from "lucide-react";
import Link from "next/link";
import { getExpenses } from "@/actions/expenses";
import { formatCurrency, getExpenseCategoryLabel, getExpenseCategoryColor } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExpenseCategory } from "@prisma/client";
import { DeleteExpenseDialog } from "./_components/delete-expense-dialog";

interface ExpensesPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
  }>;
}

async function ExpensesList({ page = 1, category }: { page?: number; category?: string }) {
  try {
    const result = await getExpenses(page, 10, category as ExpenseCategory);
    
    if (!result.success) {
      return (
        <div className="text-center text-red-600 py-8">
          Error al cargar los gastos: {result.error || 'Error desconocido'}
        </div>
      );
    }

    if (!result.data) {
      return (
        <div className="text-center text-red-600 py-8">
          No se pudieron cargar los datos de gastos.
        </div>
      );
    }

    const expenses = result.data.expenses;
    const pagination = result.data.pagination;

    if (expenses.length === 0) {
      return (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay gastos registrados
          </h3>
          <p className="text-gray-500 mb-6">
            Comienza registrando tu primer gasto empresarial.
          </p>
          <Link href="/dashboard/gastos/registrar">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Primer Gasto
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Lista de gastos */}
        <div className="grid gap-4">
          {expenses.map((expense) => (
            <Card key={expense.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{expense.name}</h3>
                      <Badge 
                        className={getExpenseCategoryColor(expense.category)} 
                        variant="outline"
                      >
                        {getExpenseCategoryLabel(expense.category)}
                      </Badge>
                    </div>
                    
                    {expense.description && (
                      <p className="text-gray-600 mb-3">{expense.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(expense.expenseDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </div>
                      {/* <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {expense.expenseAccounts.length} cuenta{expense.expenseAccounts.length !== 1 ? 's' : ''}
                      </div> */}
                    </div>

                    {/* Cuentas utilizadas */}
                    {/* <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {expense.expenseAccounts.map((expenseAccount) => (
                          <div 
                            key={expenseAccount.id}
                            className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center gap-1"
                          >
                            <span className="font-medium">{expenseAccount.account.name}:</span>
                            <span>{formatCurrency({ value: expenseAccount.amount, symbol: true })}</span>
                          </div>
                        ))}
                      </div>
                    </div> */}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-700">
                      {formatCurrency({ value: expense.amount, symbol: true })}
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      {format(new Date(expense.createdAt), "dd/MM/yyyy HH:mm")}
                    </div>
                    <div className="flex justify-end">
                      <DeleteExpenseDialog expense={expense} />
                    </div>
                  </div>
                </div>

                {expense.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      <strong>Notas:</strong> {expense.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
              <Link
                key={pageNum}
                href={`/dashboard/gastos?page=${pageNum}${category ? `&category=${category}` : ''}`}
              >
                <Button
                  variant={pageNum === pagination.page ? "default" : "outline"}
                  size="sm"
                >
                  {pageNum}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error loading expenses:", error);
    return (
      <div className="text-center text-red-600 py-8">
        Error al cargar los gastos. Por favor, intenta de nuevo.
      </div>
    );
  }
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;
  const category = params.category;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <TitlePage text="Gastos" />
        <Link href="/dashboard/gastos/registrar">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Gasto
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard/gastos">
              <Button variant={!category ? "default" : "outline"} size="sm">
                Todos
              </Button>
            </Link>
            {[
              'SERVICIOS_PUBLICOS',
              'ARRIENDO', 
              'NOMINA',
              'MARKETING',
              'TRANSPORTE',
              'SUMINISTROS',
              'TECNOLOGIA',
              'MANTENIMIENTO',
              'SEGUROS',
              'IMPUESTOS',
              'LEGAL',
              'ALIMENTACION',
              'OTROS'
            ].map((cat) => (
              <Link key={cat} href={`/dashboard/gastos?category=${cat}`}>
                <Button 
                  variant={category === cat ? "default" : "outline"} 
                  size="sm"
                  className={category === cat ? "" : getExpenseCategoryColor(cat as ExpenseCategory)}
                >
                  {getExpenseCategoryLabel(cat as ExpenseCategory)}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de gastos */}
      <Suspense fallback={<div>Cargando gastos...</div>}>
        <ExpensesList page={page} category={category} />
      </Suspense>
    </div>
  );
} 