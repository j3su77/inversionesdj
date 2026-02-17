"use client";

import { useMemo } from "react";
import axios from "axios";
import { CalendarIcon, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Card, CardContent } from "@/components/ui/card";
import { Client, MaritalStatus } from "@prisma/client";
import { Banner } from "@/components/banner";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormattedInput } from "@/components/ui/formatted-input";

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
  maritalStatus: z.nativeEnum(MaritalStatus),
  occupation: z.string().min(1, {
    message: "Ocupación es requerida",
  }),
  companyName: z.string().optional(),
  workplace: z.string().optional(),
  monthlyIncome: z.coerce.number().optional(),
  companyTenure: z.coerce.number().optional(),
  currentPosition: z.string().optional(),
  isDisallowed: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const maritalStatusOptions = [
  { label: "Soltero", value: "SINGLE" },
  { label: "Casado", value: "MARRIED" },
  { label: "Separado", value: "DIVORCED" },
  { label: "Unión libre", value: "DOMESTIC_PARTNERSHIP" },
];

export const AddClientForm = ({ client }: AddClientFormProps) => {
  const router = useRouter();
  const isEdit = useMemo(() => client, [client]);

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
      maritalStatus: client?.maritalStatus ?? MaritalStatus.SINGLE,
      dateOfBirth: client?.dateOfBirth ?? new Date(),
      placeOfBirth: client?.placeOfBirth ?? "",
      occupation: client?.occupation ?? "",
      isDisallowed: client?.isDisallowed ?? false,
      companyName: client?.companyName ?? "",
      workplace: client?.workplace ?? "",
      monthlyIncome: client?.monthlyIncome ?? undefined,
      companyTenure: client?.companyTenure ?? undefined,
      currentPosition: client?.currentPosition ?? "",
    },
  });
  const { isSubmitting, isValid } = form.formState;
  const { setError } = form;

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
                    name="maritalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado civil</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione el estado civil" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {maritalStatusOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
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
                    name="occupation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ocupación</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                        <FormLabel>Antigüedad (años)</FormLabel>
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
                    render={({ field }) => {
                      const { value, onChange, ...rest } = field;
                      return (
                        <FormItem>
                          <FormLabel>Ingreso mensual</FormLabel>
                          <FormControl>
                            <FormattedInput
                              placeholder="$"
                              value={value ? value : ""}
                              disabled={isSubmitting}
                              {...rest}
                              onChange={(val) => onChange(Number(val))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
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
