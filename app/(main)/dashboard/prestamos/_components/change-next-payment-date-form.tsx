"use client";

import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loan } from "@prisma/client";

const formSchema = z.object({
  nextPaymentDate: z.date({
    required_error: "Seleccione la nueva fecha del próximo pago",
  }),
  reason: z.string().min(10, "La razón debe tener al menos 10 caracteres"),
});

type FormValues = z.infer<typeof formSchema>;

interface ChangeNextPaymentDateFormProps {
  loan: Loan;
  onSuccess?: () => void;
  /** Para sincronizar UI local si el padre muestra la fecha desde props. */
  onDateApplied?: (date: Date) => void;
  trigger?: React.ReactNode;
}

export function ChangeNextPaymentDateForm({
  loan,
  onSuccess,
  onDateApplied,
  trigger,
}: ChangeNextPaymentDateFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: "",
    },
  });

  const { isSubmitting, isValid } = form.formState;

  useEffect(() => {
    if (!isOpen) return;
    const base = loan.nextPaymentDate
      ? new Date(loan.nextPaymentDate)
      : new Date();
    form.reset({
      nextPaymentDate: base,
      reason: "",
    });
  }, [isOpen, loan.nextPaymentDate, loan.id, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await fetch(
        `/api/loans/${loan.id}/change-next-payment-date`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nextPaymentDate: values.nextPaymentDate.toISOString(),
            reason: values.reason,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message ?? "Error al actualizar la fecha del próximo pago",
        );
      }

      onDateApplied?.(values.nextPaymentDate);

      toast.success("Fecha del próximo pago actualizada", {
        description: format(values.nextPaymentDate, "dd/MM/yyyy", {
          locale: es,
        }),
      });

      setIsOpen(false);
      form.reset();
      router.refresh();
      onSuccess?.();
    } catch (error) {
      console.error("Error change next payment date:", error);
      toast.error("No se pudo actualizar la fecha", {
        description:
          error instanceof Error ? error.message : "Ocurrió un error inesperado",
      });
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" type="button">
            Cambiar fecha
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="!max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Próximo pago programado
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Estado actual</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Préstamo: </span>
              <span className="font-medium">{loan.loanNumber}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Fecha actual: </span>
              <span className="font-medium">
                {loan.nextPaymentDate
                  ? format(new Date(loan.nextPaymentDate), "dd/MM/yyyy", {
                      locale: es,
                    })
                  : "Sin definir"}
              </span>
            </p>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nextPaymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Nueva fecha del próximo pago</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                          type="button"
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Seleccione una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Ajuste la fecha en la que vence la próxima cuota. Quedará
                    registrado en el historial del préstamo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo del cambio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej.: Acuerdo verbal con el cliente para posponer una semana por imprevisto."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !isValid}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
