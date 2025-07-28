"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Expense } from "@prisma/client";
// import { ExpenseAccount, Account } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";

interface DeleteExpenseDialogProps {
  expense: Expense & {
    // expenseAccounts: (ExpenseAccount & { account: Account })[];
  };
  trigger?: React.ReactNode;
}

export function DeleteExpenseDialog({ expense, trigger }: DeleteExpenseDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = () => {
    if (!password.trim()) {
      toast.error("La contraseña es requerida");
      return;
    }
    setShowConfirmAlert(true);
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/expenses/${expense.id}/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          reason: reason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Error al eliminar el gasto");
      }

      await response.json();
      
      toast.success("Gasto eliminado exitosamente", {
        // description: "El dinero ha sido devuelto a las cuentas correspondientes",
        description: "El gasto ha sido eliminado exitosamente",
      });
      
      setIsOpen(false);
      setShowConfirmAlert(false);
      setPassword("");
      setReason("");
      
      // Refrescar la página actual
      router.refresh();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar el gasto"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setShowConfirmAlert(false);
    setPassword("");
    setReason("");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 " />
            
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Eliminar Gastos
            </DialogTitle>
            <DialogDescription>
              Estás a punto de eliminar el gasto <strong>{`"${expense.name}"`}</strong> por valor de{" "}
              <strong>{formatCurrency({ value: expense.amount, symbol: true })}</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Mostrar información de las cuentas que recibirán el dinero de vuelta */}
          {/* <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">
              💰 Dinero que será devuelto a las cuentas:
            </h4>
            <div className="space-y-2">
              {expense.expenseAccounts.map((expenseAccount) => (
                <div 
                  key={expenseAccount.id}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-blue-800">{expenseAccount.account.name}</span>
                  <span className="font-medium text-blue-900">
                    +{formatCurrency({ value: expenseAccount.amount, symbol: true })}
                  </span>
                </div>
              ))}
            </div>
          </div> */}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Confirma tu contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Razón de la eliminación (opcional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explica por qué quieres eliminar este gasto..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSubmit}
              disabled={!password.trim()}
            >
              Eliminar Gasto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmAlert} onOpenChange={setShowConfirmAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará el gasto como eliminado.
              {/* El gasto no aparecerá en la lista pero se mantendrá en el 
              historial para auditoría. */}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmAlert(false)}>
              No, cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Sí, eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 