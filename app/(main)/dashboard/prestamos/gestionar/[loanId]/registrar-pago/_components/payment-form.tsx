"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2, Info } from "lucide-react";
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
import { Loan, InterestType, Account } from "@prisma/client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { FormattedInput } from "@/components/ui/formatted-input";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentAccountSelector, AccountSelection } from "@/components/ui/account-selector";
import { getAccounts } from "@/actions/accounts";

interface PaymentFormProps {
  loan: Loan;
  onSuccess?: () => void;
}

export function PaymentForm({ loan, onSuccess }: PaymentFormProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<AccountSelection[]>([]);

  // Calcular el monto base de capital por cuota
  const baseCapitalAmount = loan.totalAmount / loan.installments;
  // Calcular el interés actual (incluye interés pendiente acumulado)
  const currentInterest =
    loan.interestType === InterestType.FIXED
      ? (loan.fixedInterestAmount || 0) + (loan.pendingInterest || 0)
      : loan.balance * (loan.interestRate / 100) + (loan.pendingInterest || 0);
  // Calcular el monto total de la cuota actual
  const currentInstallmentAmount =
    loan.currentInstallmentAmount ||
    (loan.interestType === InterestType.FIXED
      ? loan.feeAmount + (loan.pendingInterest || 0)
      : baseCapitalAmount + currentInterest);
  // Calcular el capital para préstamos DECREASING
  const decreasingCapital = baseCapitalAmount; // Siempre es el monto base de capital

  // Mover el schema aquí para poder usar loan.balance
  const formSchema = z
    .object({
      paymentDate: z.date({
        required_error: "La fecha de pago es requerida",
      }),
      splitPayment: z.boolean(),
      amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
      capitalAmount: z.coerce
        .number()
        .min(0, "El monto de capital no puede ser negativo")
        .optional(),
      interestAmount: z.coerce
        .number()
        .min(0, "El monto de interés no puede ser negativo")
        .optional(),
      notes: z.string().optional(),
      accounts: z.array(z.object({
        accountId: z.string(),
        amount: z.number().positive("El monto debe ser mayor a 0"),
      })).min(1, "Debe seleccionar al menos una cuenta de destino"),
    })
    .refine(
      (data) => {
        if (data.splitPayment) {
          return (
            data.capitalAmount !== undefined &&
            data.interestAmount !== undefined
          );
        }
        return true;
      },
      {
        message:
          "Los montos de capital e interés son requeridos cuando se divide el pago",
        path: ["capitalAmount", "interestAmount"],
      }
    )
    .refine(
      (data) => {
        // Validar que al menos uno de los montos sea mayor a 0 cuando se divide el pago
        if (data.splitPayment && data.capitalAmount !== undefined && data.interestAmount !== undefined) {
          return data.capitalAmount > 0 || data.interestAmount > 0;
        }
        return true;
      },
      {
        message: "Al menos uno de los montos (capital o interés) debe ser mayor a 0",
        path: ["capitalAmount", "interestAmount"],
      }
    )
    .refine(
      (data) => {
        // Validar que el capital a pagar no sea mayor al saldo pendiente
        if (data.splitPayment && data.capitalAmount !== undefined) {
          return data.capitalAmount <= loan.balance;
        }
        return true;
      },
      {
        message: "El monto de capital no puede ser mayor al saldo pendiente del préstamo",
        path: ["capitalAmount"],
      }
    )
    .refine(
      (data) => {
        // Validar que el total asignado a las cuentas coincida con el monto del pago
        const totalAssigned = data.accounts.reduce((sum, acc) => sum + acc.amount, 0);
        const paymentAmount = data.splitPayment 
          ? (data.capitalAmount || 0) + (data.interestAmount || 0)
          : data.amount;
        return Math.abs(totalAssigned - paymentAmount) < 0.01;
      },
      {
        message: "El total asignado a las cuentas debe coincidir con el monto del pago",
        path: ["accounts"],
      }
    );

  type FormValues = z.infer<typeof formSchema>;

  const [calculatedPayment, setCalculatedPayment] = useState(() => {
    const capital =
      loan.interestType === InterestType.DECREASING
        ? loan.currentInstallmentAmount
        : loan.totalAmount / loan.installments;
    const interest =
      loan.interestType === InterestType.FIXED
        ? (loan.fixedInterestAmount || 0) + (loan.pendingInterest || 0)
        : loan.balance * (loan.interestRate / 100) + (loan.pendingInterest || 0);
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
    currentInstallmentAmount,
  });

  const initialAmount =
    baseCapitalAmount + currentInterest;

  // Calcular el monto esperado de la cuota actual (capital + interés)
  const expectedInstallmentAmount = baseCapitalAmount + currentInterest;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentDate: new Date(),
      amount: initialAmount,
      splitPayment: false,
      capitalAmount: baseCapitalAmount,
      interestAmount: currentInterest,
      accounts: [],
    },
  });

  // Cargar cuentas disponibles
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accountsData = await getAccounts();
        setAccounts(accountsData);
      } catch (error) {
        console.error("Error loading accounts:", error);
        toast.error("Error al cargar las cuentas");
      }
    };
    loadAccounts();
  }, []);

  // Actualizar el formulario cuando cambien las cuentas seleccionadas
  useEffect(() => {
    form.setValue("accounts", selectedAccounts);
  }, [selectedAccounts, form]);

  useEffect(() => {
    console.log({
      calculatedPayment
    });
  }, [calculatedPayment]);

  const { watch } = form;
  const amount = watch("amount");
  const splitPayment = watch("splitPayment");
  const capitalAmount = watch("capitalAmount");
  const interestAmount = watch("interestAmount");

  console.log({
   loann: loan
  });

  // Calcular el monto total del pago para el selector de cuentas
  const totalPaymentAmount = splitPayment 
    ? (capitalAmount || 0) + (interestAmount || 0)
    : amount || 0;

  // Actualizar el capital cuando cambia el tipo de interés
  useEffect(() => {
    if (!splitPayment) {
      form.setValue(
        "capitalAmount",
        baseCapitalAmount
      );
      
    }
  }, [
    splitPayment,
    loan.interestType,
    currentInstallmentAmount,
    baseCapitalAmount,
    form,
      decreasingCapital,
      
    currentInterest,
  ]);

  // Calcular los montos de capital e interés basados en el tipo de préstamo
  useEffect(() => {
    console.log({hola: {capitalAmount, interestAmount, amount}})
    if (splitPayment) {
      if (capitalAmount && interestAmount) {
        setCalculatedPayment({
          capital: Number(capitalAmount),
          interest: Number(interestAmount),
          total: Number(capitalAmount) + Number(interestAmount),
        });
      }
    } else if (amount) {
      let capital = 0;
      let interest = 0;

      if (amount <= currentInterest) {
        capital = 0;
        interest = amount;
      } else {
        interest = currentInterest;
        capital =
          loan.interestType === InterestType.DECREASING
            ? decreasingCapital
            : amount - currentInterest;
      }

      setCalculatedPayment({
        capital,
        interest,
        total: amount,
      });
    }
  }, [
    amount,
    currentInterest,
    splitPayment,
    capitalAmount,
    interestAmount,
    loan.interestType,
    decreasingCapital,
  ]);

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await fetch(`/api/loans/${loan.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          paymentDate: values.paymentDate,
          amount: splitPayment
            ? Number(capitalAmount || 0) + Number(interestAmount || 0)
            : values.amount,
          notes: values.notes,
          splitPayment: values.splitPayment,
          capitalAmount: splitPayment ? Number(capitalAmount) : undefined,
          interestAmount: splitPayment ? Number(interestAmount) : undefined,
          accounts: values.accounts,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al registrar el pago");
      }

      toast.success("Pago registrado correctamente");
      router.push(`/dashboard/prestamos/gestionar/${loan.id}`);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al registrar el pago");
    }
  };

  //todo:
  //agregar a que cuenta entra el pago

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Pago</CardTitle>
      </CardHeader>
      <CardContent>
        {loan.pendingInterest > 0 && (
          <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">
            <strong>¡Atención!</strong> Tienes interés pendiente acumulado de{" "}
            {formatCurrency({ value: loan.pendingInterest, symbol: true })}.
            Este valor se sumará al interés de la cuota actual.
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Pago</FormLabel>
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
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="splitPayment"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Dividir pago en capital e interés</FormLabel>
                    <FormDescription>
                      Marque esta opción para especificar manualmente los montos
                      de capital e interés
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {!splitPayment ? (
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Monto a Pagar
                      <HoverCard>
                        <HoverCardTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <p className="text-sm">
                              Cuota actual:{" "}
                              {formatCurrency({
                                value: calculatedPayment.capital + calculatedPayment.interest,
                                symbol: true,
                              })}
                            </p>
                            <p className="text-sm">
                              Capital base:{" "}
                              {formatCurrency({
                                value: calculatedPayment.capital,
                                symbol: true,
                              })}
                            </p>
                            <p className="text-sm">
                              Interés:{" "}
                              {formatCurrency({
                                value: currentInterest,
                                symbol: true,
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Puede pagar un monto diferente al de la cuota. Si
                              paga menos, la diferencia se sumará a la siguiente
                              cuota.
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </FormLabel>
                    <FormControl>
                      <FormattedInput
                        placeholder="0"
                        {...field}
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      {amount < expectedInstallmentAmount && amount > 0 && (
                        <span className="text-yellow-600">
                          Pago parcial. Pendiente: {formatCurrency({
                            value: expectedInstallmentAmount - amount,
                            symbol: true,
                          })}
                        </span>
                      )}
                      {amount > expectedInstallmentAmount && (
                        <span className="text-green-600">
                          Pago mayor al requerido: {formatCurrency({
                            value: amount - expectedInstallmentAmount,
                            symbol: true,
                          })}
                        </span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
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
                        {interestAmount && interestAmount < currentInterest && (
                          <span className="text-yellow-600">
                            Interés pendiente:{" "}
                            {formatCurrency({
                              value: currentInterest - interestAmount,
                              symbol: true,
                            })}{" "}
                            se sumará a la siguiente cuota
                          </span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <PaymentAccountSelector
              accounts={accounts}
              selectedAccounts={selectedAccounts}
              totalAmount={totalPaymentAmount}
              onAccountSelect={(accounts) => {
                form.setValue("accounts", accounts);
                setSelectedAccounts(accounts);
              }}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
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
