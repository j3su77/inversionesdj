"use client";

// import { useState, useEffect } from "react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormattedInput } from "@/components/ui/formatted-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Client,
  InterestType,
  Loan,
  PaymentFrequency,
  // Account,
} from "@prisma/client";
import {
  // AccountSelector,
  // AccountSelection,
} from "@/components/ui/account-selector";
// import { getAccounts } from "@/actions/accounts";
import { ChangeFrequencyForm } from "./change-frequency-form";

interface LoanFormProps {
  client: Client;
  loan?: Loan | null;
  disabled?: boolean;
} 

const formSchema = z
  .object({
    totalAmount: z.coerce
      .number()
      .positive("El monto debe ser mayor a 0")
      .max(1000000000, "El monto no puede exceder 1.000.000.000"),
    installments: z.coerce
      .number()
      .int()
      .positive("El número de cuotas debe ser mayor a 0")
      .max(60, "Máximo 60 cuotas permitidas"),
    interestRate: z.coerce
      .number()
      .positive("La tasa de interés debe ser mayor a 0")
      .max(100, "La tasa no puede exceder 100%"),
    interestType: z.nativeEnum(InterestType),
    startDate: z.date({
      required_error: "La fecha de inicio es requerida",
    }),
    paymentFrequency: z.nativeEnum(PaymentFrequency),
    notes: z.string().optional().nullable(),
    // accounts: z
    //   .array(
    //     z.object({
    //       accountId: z.string(),
    //       amount: z.number().positive("El monto debe ser mayor a 0"),
    //     })
    //   )
    //   .min(1, "Debe seleccionar al menos una cuenta"),
  })
  // .refine(
  //   (data) => {
  //     const totalAssigned = data.accounts.reduce(
  //       (sum, acc) => sum + acc.amount,
  //       0
  //     );
  //     return Math.abs(totalAssigned - data.totalAmount) < 0.01;
  //   },
  //   {
  //     message:
  //       "El total asignado a las cuentas debe coincidir con el monto del préstamo",
  //     path: ["accounts"],
  //   }
  // );

type FormValues = z.infer<typeof formSchema>;

const paymentFrequencyOptions = [
  { label: "Diario", value: "DAILY" },
  { label: "Semanal", value: "WEEKLY" },
  { label: "Quincenal", value: "BIWEEKLY" },
  { label: "Mensual", value: "MONTHLY" },
  { label: "Trimestral", value: "QUARTERLY" },
];

const interestTypeOptions = [
  { label: "Decreciente sobre saldo", value: "DECREASING" },
  { label: "Fijo sobre monto inicial", value: "FIXED" },
];

export function LoanForm({ client, loan, disabled }: LoanFormProps) {
  const router = useRouter();
  const isEdit = Boolean(loan);
  // const [accounts, setAccounts] = useState<Account[]>([]);
  // const [selectedAccounts, setSelectedAccounts] = useState<AccountSelection[]>(
  //   []
  // );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      totalAmount: loan?.totalAmount || 0,
      installments: loan?.installments || 0,
      interestRate: loan?.interestRate || 0,
      interestType: loan?.interestType || "DECREASING",
      startDate: loan?.startDate || new Date(),
      paymentFrequency: loan?.paymentFrequency || "MONTHLY",
      notes: loan?.notes || "",
      // accounts: [],
    },
    mode: "onChange"
  });

  const { isSubmitting, isValid } = form.formState;
  // const totalAmount = form.watch("totalAmount");

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
  //   // Forzar revalidación completa del formulario para actualizar el estado isValid
  //   // Esto es necesario para que la validación personalizada (refine) también se ejecute
  //   form.trigger();
  // }, [selectedAccounts, form]);

  const onSubmit = async (values: FormValues) => {
    if (disabled) return;
    try {
      if (isEdit) {
        await fetch(`/api/loans/${loan?.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
        toast.success("Préstamo actualizado");
      } else {
        const response = await fetch("/api/loans", {
          method: "POST",
          body: JSON.stringify({
            ...values,  
            clientId: client.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error al crear el préstamo");
        }

        const data = await response.json();
        console.log({prestamo: data});
        router.push(`/dashboard/prestamos/gestionar/${data.id}`);
        toast.success("Préstamo creado correctamente");
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Ocurrió un error inesperado"
      );
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Monto Total</FormLabel>
                  <FormControl>
                    <FormattedInput
                      placeholder="0"
                      value={value || ""}
                      onChange={onChange}
                      disabled={disabled}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="installments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Cuotas</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value || ""} disabled={disabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interestRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tasa de Interés (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      value={field.value || ""}
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interestType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Interés</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger disabled={disabled}>
                        <SelectValue placeholder="Seleccione el tipo de interés" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {interestTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Inicio</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={disabled}
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
                          date > new Date() || date < new Date("1900-01-01")
                        }
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
              name="paymentFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frecuencia de Pago</FormLabel>
                  {isEdit && loan ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">
                            {paymentFrequencyOptions.find(opt => opt.value === loan.paymentFrequency)?.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Frecuencia actual de pago
                          </p>
                        </div>
                        <ChangeFrequencyForm 
                          loan={loan} 
                          onSuccess={() => {
                            window.location.reload();
                          }}
                          trigger={
                            <Button variant="outline" size="sm" >
                              Cambiar
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione la frecuencia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentFrequencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Input placeholder="Notas adicionales..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Selector de Cuentas - Comentado para la primera etapa */}
          {/* {!isEdit && totalAmount > 0 && (
            <FormField
              control={form.control}
              name="accounts"
              render={() => (
                <FormItem>
                  <AccountSelector
                    accounts={accounts}
                    totalLoanAmount={totalAmount}
                    selectedAccounts={selectedAccounts}
                    onAccountsChange={setSelectedAccounts}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          )} */}

          <Button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="w-full"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Actualizar Préstamo" : "Crear Préstamo"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
