"use client";

import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounced";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Client, MaritalStatus } from "@prisma/client";
import { Banner } from "@/components/banner";
import { zodResolver } from "@hookform/resolvers/zod";
import { getManagers, type ManagerUser } from "@/actions/users";
import { checkClientIdentification } from "@/actions/clients";

interface AddClientFormProps {
  client?: Client | null;
}

const formSchema = z.object({
  fullName: z.string().min(1, {
    message: "Nombre requerido",
  }),
  identification: z.coerce.number().min(1, {
    message: "Identificación del cliente es requerido",
  }),
  address: z.string().optional(),
  phone: z.string().optional(),
  cellphone: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.date(),
  placeOfBirth: z.string().optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional().nullable(),
  occupation: z.string().optional().nullable(),
  companyName: z.string().optional(),
  workplace: z.string().optional(),
  monthlyIncome: z.coerce.number().optional(),
  companyTenure: z.coerce.number().optional(),
  currentPosition: z.string().optional(),
  isDisallowed: z.boolean(),
  managedByUserId: z.string().min(1, "Debe seleccionar el usuario asignado"),
});

type FormValues = z.infer<typeof formSchema>;

export const AddClientForm = ({ client }: AddClientFormProps) => {
  const router = useRouter();
  const isEdit = useMemo(() => client, [client]);
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [isCheckingId, setIsCheckingId] = useState(false);

  if (isEdit && !client) {
    router.replace("/");
    toast.error("Cliente no encontrado, redirigiendo...");
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: client?.fullName ?? "",
      identification: client?.identification ?? undefined,
      address: client?.address ?? "",
      phone: client?.phone ?? "",
      cellphone: client?.cellphone ?? "",
      nationality: client?.nationality ?? "",
      maritalStatus: client?.maritalStatus ?? undefined,
      dateOfBirth: client?.dateOfBirth ?? new Date(),
      placeOfBirth: client?.placeOfBirth ?? "",
      occupation: client?.occupation ?? undefined,
      isDisallowed: client?.isDisallowed ?? false,
      companyName: client?.companyName ?? "",
      workplace: client?.workplace ?? "",
      monthlyIncome: client?.monthlyIncome ?? undefined,
      companyTenure: client?.companyTenure ?? undefined,
      currentPosition: client?.currentPosition ?? "",
      managedByUserId: (client as Client & { managedByUserId?: string | null })?.managedByUserId ?? "",
    },
  });
  const { isSubmitting, isValid } = form.formState;
  const { setError, clearErrors } = form;

  const identificationValue = form.watch("identification");
  const debouncedIdentification = useDebounce(
    identificationValue !== undefined && identificationValue !== null ? String(identificationValue) : "",
    500
  );

  useEffect(() => {
    getManagers().then(setManagers);
  }, []);

  useEffect(() => {
    const num = parseInt(debouncedIdentification, 10);
    if (isNaN(num) || num < 1) {
      clearErrors("identification");
      setIsCheckingId(false);
      return;
    }
    if (isEdit && client && Number(client.identification) === num) {
      clearErrors("identification");
      setIsCheckingId(false);
      return;
    }
    let cancelled = false;
    setIsCheckingId(true);
    checkClientIdentification(num, isEdit ? client?.id : null).then((result) => {
      if (cancelled) return;
      setIsCheckingId(false);
      if (result.available) {
        clearErrors("identification");
      } else {
        setError("identification", {
          type: "manual",
          message: result.message ?? "Número de documento ya registrado",
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedIdentification, isEdit, client, setError, clearErrors]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      if (isEdit) {
        await axios.patch(`/api/clients/${client?.id}`, values);
        toast.success("Cliente actualizado");
      } else {
        const { data } = await axios.post(`/api/clients/`, values);
        router.push(`/dashboard/clientes/editar/${data.id}`);
        toast.success("Cliente agregado correctamente");
      }
      router.refresh();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const serverResponse = error.response;
        if (serverResponse && serverResponse.status === 400) {
          const errorMessage = serverResponse.data;
          if (
            typeof errorMessage === "string" &&
            errorMessage.includes("Número de documento ya registrado")
          ) {
            setError("identification", {
              type: "manual",
              message: "Número de documento ya registrado",
            });
          } else {
            toast.error(errorMessage);
          }
        } else {
          toast.error("Ocurrió un error inesperado");
        }
      } else {
        console.error(error);
        toast.error("Ocurrió un error inesperado");
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Card
        className={`w-full ${
          isEdit && "border-none shadow-none rounded-none"
        } ${isEdit && client?.isDisallowed ? "opacity-50" : ""}`}
      >
        {isEdit && client?.isDisallowed && (
          <Banner variant={"destructive"} label="Cliente restringido" />
        )}

        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="managedByUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario asignado</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Seleccione el usuario responsable de este cliente (obligatorio).
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

              {/* Sección: Información Personal */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Información Personal
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="identification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de documento</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center gap-2">
                            <Input
                              type="number"
                              disabled={isSubmitting}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === "" ? undefined : Number(value)
                                );
                              }}
                              className={form.formState.errors.identification ? "border-destructive" : ""}
                            />
                            {isCheckingId && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Verificando...
                              </span>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nacionalidad</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha de nacimiento</FormLabel>
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
                              disabled={(date) =>
                                date > new Date() ||
                                date < new Date("1900-01-01")
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
                    name="placeOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lugar de nacimiento</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Sección: Información de Contacto */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">
                  Información de Contacto
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono fijo</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cellphone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono celular</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Sección: Información Laboral */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Información Laboral</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la empresa</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currentPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo actual</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyTenure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Antigüedad (meses)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            disabled={isSubmitting}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(
                                value === "" ? undefined : Number(value)
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthlyIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ingreso mensual</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            disabled={isSubmitting}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(
                                value === "" ? undefined : Number(value)
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workplace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lugar de trabajo</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="w-full md:w-auto"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEdit ? "Actualizar Cliente" : "Registrar Cliente"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
