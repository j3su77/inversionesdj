"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
// import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { ExpenseCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon } from "lucide-react";
// import { CalendarIcon, Plus, Trash2, DollarSign } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  cn,
  getExpenseCategoryColor,
  getExpenseCategoryLabel,
} from "@/lib/utils";
import { createExpense } from "@/actions/expenses";
// import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { FormattedInput } from "@/components/ui/formatted-input";

const expenseCategories: ExpenseCategory[] = [
  "SERVICIOS_PUBLICOS",
  "ARRIENDO",
  "NOMINA",
  "MARKETING",
  "TRANSPORTE",
  "SUMINISTROS",
  "TECNOLOGIA",
  "MANTENIMIENTO",
  "SEGUROS",
  "IMPUESTOS",
  "LEGAL",
  "ALIMENTACION",
  "OTROS",
];

const formSchema = z.object({
  name: z.string().min(1, "El nombre del gasto es requerido"),
  description: z.string().optional(),
  category: z.enum(
    expenseCategories as [ExpenseCategory, ...ExpenseCategory[]]
  ),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  expenseDate: z.date({
    required_error: "La fecha del gasto es requerida",
  }),
  notes: z.string().optional(),
  // accounts: z
  //   .array(
  //     z.object({
  //       accountId: z.string().min(1, "Debe seleccionar una cuenta"),
  //       amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  //     })
  //   )
  //   .min(1, "Debe seleccionar al menos una cuenta"),
});
// .refine(
//   (data) => {
//     const totalAccountAmount = data.accounts.reduce(
//       (sum, account) => sum + account.amount,
//       0
//     );
//     return Math.abs(totalAccountAmount - data.amount) < 0.01; // Permitir pequeñas diferencias por redondeo
//   },
//   {
//     message:
//       "La suma de los montos de las cuentas debe ser igual al monto total del gasto",
//     path: ["accounts"],
//   }
// );

type FormData = z.infer<typeof formSchema>;

// interface ExpenseFormProps {
//   accounts: Account[];
// }

// export function ExpenseForm({ accounts }: ExpenseFormProps) {
export function ExpenseForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "OTROS",
      amount: 0,
      expenseDate: new Date(),
      notes: "",
      // accounts: [{ accountId: "", amount: 0 }],
    },
  });

  // const { fields, append, remove } = useFieldArray({
  //   control: form.control,
  //   name: "accounts",
  // });

  // const watchedAmount = form.watch("amount");
  // const watchedAccounts = form.watch("accounts");

  // Calcular el total distribuido en las cuentas
  // const totalDistributed = watchedAccounts.reduce(
  //   (sum, account) => sum + (account.amount || 0),
  //   0
  // );
  // const remaining = watchedAmount - totalDistributed;

  // Auto-distribuir el monto cuando solo hay una cuenta
  const handleAmountChange = (value: number) => {
    form.setValue("amount", value);
    // if (fields.length === 1 && fields[0]) {
    //   form.setValue("accounts.0.amount", value);
    // }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const result = await createExpense(data);

      if (result.success) {
        toast.success("Gasto registrado exitosamente");
        router.push("/dashboard/gastos");
      } else {
        toast.error(result.error || "Error al registrar el gasto");
      }
    } catch (error) {
      console.error("Error submitting expense:", error);
      toast.error("Error inesperado al registrar el gasto");
    } finally {
      setIsSubmitting(false);
    }
  };

  // const addAccount = () => {
  //   append({ accountId: "", amount: 0 });
  // };

  // const removeAccount = (index: number) => {
  //   if (fields.length > 1) {
  //     remove(index);
  //   }
  // };

  // Distribuir el monto restante automáticamente
  // const distributeRemaining = () => {
  //   if (remaining > 0 && fields.length > 0) {
  //     const amountPerAccount = remaining / fields.length;
  //     fields.forEach((_, index) => {
  //       const currentAmount = form.getValues(`accounts.${index}.amount`) || 0;
  //       form.setValue(
  //         `accounts.${index}.amount`,
  //         currentAmount + amountPerAccount
  //       );
  //     });
  //   }
  // };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información básica */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Gasto *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Factura de electricidad - Enero 2024"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción opcional del gasto"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={getExpenseCategoryColor(category)}
                              variant="outline"
                            >
                              {getExpenseCategoryLabel(category)}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Monto y fecha */}
          <div className="space-y-4">
            <FormattedInput
              name="amount"
              value={form.watch("amount")}
              onChange={(value) => handleAmountChange(Number(value))}
              placeholder="0.00"
              disabled={isSubmitting}
            />

            <FormField
              control={form.control}
              name="expenseDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha del Gasto *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isSubmitting}
                        >
                          {field.value ? (
                            format(field.value, "dd 'de' MMMM 'de' yyyy", {
                              locale: es,
                            })
                          ) : (
                            <span>Seleccionar fecha</span>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Distribución por cuentas - Comentado para la primera etapa */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Distribución por Cuentas
              </span>
              <div className="text-sm font-normal">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-semibold">
                  {formatCurrency({ value: watchedAmount, symbol: true })}
                </span>
                {remaining !== 0 && (
                  <span
                    className={`ml-2 ${
                      remaining > 0 ? "text-orange-600" : "text-red-600"
                    }`}
                  >
                    ({remaining > 0 ? "Faltante" : "Exceso"}:{" "}
                    {formatCurrency({
                      value: Math.abs(remaining),
                      symbol: true,
                    })}
                    )
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Cuenta {index + 1}</Label>
                  <Select
                    value={form.watch(`accounts.${index}.accountId`)}
                    onValueChange={(value) =>
                      form.setValue(`accounts.${index}.accountId`, value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((account) => account.isActive)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{account.name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {formatCurrency({
                                  value: account.balance,
                                  symbol: true,
                                })}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-32">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isSubmitting}
                    value={form.watch(`accounts.${index}.amount`) || ""}
                    onChange={(e) =>
                      form.setValue(
                        `accounts.${index}.amount`,
                        Number(e.target.value)
                      )
                    }
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeAccount(index)}
                  disabled={fields.length <= 1 || isSubmitting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={addAccount}
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Cuenta
              </Button>

              {remaining > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={distributeRemaining}
                  disabled={isSubmitting}
                >
                  Distribuir Restante
                </Button>
              )}
            </div>

            {form.formState.errors.accounts && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.accounts.message}
              </p>
            )}
          </CardContent>
        </Card> */}

        {/* Botones de acción */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar Gasto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
