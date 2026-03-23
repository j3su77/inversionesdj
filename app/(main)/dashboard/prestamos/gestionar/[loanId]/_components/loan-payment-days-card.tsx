"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoanPaymentDay, PaymentFrequency } from "@prisma/client";
import {
  frequencyUsesPaymentDayConfig,
  getPaymentDaySlotsForFrequency,
} from "@/lib/loan-payment-days";
import { updateLoanPaymentDays } from "@/actions/loan-payment-days";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";

type Props = {
  loanId: string;
  paymentFrequency: PaymentFrequency;
  paymentDays: LoanPaymentDay[];
};

function slotsLabel(frequency: PaymentFrequency, count: number): string {
  switch (frequency) {
    case "WEEKLY":
      return `${count} días por ciclo de 30 días (ej. semanal)`;
    case "BIWEEKLY":
      return `${count} días por ciclo de 30 días (quincenal)`;
    case "MONTHLY":
      return "1 día de pago por mes comercial (30 días)";
    case "QUARTERLY":
      return "1 día de referencia por ciclo (trimestral)";
    default:
      return "";
  }
}

export function LoanPaymentDaysCard({
  loanId,
  paymentFrequency,
  paymentDays,
}: Props) {
  const slots = getPaymentDaySlotsForFrequency(paymentFrequency);
  const usesConfig = frequencyUsesPaymentDayConfig(paymentFrequency);

  const initialStrings = useMemo(() => {
    const sorted = [...paymentDays].sort((a, b) => a.sortOrder - b.sortOrder);
    const arr = Array.from({ length: slots }, (_, i) => {
      const row = sorted[i];
      return row ? String(row.dayOfCycle) : "";
    });
    return arr;
  }, [paymentDays, slots]);

  const [values, setValues] = useState<string[]>(initialStrings);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValues(initialStrings);
  }, [initialStrings]);

  // Si cambia la frecuencia en servidor (poco común en esta vista), alinear longitud
  const safeValues =
    values.length === slots
      ? values
      : Array.from({ length: slots }, (_, i) => values[i] ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!usesConfig) {
      startTransition(async () => {
        const res = await updateLoanPaymentDays(loanId, []);
        if (res.ok) {
          toast.success("Configuración actualizada");
        } else {
          toast.error(res.error);
        }
      });
      return;
    }

    const parsed: number[] = [];
    for (let i = 0; i < slots; i++) {
      const raw = safeValues[i]?.trim() ?? "";
      if (raw === "") {
        toast.error(`Complete el día de pago ${i + 1}`);
        return;
      }
      const n = Number.parseInt(raw, 10);
      if (Number.isNaN(n)) {
        toast.error(`El día ${i + 1} no es un número válido`);
        return;
      }
      parsed.push(n);
    }

    startTransition(async () => {
      const res = await updateLoanPaymentDays(loanId, parsed);
      if (res.ok) {
        toast.success("Días de pago guardados");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Card className="w-full border border-slate-200 rounded-sm">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5" />
          Días de pago (ciclo de 30 días)
        </CardTitle>
        <CardDescription>
          Los días son del mes comercial de 30 días (1 al 30) y se repiten en cada
          ciclo. Útil para préstamos ya creados o para ajustar el calendario pactado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!usesConfig ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Con frecuencia <strong>diaria</strong> no se definen días fijos: aplica
              todos los días del ciclo. Si había días guardados por error, puedes
              limpiarlos.
            </p>
            {paymentDays.length > 0 && (
              <p className="text-sm">
                Hay {paymentDays.length} registro(s) guardado(s) que no aplican a
                esta frecuencia.
              </p>
            )}
            <Button
              type="button"
              variant="secondary"
              disabled={isPending || paymentDays.length === 0}
              onClick={() => {
                startTransition(async () => {
                  const res = await updateLoanPaymentDays(loanId, []);
                  if (res.ok) {
                    toast.success("Días de pago eliminados");
                  } else {
                    toast.error(res.error);
                  }
                });
              }}
            >
              Limpiar días guardados
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {slotsLabel(paymentFrequency, slots)}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: slots }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Label htmlFor={`payment-day-${loanId}-${i}`}>
                    Día {i + 1}
                  </Label>
                  <Input
                    id={`payment-day-${loanId}-${i}`}
                    type="number"
                    min={1}
                    max={30}
                    inputMode="numeric"
                    placeholder="1–30"
                    value={safeValues[i] ?? ""}
                    onChange={(ev) => {
                      const next = [...safeValues];
                      next[i] = ev.target.value;
                      setValues(next);
                    }}
                  />
                </div>
              ))}
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar días de pago"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
