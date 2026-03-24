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
import {} from // AccountSelector,
// AccountSelection,
"@/components/ui/account-selector";
// import { getAccounts } from "@/actions/accounts";
import { ChangeFrequencyForm } from "./change-frequency-form";
import { ChangeNextPaymentDateForm } from "./change-next-payment-date-form";
import { getManagers, type ManagerUser } from "@/actions/users";
import { ProductInfoModal } from "./product-info-modal";
import { Package, Pencil } from "lucide-react";

interface LoanFormProps {
  client: Client;
  loan?: Loan | null;
  disabled?: boolean;
}

const formSchema = z.object({
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
  coDebtor: z
    .object({
      fullName: z.string().optional().nullable(),
      identification: z.string().optional().nullable(),
      position: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  managedByUserId: z.string().min(1, "Debe seleccionar el usuario asignado"),
  productInfo: z
    .object({
      productName: z.string().nullable(),
      supplierName: z.string().nullable(),
      cost: z.number().nullable(),
      paymentDate: z.string().nullable(),
    })
    .optional()
    .nullable(),
  // accounts: z
  //   .array(
  //     z.object({
  //       accountId: z.string(),
  //       amount: z.number().positive("El monto debe ser mayor a 0"),
  //     })
  //   )
  //   .min(1, "Debe seleccionar al menos una cuenta"),
});
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
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [productInfoModalOpen, setProductInfoModalOpen] = useState(false);

  useEffect(() => {
    getManagers().then(setManagers);
  }, []);

  const loanCoDebtor = (loan as Loan & { coDebtor?: unknown })?.coDebtor;
  const initialCoDebtor: FormValues["coDebtor"] =
    loanCoDebtor != null &&
    typeof loanCoDebtor === "object" &&
    !Array.isArray(loanCoDebtor)
      ? {
          fullName: (loanCoDebtor as { fullName?: string }).fullName ?? null,
          identification:
            (loanCoDebtor as { identification?: string }).identification ??
            null,
          position: (loanCoDebtor as { position?: string }).position ?? null,
          phone: (loanCoDebtor as { phone?: string }).phone ?? null,
        }
      : null;

  const loanProductInfo = (loan as Loan & { productInfo?: unknown })
    ?.productInfo;
  const initialProductInfo: FormValues["productInfo"] =
    loanProductInfo != null &&
    typeof loanProductInfo === "object" &&
    !Array.isArray(loanProductInfo)
      ? {
          productName:
            (loanProductInfo as { productName?: string }).productName ?? null,
          supplierName:
            (loanProductInfo as { supplierName?: string }).supplierName ?? null,
          cost: (loanProductInfo as { cost?: number }).cost ?? null,
          paymentDate:
            (loanProductInfo as { paymentDate?: string }).paymentDate ?? null,
        }
      : null;

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
      coDebtor: initialCoDebtor,
      productInfo: initialProductInfo,
      managedByUserId:
        (loan as Loan & { managedByUserId?: string | null })?.managedByUserId ??
        "",
      // accounts: [],
    },
    mode: "onChange",
  });

  /**
   * Si el préstamo se actualiza en servidor (p. ej. cambio de frecuencia) pero el form
   * sigue con defaultValues viejos, el siguiente PATCH sobrescribiría `paymentFrequency`.
   * Sincronizamos cuando cambia `updatedAt` o la frecuencia en el modelo.
   */
  useEffect(() => {
    if (!loan?.id) return;
    form.setValue("paymentFrequency", loan.paymentFrequency);
  }, [loan?.id, loan?.updatedAt, loan?.paymentFrequency, form]);

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
    
        router.push(`/dashboard/prestamos/gestionar/${data.id}`);
        toast.success("Préstamo creado correctamente");
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Ocurrió un error inesperado",
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
                    <Input
                      type="number"
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
                            !field.value && "text-muted-foreground",
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
              render={({ field }) => {
                const displayedFrequency =
                  field.value ?? loan?.paymentFrequency ?? "MONTHLY";
                return (
                <FormItem>
                  <FormLabel>Frecuencia de Pago</FormLabel>
                  {isEdit && loan ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">
                            {
                              paymentFrequencyOptions.find(
                                (opt) => opt.value === displayedFrequency,
                              )?.label
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Frecuencia actual de pago
                          </p>
                        </div>
                        <ChangeFrequencyForm
                          loan={loan}
                          onFrequencyApplied={(newFrequency) => {
                            form.setValue("paymentFrequency", newFrequency, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                          onSuccess={() => {
                            window.location.reload();
                          }}
                          trigger={
                            <Button variant="outline" size="sm">
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
                );
              }}
            />

            {isEdit && loan?.status === "ACTIVE" && (
              <div className="md:col-span-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Próximo pago programado
                    </p>
                    <p className="font-medium">
                      {loan.nextPaymentDate
                        ? format(new Date(loan.nextPaymentDate), "PPP", {
                            locale: es,
                          })
                        : "Sin fecha definida"}
                    </p>
                  </div>
                  <ChangeNextPaymentDateForm
                    loan={loan}
                    onSuccess={() => {
                      window.location.reload();
                    }}
                    trigger={
                      <Button variant="outline" size="sm" type="button">
                        Cambiar fecha
                      </Button>
                    }
                  />
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Notas adicionales..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 border rounded-md p-4">
            <p className="font-medium">Codeudor (opcional)</p>
            <p className="text-sm text-muted-foreground">
              Puede registrar información básica del codeudor. Este bloque es
              opcional.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="coDebtor.fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombres completos</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre del codeudor"
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
                name="coDebtor.identification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cédula</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Documento de identidad"
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
                name="coDebtor.position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Cargo u ocupación"
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
                name="coDebtor.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Teléfono del codeudor"
                        {...field}
                        value={field.value || ""}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Información del producto (opcional) */}
          <div className="space-y-4 border rounded-md p-4">
            <p className="font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Información del producto (opcional)
            </p>
            <p className="text-sm text-muted-foreground">
              Puede asociar un producto al préstamo: nombre, proveedor, costo y
              fecha de pago.
            </p>
            {form.watch("productInfo")?.productName ||
            form.watch("productInfo")?.supplierName ||
            form.watch("productInfo")?.cost != null ||
            form.watch("productInfo")?.paymentDate ? (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {form.watch("productInfo")?.productName && (
                    <p>
                      <span className="text-muted-foreground">Producto:</span>{" "}
                      {form.watch("productInfo")?.productName}
                    </p>
                  )}
                  {form.watch("productInfo")?.supplierName && (
                    <p>
                      <span className="text-muted-foreground">Proveedor:</span>{" "}
                      {form.watch("productInfo")?.supplierName}
                    </p>
                  )}
                  {form.watch("productInfo")?.cost != null && (
                    <p>
                      <span className="text-muted-foreground">Costo:</span>{" "}
                      {Number(form.watch("productInfo")?.cost).toLocaleString(
                        "es",
                      )}
                    </p>
                  )}
                  {form.watch("productInfo")?.paymentDate && (
                    <p>
                      <span className="text-muted-foreground">
                        Fecha de pago:
                      </span>{" "}
                      {format(
                        new Date(form.watch("productInfo")!.paymentDate!),
                        "dd/MM/yyyy",
                        { locale: es },
                      )}
                    </p>
                  )}
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProductInfoModalOpen(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            ) : (
              !disabled && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProductInfoModalOpen(true)}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Añadir producto
                </Button>
              )
            )}
            <ProductInfoModal
              open={productInfoModalOpen}
              onOpenChange={setProductInfoModalOpen}
              initialData={
                form.watch("productInfo")
                  ? {
                      productName:
                        form.watch("productInfo")?.productName ?? null,
                      supplierName:
                        form.watch("productInfo")?.supplierName ?? null,
                      cost: form.watch("productInfo")?.cost ?? null,
                      paymentDate:
                        form.watch("productInfo")?.paymentDate ?? null,
                    }
                  : null
              }
              onSave={(data) => {
                form.setValue("productInfo", {
                  productName: data.productName,
                  supplierName: data.supplierName,
                  cost: data.cost,
                  paymentDate: data.paymentDate,
                });
              }}
            />
          </div>

          <FormField
            control={form.control}
            name="managedByUserId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Usuario asignado</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Seleccione el usuario responsable de este préstamo
                  (obligatorio).
                </p>
                {managers.length === 0 ? (
                  <p className="text-sm text-amber-600">
                    No hay usuarios activos.
                  </p>
                ) : (
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {managers.map((m) => (
                        <Button
                          key={m.id}
                          type="button"
                          variant={field.value === m.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => field.onChange(m.id)}
                        >
                          {m.username}
                        </Button>
                      ))}
                    </div>
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

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
