"use client";

import { useState, useEffect } from "react";
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
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loan, InterestType, Payment } from "@prisma/client";
import { FormattedInput } from "@/components/ui/formatted-input";
import {
  // PaymentAccountSelector,
  // AccountSelection,
} from "@/components/ui/account-selector";
// import { getAccounts } from "@/actions/accounts";
import { calculateNextPaymentDate } from "@/actions/loans";

interface PaymentFormProps {
  loan: Loan & { payments?: Payment[] };
  onSuccess?: () => void;
}

// Función para calcular el interés diario
// Interés mensual = monto * tasa / 100
// Interés diario = interés mensual / 30
const calculateDailyInterest = (amount: number, interestRate: number): number => {
  const monthlyInterest = amount * (interestRate / 100);
  return monthlyInterest / 30;
};

// Función para calcular el interés según días transcurridos
const calculateInterestByDays = (
  amount: number,
  interestRate: number,
  days: number
): number => {
  const dailyInterest = calculateDailyInterest(amount, interestRate);
  return dailyInterest * days;
};

export function PaymentForm({ loan, onSuccess }: PaymentFormProps) {
  const router = useRouter();
  // const [accounts, setAccounts] = useState<Account[]>([]);
  // const [selectedAccounts, setSelectedAccounts] = useState<AccountSelection[]>(
  //   []
  // );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Calcular el monto base de capital por cuota
  const baseCapitalAmount = Math.round(loan.totalAmount / loan.installments);
  
  // Función para normalizar una fecha (establecer a medianoche para evitar problemas de zona horaria)
  const normalizeDate = (date: Date | string): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Función para calcular el interés basado en días transcurridos
  const calculateCurrentInterest = (paymentDate: Date): number => {
    // Obtener la fecha de referencia (último pago o fecha de inicio)
    const payments = loan.payments || [];
    const lastPayment = payments.length > 0
      ? payments.reduce((latest, payment) => 
          new Date(payment.paymentDate) > new Date(latest.paymentDate) ? payment : latest
        )
      : null;
    
    // Normalizar fechas para evitar problemas de zona horaria
    const normalizedPaymentDate = normalizeDate(paymentDate);
    const referenceDate = lastPayment 
      ? normalizeDate(lastPayment.paymentDate)
      : normalizeDate(loan.startDate);
    
    const daysElapsed = Math.max(1, Math.floor(
      (normalizedPaymentDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
    ));
    
    // Calcular el interés base según días transcurridos
    let baseInterest = 0;
    if (loan.interestType === InterestType.FIXED) {
      baseInterest = calculateInterestByDays(loan.totalAmount, loan.interestRate, daysElapsed);
    } else {
      baseInterest = calculateInterestByDays(loan.balance, loan.interestRate, daysElapsed);
    }
    
    // Sumar el interés pendiente del último pago (si existe)
    const lastPaymentPendingInterest = (lastPayment as any)?.pendingInterest || 0;
    return baseInterest + lastPaymentPendingInterest;
  };
  
  // Calcular el interés actual (se actualizará cuando cambie la fecha de pago)
  const getInitialInterest = () => {
    const today = new Date();
    return Math.round(calculateCurrentInterest(today));
  };
  
  const [currentInterest, setCurrentInterest] = useState(getInitialInterest());
  // Calcular el capital para préstamos DECREASING
  const decreasingCapital = baseCapitalAmount; // Siempre es el monto base de capital

  // Mover el schema aquí para poder usar loan.balance
  const formSchema = z
    .object({
      paymentDate: z.date({
        required_error: "La fecha de pago es requerida",
      }),
      nextPaymentDate: z.date({
        required_error: "La fecha del próximo pago es requerida",
      }),
      capitalAmount: z.coerce
        .number()
        .min(0, "El monto de capital no puede ser negativo"),
      interestAmount: z.coerce
        .number()
        .min(0, "El monto de interés no puede ser negativo"),
      notes: z.string().optional(),
      // accounts: z
      //   .array(
      //     z.object({
      //       accountId: z.string(),
      //       amount: z.number().positive("El monto debe ser mayor a 0"),
      //     })
      //   )
      //   .min(1, "Debe seleccionar al menos una cuenta de destino"),
    })
    .refine(
      (data) => {
        // Validar que al menos uno de los montos sea mayor a 0
        return data.capitalAmount > 0 || data.interestAmount > 0;
      },
      {
        message:
          "Al menos uno de los montos (capital o interés) debe ser mayor a 0",
        path: ["capitalAmount", "interestAmount"],
      }
    )
    .refine(
      (data) => {
        // Validar que el capital a pagar no sea mayor al saldo pendiente (con tolerancia de 1 peso)
        return data.capitalAmount <= loan.balance + 1;
      },
      {
        message:
          "El monto de capital no puede ser mayor al saldo pendiente del préstamo",
        path: ["capitalAmount"],
      }
    )
    // .refine(
    //   (data) => {
    //     // Validar que el total asignado a las cuentas coincida con el monto del pago
    //     const totalAssigned = data.accounts.reduce(
    //       (sum, acc) => sum + acc.amount,
    //       0
    //     );
    //     const paymentAmount = data.capitalAmount + data.interestAmount;
    //     return Math.abs(totalAssigned - paymentAmount) < 2.0; // Aumentar tolerancia a 2 pesos
    //   },
    //   {
    //     message:
    //       "El total asignado a las cuentas debe coincidir con el monto del pago (tolerancia de ±2 pesos)",
    //     path: ["accounts"],
    //   }
    // )
    .refine(
      (data) => {
        // Validar que la próxima fecha de pago sea posterior a la fecha de pago actual
        return data.nextPaymentDate > data.paymentDate;
      },
      {
        message:
          "La fecha del próximo pago debe ser posterior a la fecha de pago actual",
        path: ["nextPaymentDate"],
      }
    );

  type FormValues = z.infer<typeof formSchema>;

  const [calculatedPayment, setCalculatedPayment] = useState(() => {
    const capital = baseCapitalAmount;
    const interest = getInitialInterest();
    const total = capital + interest;
    return { capital, interest, total };
  });

  console.log({ baseCapitalAmount });

  console.log({
    loanType: loan.interestType,
    feeAmount: loan.feeAmount,
    currentInterest,
    decreasingCapital,
    baseCapitalAmount,
  });

  const initialAmount = baseCapitalAmount + currentInterest;

  console.log({ initialAmount , baseCapitalAmount, currentInterest});

  // Calcular el capital inicial: si baseCapitalAmount es mayor al balance, usar el balance
  const initialCapitalAmount = Math.min(baseCapitalAmount, loan.balance);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentDate: new Date(),
      nextPaymentDate: new Date(),
      capitalAmount: initialCapitalAmount,
      interestAmount: currentInterest,
      // accounts: [],
      notes: "",
    },
    mode: "onBlur",
  });

  // Cargar cuentas disponibles
  // useEffect(() => {
  //   const loadAccounts = async () => {
  //     try {
  //       const accountsData = await getAccounts();
  //       setAccounts(accountsData);
  //     } catch (error) {
  //       console.error("Error loading accounts:", error);
  //       toast.error("Error al cargar las cuentas");
  //     }
  //   };
  //   loadAccounts();
  // }, []);

  // Actualizar el formulario cuando cambien las cuentas seleccionadas
  // useEffect(() => {
  //   form.setValue("accounts", selectedAccounts);
  // }, [selectedAccounts, form]);

  useEffect(() => {
    console.log({
      calculatedPayment,
    });
  }, [calculatedPayment]);

  const { watch } = form;
  const capitalAmount = watch("capitalAmount");
  const interestAmount = watch("interestAmount");

  console.log("=== FORM VALUES DEBUG ===");
  console.log("capitalAmount:", capitalAmount, "type:", typeof capitalAmount);
  console.log("interestAmount:", interestAmount, "type:", typeof interestAmount);
  console.log("loan.balance:", loan.balance);

  // Detectar si el usuario está cerca del saldo total y sugerir el monto exacto
  const isNearFullBalance = capitalAmount && Math.abs(Number(capitalAmount) - loan.balance) <= 5;
  const shouldSuggestFullBalance = isNearFullBalance && Number(capitalAmount) < loan.balance;

  // Calcular el monto total del pago para el selector de cuentas
  const totalPaymentAmount = Number(capitalAmount || 0) + Number(interestAmount || 0);

  console.log({
    totalPaymentAmount,
    capitalAmountNumber: Number(capitalAmount || 0),
    interestAmountNumber: Number(interestAmount || 0),
  });

  // Actualizar el interés cuando cambia la fecha de pago
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "paymentDate" && value.paymentDate) {
        const newInterest = Math.round(calculateCurrentInterest(value.paymentDate));
        setCurrentInterest(newInterest);
        form.setValue("interestAmount", newInterest);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Ajustar automáticamente el capitalAmount si es mayor al saldo pendiente
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.capitalAmount) {
        const capitalValue = Number(value.capitalAmount);
        if (capitalValue > loan.balance) {
          // Si el capital a pagar es mayor al saldo pendiente, ajustarlo al saldo pendiente
          form.setValue("capitalAmount", loan.balance);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, loan.balance]);

  // Actualizar el capital e interés cuando cambia el tipo de interés o frecuencia
  useEffect(() => {
    // Asegurar que el capital no sea mayor al saldo pendiente
    const adjustedCapital = Math.min(baseCapitalAmount, loan.balance);
    form.setValue("capitalAmount", adjustedCapital);
    form.setValue("interestAmount", currentInterest);
  }, [
    loan.interestType,
    loan.paymentFrequency,
    baseCapitalAmount,
    loan.balance,
    form,
    currentInterest,
  ]);

  // Calcular los montos de capital e interés basados en el tipo de préstamo
  useEffect(() => {
    console.log({ hola: { capitalAmount, interestAmount } });
    if (capitalAmount && interestAmount) {
      const capitalNum = Number(capitalAmount);
      const interestNum = Number(interestAmount);
      setCalculatedPayment({
        capital: capitalNum,
        interest: interestNum,
        total: capitalNum + interestNum,
      });
    }
  }, [
    currentInterest,
    capitalAmount,
    interestAmount,
    loan.interestType,
    decreasingCapital,
  ]);

  useEffect(() => {
    console.log({
      calculatedPayment,
    });
  }, [calculatedPayment]);

  // Función para calcular automáticamente la próxima fecha de pago
  const calculateAndSetNextPaymentDate = async (paymentDate: Date) => {
    console.log("Calculating next payment date for:", paymentDate);
    try {
      const result = await calculateNextPaymentDate(loan.id, paymentDate);
      console.log("Calculate result:", result);
      if (result.success && result.nextPaymentDate) {
        console.log("Setting next payment date:", result.nextPaymentDate);
        form.setValue("nextPaymentDate", result.nextPaymentDate);
      } else {
        console.log("Failed to calculate or no next payment date");
      }
    } catch (error) {
      console.error("Error calculating next payment date:", error);
    }
  };

  // Efecto para calcular automáticamente la próxima fecha cuando cambia la fecha de pago
  useEffect(() => {
    console.log(" Setting up form watch subscription");
    const subscription = form.watch((value, { name }) => {
      console.log(" Form watch triggered - name:", name, "value:", value);
      if (name === "paymentDate" && value.paymentDate) {
        console.log(" Payment date changed, calculating next payment date");
        calculateAndSetNextPaymentDate(value.paymentDate);
      }
    });

    return () => {
      console.log("🧹 Cleaning up form watch subscription");
      subscription.unsubscribe();
    };
  }, [form, loan.id]);

  // También calcular la fecha inicial cuando se monta el componente
  useEffect(() => {
    console.log("🚀 Component mounted, calculating initial next payment date");
    const initialPaymentDate = form.getValues("paymentDate");
    console.log("📅 Initial payment date:", initialPaymentDate);
    if (initialPaymentDate) {
      calculateAndSetNextPaymentDate(initialPaymentDate);
    }
  }, []);

  // Validar si el formulario está completo y válido
  const isFormValid = () => {
    const values = form.getValues();

    // Verificar campos obligatorios básicos
    if (!values.paymentDate || !values.nextPaymentDate) {
      return false;
    }

    // Verificar que la próxima fecha sea posterior a la fecha de pago
    if (values.nextPaymentDate <= values.paymentDate) {
      return false;
    }

    // Verificar cuentas seleccionadas
    // if (!values.accounts || values.accounts.length === 0) {
    //   return false;
    // }

    // Verificar que el total asignado a cuentas coincida con el monto del pago
    // const totalAssigned = values.accounts.reduce(
    //   (sum, acc) => sum + acc.amount,
    //   0
    // );
    // const paymentAmount = Number(values.capitalAmount) + Number(values.interestAmount);

    // if (Math.abs(totalAssigned - paymentAmount) > 2.0) { // Aumentar tolerancia a 2 pesos
    //   return false;
    // }

    // Verificar montos según el tipo de pago
    if (Number(values.capitalAmount) < 0 || Number(values.interestAmount) < 0) {
      return false;
    }
    if (Number(values.capitalAmount) === 0 && Number(values.interestAmount) === 0) {
      return false;
    }
    // Permitir tolerancia de 1 peso para saldos completos
    if (Number(values.capitalAmount) > loan.balance + 1) {
      return false;
    }

    return true;
  };

  // Observar cambios en el formulario para actualizar el estado del botón
  watch(); // Necesario para que se actualice isValid cuando cambian los valores
  const isValid = isFormValid();

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/loans/${loan.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          paymentDate: values.paymentDate,
          // nextPaymentDate ya no se envía, el backend lo calcula automáticamente
          // basándose en la fecha programada original del préstamo
          amount: Number(values.capitalAmount) + Number(values.interestAmount),
          notes: values.notes,
          capitalAmount: Number(values.capitalAmount),
          interestAmount: Number(values.interestAmount),
          // accounts: values.accounts,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al registrar el pago");
      }

      setIsSuccess(true);
      toast.success("Pago registrado correctamente");

      // Esperar un poco antes de redirigir para mostrar el estado de éxito
      setTimeout(() => {
        router.push(`/dashboard/prestamos/gestionar/${loan.id}`);
        onSuccess?.();
      }, 1500);
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al registrar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <Card className="relative">
      {(isSubmitting || isSuccess) && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center space-y-4">
            {isSuccess ? (
              <>
                <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-green-600">
                    ¡Pago registrado exitosamente!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Redirigiendo a la página del préstamo...
                  </p>
                </div>
              </>
            ) : (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                <div className="text-center">
                  <p className="text-lg font-medium">Procesando pago...</p>
                  <p className="text-sm text-muted-foreground">
                    Por favor espere, no cierre esta ventana
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <CardHeader>
        <CardTitle>Registrar Pago</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 rounded bg-blue-100 text-blue-800 border border-blue-300">
          <strong>Información de Interés:</strong> El interés se calcula diariamente según los días transcurridos desde el último pago.
          <div className="mt-2 text-sm">
            <div>• Interés diario: {formatCurrency({ 
              value: Math.round(calculateDailyInterest(
                loan.interestType === InterestType.FIXED ? loan.totalAmount : loan.balance,
                loan.interestRate
              )), 
              symbol: true 
            })}</div>
            {(() => {
              const payments = loan.payments || [];
              const lastPayment = payments.length > 0
                ? payments.reduce((latest, payment) => 
                    new Date(payment.paymentDate) > new Date(latest.paymentDate) ? payment : latest
                  )
                : null;
              const lastPaymentPendingInterest = (lastPayment as any)?.pendingInterest || 0;
              return lastPaymentPendingInterest > 0 ? (
                <div className="text-orange-700 font-semibold">
                  • Interés pendiente de cuotas anteriores: {formatCurrency({ value: lastPaymentPendingInterest, symbol: true })}
                </div>
              ) : null;
            })()}
            <div className="font-semibold">• Interés calculado para esta fecha: {formatCurrency({ value: currentInterest, symbol: true })}</div>
            {(() => {
              const payments = loan.payments || [];
              const lastPayment = payments.length > 0
                ? payments.reduce((latest, payment) => 
                    new Date(payment.paymentDate) > new Date(latest.paymentDate) ? payment : latest
                  )
                : null;
              const lastPaymentPendingInterest = (lastPayment as any)?.pendingInterest || 0;
              return lastPaymentPendingInterest > 0 ? (
                <div className="text-xs mt-1 text-blue-700">
                  (Incluye interés pendiente de cuotas anteriores)
                </div>
              ) : null;
            })()}
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Pago</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild className="max-w-sm">
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
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
                        // disabled={(date) => date > new Date()}
                        initialFocus
                        defaultMonth={watch("paymentDate")}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 max-w-sm">
              <FormField
                control={form.control}
                name="capitalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto de Capital</FormLabel>
                    <FormControl>
                      <FormattedInput
                        placeholder="0"
                        {...field}
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    {shouldSuggestFullBalance && (
                      <FormDescription>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-blue-600"
                          onClick={() => form.setValue("capitalAmount", loan.balance)}
                        >
                         ¿Quieres saldar el préstamo? Haz clic para usar el saldo exacto: {formatCurrency({ value: loan.balance, symbol: true })}
                        </Button>
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interestAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto de Interés</FormLabel>
                    <FormControl>
                      <FormattedInput
                        placeholder="0"
                        {...field}
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      El interés se calcula automáticamente según los días transcurridos desde el último pago.
                      
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Capital</p>
                <p className="text-lg">
                  {formatCurrency({
                    value: calculatedPayment.capital,
                    symbol: true,
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Interés</p>
                <p className="text-lg">
                  {formatCurrency({
                    value: calculatedPayment.interest,
                    symbol: true,
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-lg font-bold">
                  {formatCurrency({
                    value: calculatedPayment.total,
                    symbol: true,
                  })}
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones sobre el pago..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* PaymentAccountSelector - Comentado para la primera etapa */}
            {/* <PaymentAccountSelector
              accounts={accounts}
              selectedAccounts={selectedAccounts}
              totalAmount={totalPaymentAmount}
              onAccountSelect={(accounts) => {
                form.setValue("accounts", accounts);
                setSelectedAccounts(accounts);
              }}
            /> */}

            <Card className="col-span-full bg-orange-200 hidden">
              <CardHeader>
                <CardTitle>Fecha del Próximo Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="nextPaymentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col max-w-sm">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
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
                            disabled={(date) => date <= new Date()}
                            defaultMonth={watch("nextPaymentDate")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Se calcula automáticamente basado en la frecuencia de
                        pago del préstamo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Registrar Pago"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
