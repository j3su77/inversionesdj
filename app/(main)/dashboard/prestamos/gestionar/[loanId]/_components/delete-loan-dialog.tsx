"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Ban, Eye, EyeOff } from "lucide-react";
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
import { Loan, Payment } from "@prisma/client";

interface DeleteLoanDialogProps {
  loan: Loan & {
    client: { fullName: string };
    payments: Payment[];
  };
  trigger?: React.ReactNode;
}

export function DeleteLoanDialog({ loan, trigger }: DeleteLoanDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Siempre cancelar en lugar de eliminar
  const action = "cancelar";
  const actionCapitalized = "Cancelar";

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
      const response = await fetch(`/api/loans/${loan.id}/delete`, {
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
        throw new Error(errorData?.message || `Error al ${action} el préstamo`);
      }

      // No necesitamos usar el resultado, solo verificar que la operación fue exitosa
      await response.json();
      
      toast.success("Préstamo cancelado exitosamente");
      
      setIsOpen(false);
      setShowConfirmAlert(false);
      setPassword("");
      setReason("");
      
      // Redirigir a la lista de préstamos
      router.push("/dashboard/prestamos");
      router.refresh();
    } catch (error) {
      console.error("Error cancelling loan:", error);
      toast.error(
        error instanceof Error ? error.message : `Error al ${action} el préstamo`
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
              <Ban className="h-4 w-4 mr-2" />
              {actionCapitalized} Préstamo
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {actionCapitalized} Préstamo
            </DialogTitle>
            <DialogDescription>
              {/* The original code had a conditional rendering here, but the new logic always shows "cancelar".
                  Keeping the original structure but removing the conditional rendering as it's no longer relevant. */}
              Estás a punto de <strong>cancelar</strong> el préstamo de{" "}
              <strong>{loan.client.fullName}</strong>. El préstamo será marcado como cancelado
              pero se mantendrá el historial de pagos.
            </DialogDescription>
          </DialogHeader>

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
              <Label htmlFor="reason">Razón (opcional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Explica por qué quieres ${action} este préstamo...`}
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
              {actionCapitalized} Préstamo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmAlert} onOpenChange={setShowConfirmAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {/* The original code had a conditional rendering here, but the new logic always shows "cancelar".
                  Keeping the original structure but removing the conditional rendering as it's no longer relevant. */}
              Esta acción cancelará el préstamo. Podrás ver el historial pero no se podrán
              registrar más pagos.
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
              Sí, {action} préstamo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 