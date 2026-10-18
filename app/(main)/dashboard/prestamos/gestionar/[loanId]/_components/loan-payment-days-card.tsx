"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CommercialDayPicker } from "@/components/commercial-day-picker";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LoanPaymentDay, PaymentFrequency } from "@prisma/client";
import {
  applyPaymentDaySlotChange,
  frequencyUsesPaymentDayConfig,
  getMinCommercialDayForPaymentSlot,
  getPaymentDaySlotsForFrequency,
  parsePaymentDaySlotValue,
  validatePaymentDaysForFrequency,
} from "@/lib/loan-payment-days";
import { updateLoanPaymentDays } from "@/actions/loan-payment-days";
import { toast } from "sonner";
import { CalendarDays, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  loanId: string;
  paymentFrequency: PaymentFrequency;
  paymentDays: LoanPaymentDay[];
  disbursementDate: Date;
  firstPaymentDate: Date | null;
  nextPaymentDate: Date | null;
  paymentsCount: number;
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

function FirstPaymentDateBlock({
  canEdit,
  disbursementDate,
  value,
  onChange,
}: {
  canEdit: boolean;
  disbursementDate: Date;
  value: Date;
  onChange: (d: Date) => void;
}) {
  if (!canEdit) {
    return (
      <div className="space-y-1 max-w-md">
        <Label>Fecha del primer pago</Label>
        <p className="text-sm rounded-md border bg-muted/40 px-3 py-2">
          {format(value, "PPP", { locale: es })}
        </p>
        <p className="text-xs text-muted-foreground">
          Ya se registró al menos un pago; no se puede modificar el primer
          vencimiento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-w-md">
      <Label>Fecha del primer pago</Label>
      <p className="text-xs text-muted-foreground">
        Primer vencimiento legal. Solo editable antes de la primera cuota.
      </p>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full pl-3 text-left font-normal justify-between",
            )}
          >
            {format(value, "PPP", { locale: es })}
            <CalendarIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              if (date) onChange(startOfDay(date));
            }}
            disabled={(date) => date < startOfDay(disbursementDate)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function LoanPaymentDaysCard({
  loanId,
  paymentFrequency,
  paymentDays,
  disbursementDate,
  firstPaymentDate,
  nextPaymentDate,
  paymentsCount,
}: Props) {
  const slots = getPaymentDaySlotsForFrequency(paymentFrequency);
  const usesConfig = frequencyUsesPaymentDayConfig(paymentFrequency);
  const canEditFirstPayment = paymentsCount === 0;

  const initialFirstPayment = useMemo(
    () =>
      startOfDay(
        new Date(firstPaymentDate ?? nextPaymentDate ?? disbursementDate),
      ),
    [firstPaymentDate, nextPaymentDate, disbursementDate],
  );

  const initialStrings = useMemo(() => {
    const sorted = [...paymentDays].sort((a, b) => a.sortOrder - b.sortOrder);
    const arr = Array.from({ length: slots }, (_, i) => {
      const row = sorted[i];
      return row ? String(row.dayOfCycle) : "";
    });
    return arr;
  }, [paymentDays, slots]);

  const [values, setValues] = useState<string[]>(initialStrings);
  const [firstPayment, setFirstPayment] = useState<Date>(initialFirstPayment);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValues(initialStrings);
  }, [initialStrings]);

  useEffect(() => {
    setFirstPayment(initialFirstPayment);
  }, [initialFirstPayment]);

  const safeValues =
    values.length === slots
      ? values
      : Array.from({ length: slots }, (_, i) => values[i] ?? "");

  const saveSchedule = (days: number[]) => {
    startTransition(async () => {
      const res = await updateLoanPaymentDays(loanId, {
        days,
        firstPaymentDate: canEditFirstPayment
          ? firstPayment.toISOString()
          : undefined,
      });
      if (res.ok) {
        toast.success("Calendario de cobro guardado");
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!usesConfig) {
      saveSchedule([]);
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

    const dayValidation = validatePaymentDaysForFrequency(
      paymentFrequency,
      parsed,
    );
    if (!dayValidation.ok) {
      toast.error(dayValidation.message);
      return;
    }

    saveSchedule(parsed);
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSchedule([]);
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Con frecuencia <strong>diaria</strong> no se definen días fijos: aplica
              todos los días del ciclo. Si había días guardados por error, puedes
              limpiarlos.
            </p>
            <FirstPaymentDateBlock
              canEdit={canEditFirstPayment}
              disbursementDate={disbursementDate}
              value={firstPayment}
              onChange={setFirstPayment}
            />
            {paymentDays.length > 0 && (
              <p className="text-sm">
                Hay {paymentDays.length} registro(s) guardado(s) que no aplican a
                esta frecuencia.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando…" : "Guardar calendario"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isPending || paymentDays.length === 0}
                onClick={() => saveSchedule([])}
              >
                Limpiar días guardados
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FirstPaymentDateBlock
              canEdit={canEditFirstPayment}
              disbursementDate={disbursementDate}
              value={firstPayment}
              onChange={setFirstPayment}
            />
            <p className="text-sm text-muted-foreground">
              {slotsLabel(paymentFrequency, slots)}. Cada día debe ser mayor o
              igual al anterior en el ciclo.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: slots }, (_, i) => {
                const value = parsePaymentDaySlotValue(safeValues[i]);
                const minDay = getMinCommercialDayForPaymentSlot(
                  safeValues,
                  i,
                );
                const previousFilled =
                  i === 0 ||
                  parsePaymentDaySlotValue(safeValues[i - 1]) != null;

                return (
                  <div key={i} className="space-y-2">
                    <Label htmlFor={`payment-day-${loanId}-${i}`}>
                      Día {i + 1}
                    </Label>
                    <CommercialDayPicker
                      id={`payment-day-${loanId}-${i}`}
                      value={value}
                      minDay={minDay}
                      disabled={!previousFilled}
                      excludedDays={safeValues
                        .map((v, j) =>
                          j !== i ? parsePaymentDaySlotValue(v) : null,
                        )
                        .filter(
                          (n): n is number => n != null && !Number.isNaN(n),
                        )}
                      onChange={(day) => {
                        setValues(
                          applyPaymentDaySlotChange(safeValues, i, day),
                        );
                      }}
                    />
                  </div>
                );
              })}
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
