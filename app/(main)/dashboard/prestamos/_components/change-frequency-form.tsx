'use client'

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Loader2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loan, PaymentFrequency } from "@prisma/client"

interface ChangeFrequencyFormProps {
  loan: Loan
  onSuccess?: () => void
}

const formSchema = z.object({
  newFrequency: z.nativeEnum(PaymentFrequency),
  effectiveDate: z.date({
    required_error: "La fecha de inicio es requerida",
  }),
  reason: z.string().min(1, "La razón del cambio es requerida"),
})

type FormValues = z.infer<typeof formSchema>

const paymentFrequencyOptions = [
  { label: "Diario", value: "DAILY" },
  { label: "Semanal", value: "WEEKLY" },
  { label: "Quincenal", value: "BIWEEKLY" },
  { label: "Mensual", value: "MONTHLY" },
]

export function ChangeFrequencyForm({ loan, onSuccess }: ChangeFrequencyFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      effectiveDate: new Date(),
    },
  })

  const { isSubmitting, isValid } = form.formState

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await fetch(`/api/loans/${loan.id}/change-frequency`, {
        method: 'POST',
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error('Error al cambiar la frecuencia')
      }

      toast.success("Frecuencia de pago actualizada")
      setIsOpen(false)
      router.refresh()
      onSuccess?.()
    } catch (error) {
      console.error(error)
      toast.error("Ocurrió un error al cambiar la frecuencia")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          Cambiar Frecuencia de Pago
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar Frecuencia de Pago</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              name="effectiveDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha Efectiva del Cambio</FormLabel>
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
                          date < new Date()
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón del Cambio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explique la razón del cambio de frecuencia..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="w-full"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Cambio
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 