"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loan } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";

type Props = {
  loan: Pick<Loan, "id" | "balance" | "loanNumber">;
  trigger?: React.ReactNode;
};

export function CompleteLoanByAgreementDialog({ loan, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    if (reason.trim().length < 10) {
      toast.error("Describe el acuerdo (mínimo 10 caracteres)");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/loans/${loan.id}/complete-by-agreement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "No se pudo finalizar el préstamo");
      }

      toast.success("Préstamo finalizado por acuerdo");
      setOpen(false);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error inesperado",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (loan.balance <= 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="default" className="mt-4 bg-blue-500 hover:bg-blue-600 cursor-pointer" type="button">
            <Handshake className="h-4 w-4 mr-2" />
            Finalizar por acuerdo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar préstamo por acuerdo</DialogTitle>
          <DialogDescription>
            Marca el préstamo #{loan.loanNumber} como completado sin registrar
            cuotas de saldo. El saldo pendiente queda documentado como condonado
            por acuerdo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm">
            Saldo pendiente:{" "}
            <strong>
              {formatCurrency({ value: loan.balance, symbol: true })}
            </strong>
          </p>
          <div className="space-y-2">
            <Label htmlFor="complete-loan-reason">Acuerdo con el cliente</Label>
            <Textarea
              id="complete-loan-reason"
              placeholder="Ej.: Cliente pagó monto único acordado fuera de cuotas; se condona el resto..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Mínimo 10 caracteres</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Finalizando…
              </>
            ) : (
              "Confirmar cierre"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
