"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
// import { FormattedInput } from "@/components/ui/formatted-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AccountType, AccountSubtype } from "@prisma/client"
import { createAccount } from "@/actions/accounts"

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  number: z.string().min(1, "El número de cuenta es requerido"),
  type: z.nativeEnum(AccountType),
  subtype: z.nativeEnum(AccountSubtype).optional(),
  accountHolder: z.string().optional(),
  balance: z.coerce.number().min(0, "El saldo no puede ser negativo"),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const accountTypeOptions = [
  { label: "Bancaria", value: "BANCARIA" },
  { label: "Efectivo", value: "EFECTIVO" },
  { label: "Inversiones", value: "INVERSIONES" },
  { label: "Crédito", value: "CREDITO" },
  { label: "Otros", value: "OTROS" },
]

const accountSubtypeOptions = [
  { label: "Cuenta Corriente", value: "CORRIENTE" },
  { label: "Cuenta de Ahorros", value: "AHORROS" },
  // { label: "Cuenta Vista", value: "VISTA" },
  { label: "Depósito a Plazo Fijo", value: "PLAZO_FIJO" },
  { label: "No Aplica", value: "NOT_APPLICABLE" },
]

export default function NuevaCuentaPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      number: "",
      type: "BANCARIA",
      subtype: "NOT_APPLICABLE",
      accountHolder: "",
      balance: 0,
      description: "",
    },
  })

  const selectedType = form.watch("type")

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true)
      
      const result = await createAccount({
        name: values.name,
        number: values.number,
        type: values.type,
        subtype: values.subtype,
        accountHolder: values.accountHolder,
        balance: 0,
        description: values.description,
      })

      if (result.success) {
        toast.success("Cuenta creada correctamente")
        router.push("/dashboard/cuentas")
        router.refresh()
      } else {
        toast.error(result.error || "Error al crear la cuenta")
      }
    } catch (error) {
      console.error(error)
      toast.error("Ocurrió un error inesperado")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cuentas">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Cuenta</h1>
          <p className="text-muted-foreground">
            Crea una nueva cuenta para gestionar préstamos
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información de la Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Cuenta</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Banco XYZ - Cuenta Corriente"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Cuenta</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: 1234567890"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cuenta</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione el tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountTypeOptions.map((option) => (
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

                {selectedType === "BANCARIA" && (
                  <FormField
                    control={form.control}
                    name="subtype"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtipo</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione el subtipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accountSubtypeOptions.map((option) => (
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
                )}

                <FormField
                  control={form.control}
                  name="accountHolder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titular de la Cuenta (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombre del titular"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* <FormField
                  control={form.control}
                  name="balance"
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel>Saldo Inicial</FormLabel>
                      <FormControl>
                        <FormattedInput
                          placeholder="0"
                          value={value || ""}
                          onChange={onChange}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción adicional de la cuenta..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.formState.isValid}
                  className="flex-1"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Cuenta
                </Button>
                <Link href="/dashboard/cuentas">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
} 