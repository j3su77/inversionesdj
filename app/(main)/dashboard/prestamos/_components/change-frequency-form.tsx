'use client'

import React, { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Loader2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { cn, getPaymentFrequencyLabel } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loan, PaymentFrequency } from "@prisma/client"

interface ChangeFrequencyFormProps {
  loan: Loan
  onSuccess?: () => void
  trigger?: React.ReactNode
}

const formSchema = z.object({
  newFrequency: z.nativeEnum(PaymentFrequency, {
    required_error: "Seleccione una nueva frecuencia",
  }),
  effectiveDate: z.date({
    required_error: "La fecha efectiva es requerida",
  }),
  nextPaymentDate: z.date({
    required_error: "La fecha de la próxima cuota es requerida",
  }),
  reason: z.string().min(10, "La razón debe tener al menos 10 caracteres"),
})

type FormValues = z.infer<typeof formSchema>

const paymentFrequencyOptions = [
  { label: "Diario", value: "DAILY" },
  { label: "Semanal", value: "WEEKLY" },
  { label: "Quincenal", value: "BIWEEKLY" },
  { label: "Mensual", value: "MONTHLY" },
  { label: "Trimestral", value: "QUARTERLY" },
]

export function ChangeFrequencyForm({ loan, onSuccess, trigger }: ChangeFrequencyFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      effectiveDate: new Date(),
      nextPaymentDate: new Date(),
    },
  })

  const { isSubmitting, isValid } = form.formState
  const watchedFrequency = form.watch("newFrequency")
  const watchedDate = form.watch("effectiveDate")

  // Función para calcular automáticamente la próxima fecha de pago
  const calculateNextPaymentDate = (frequency: PaymentFrequency) => {
    const nextPaymentDate = new Date()
    
    switch (frequency) {
      case "DAILY":
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 1)
        break
      case "WEEKLY":
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 7)
        break
      case "BIWEEKLY":
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 15)
        break
      case "MONTHLY":
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)
        break
      case "QUARTERLY":
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3)
        break
    }
    
    return nextPaymentDate
  }

  // Actualizar automáticamente la fecha de la próxima cuota cuando cambia la frecuencia
  useEffect(() => {
    if (watchedFrequency) {
      const calculatedDate = calculateNextPaymentDate(watchedFrequency)
      form.setValue("nextPaymentDate", calculatedDate)
    }
  }, [watchedFrequency, form])

  // Calcular estimaciones del impacto del cambio
  const calculateImpact = () => {
    if (!watchedFrequency || !watchedDate) return null

    const currentFrequency = loan.paymentFrequency
    const remainingInstallments = loan.remainingInstallments
    const balance = loan.balance
    const newFeeAmount = balance / remainingInstallments

    // Calcular nueva fecha de finalización aproximada
    const effectiveDate = new Date(watchedDate)
    const newEndDate = new Date(effectiveDate)

    // Usar la fecha de la próxima cuota del formulario
    const nextPaymentDate = form.getValues("nextPaymentDate")
    
    switch (watchedFrequency) {
      case "DAILY":
        newEndDate.setDate(newEndDate.getDate() + remainingInstallments)
        break
      case "WEEKLY":
        newEndDate.setDate(newEndDate.getDate() + (remainingInstallments * 7))
        break
      case "BIWEEKLY":
        newEndDate.setDate(newEndDate.getDate() + (remainingInstallments * 15))
        break
      case "MONTHLY":
        newEndDate.setMonth(newEndDate.getMonth() + remainingInstallments)
        break
      case "QUARTERLY":
        newEndDate.setMonth(newEndDate.getMonth() + (remainingInstallments * 3))
        break
    }

    return {
      currentFrequency,
      newFrequency: watchedFrequency,
      currentFeeAmount: loan.feeAmount,
      newFeeAmount,
      currentEndDate: loan.endDate,
      newEndDate,
      nextPaymentDate,
      remainingInstallments,
    }
  }

  const impact = calculateImpact()

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await fetch(`/api/loans/${loan.id}/change-frequency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          changedBy: 'system', // Aquí podrías obtener el usuario actual
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || 'Error al cambiar la frecuencia')
      }
      
      toast.success("Frecuencia de pago actualizada exitosamente", {
        description: `Nueva frecuencia: ${getPaymentFrequencyLabel(values.newFrequency)}`,
      })
      
      setIsOpen(false)
      form.reset()
      router.refresh()
      onSuccess?.()
    } catch (error) {
      console.error('Error changing frequency:', error)
      toast.error("Error al cambiar la frecuencia", {
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
      })
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    form.reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            Cambiar Frecuencia
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="!max-w-4xl !max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Cambiar Frecuencia de Pago
          </DialogTitle>
        </DialogHeader>

        {/* Información actual del préstamo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Información Actual</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Frecuencia actual:</span>
                <div className="font-medium">
                  {getPaymentFrequencyLabel(loan.paymentFrequency)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Cuotas restantes:</span>
                <div className="font-medium">{loan.remainingInstallments}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Saldo pendiente:</span>
                <div className="font-medium">
                  ${loan.balance.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha de finalización:</span>
                <div className="font-medium">
                  {format(new Date(loan.endDate), "dd/MM/yyyy")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="newFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva Frecuencia</FormLabel>
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
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={option.value === loan.paymentFrequency}
                          >
                            {option.label}
                            {option.value === loan.paymentFrequency && (
                              <Badge variant="secondary" className="ml-2">
                                Actual
                              </Badge>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Seleccione la nueva frecuencia de pago
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Efectiva</FormLabel>
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
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Fecha desde cuando aplicará el cambio
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextPaymentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Próxima Cuota</FormLabel>
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
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Fecha calculada automáticamente (modificable)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón del Cambio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explique detalladamente la razón del cambio de frecuencia..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Proporcione una explicación clara del motivo del cambio
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Previsualización del impacto */}
            {impact && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Previsualización del Cambio
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Frecuencia:</span>
                      <div className="flex items-center gap-2">
                        <span className="line-through text-muted-foreground">
                          {getPaymentFrequencyLabel(impact.currentFrequency)}
                        </span>
                        <span>→</span>
                        <span className="font-medium text-green-600">
                          {getPaymentFrequencyLabel(impact.newFrequency)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Monto por cuota:</span>
                      <div className="flex items-center gap-2">
                        <span className="line-through text-muted-foreground">
                          ${impact.currentFeeAmount.toLocaleString()}
                        </span>
                        <span>→</span>
                        <span className="font-medium text-green-600">
                          ${impact.newFeeAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Nueva fecha de finalización:</span>
                      <div className="font-medium">
                        {format(impact.newEndDate, "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Próxima cuota:</span>
                      <div className="font-medium text-blue-600">
                        {format(impact.nextPaymentDate, "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isValid || watchedFrequency === loan.paymentFrequency}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Cambio
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 