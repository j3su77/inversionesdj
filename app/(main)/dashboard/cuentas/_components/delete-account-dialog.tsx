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
import { Account, AccountType } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";

interface DeleteAccountDialogProps {
  account: Account;
  trigger?: React.ReactNode;
}

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

export function DeleteAccountDialog({ account, trigger }: DeleteAccountDialogProps) {
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
      const response = await fetch(`/api/accounts/${account.id}/delete`, {
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
        const errorText = await response.text();
        
        // Manejar errores específicos
        if (response.status === 400) {
          if (errorText.includes("active loans")) {
            throw new Error("No se puede eliminar la cuenta porque tiene préstamos activos asociados");
          } else if (errorText.includes("active expenses")) {
            throw new Error("No se puede eliminar la cuenta porque tiene gastos activos asociados");
          }
        }
        
        throw new Error(errorText || "Error al eliminar la cuenta");
      }

      await response.json();
      
      toast.success("Cuenta eliminada exitosamente", {
        description: "La cuenta ha sido marcada como eliminada",
      });
      
      setIsOpen(false);
      setShowConfirmAlert(false);
      setPassword("");
      setReason("");
      
      // Refrescar la página actual
      router.refresh();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar la cuenta"
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
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Eliminar Cuenta
            </DialogTitle>
            <DialogDescription>
              Estás a punto de eliminar la cuenta <strong>{`"${account.name}"`}</strong> 
              ({getAccountTypeLabel(account.type)}) con saldo de{" "}
              <strong>{formatCurrency({ value: account.balance, symbol: true })}</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Información de la cuenta */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-medium text-red-900 mb-2">
              ⚠️ Información de la cuenta:
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-red-800">Nombre:</span>
                <span className="font-medium text-red-900">{account.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-800">Número:</span>
                <span className="font-medium text-red-900">{account.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-800">Tipo:</span>
                <span className="font-medium text-red-900">{getAccountTypeLabel(account.type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-800">Saldo actual:</span>
                <span className="font-medium text-red-900">
                  {formatCurrency({ value: account.balance, symbol: true })}
                </span>
              </div>
              {account.accountHolder && (
                <div className="flex justify-between">
                  <span className="text-red-800">Titular:</span>
                  <span className="font-medium text-red-900">{account.accountHolder}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Esta acción marcará la cuenta como eliminada. 
              La cuenta no aparecerá en la lista pero se mantendrá en el historial 
              para auditoría. No se puede eliminar si tiene préstamos activos o gastos asociados.
            </p>
          </div>

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
                placeholder="Explica por qué quieres eliminar esta cuenta..."
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
              Eliminar Cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmAlert} onOpenChange={setShowConfirmAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará la cuenta como eliminada permanentemente. 
              La cuenta no aparecerá en la lista pero se mantendrá en el historial 
              para auditoría. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmAlert(false)}>
              No, cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sí, eliminar cuenta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 