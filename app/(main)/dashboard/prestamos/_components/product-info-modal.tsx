"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedInput } from "@/components/ui/formatted-input";
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
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export type ProductInfoData = {
  productName: string | null;
  supplierName: string | null;
  cost: number | null;
  paymentDate: string | null; // ISO date string
};

const productInfoSchema = z.object({
  productName: z.string().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  cost: z.coerce.number().optional().nullable(),
  paymentDate: z.date().optional().nullable(),
});

type ProductInfoFormValues = z.infer<typeof productInfoSchema>;

interface ProductInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: ProductInfoData | null;
  onSave: (data: ProductInfoData) => void;
}

function toFormValues(data: ProductInfoData | null): ProductInfoFormValues {
  if (!data) return { productName: null, supplierName: null, cost: null, paymentDate: null };
  return {
    productName: data.productName ?? null,
    supplierName: data.supplierName ?? null,
    cost: data.cost ?? null,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
  };
}

function toProductInfoData(values: ProductInfoFormValues): ProductInfoData {
  return {
    productName: values.productName?.trim() || null,
    supplierName: values.supplierName?.trim() || null,
    cost: values.cost != null ? Number(values.cost) : null,
    paymentDate: values.paymentDate ? values.paymentDate.toISOString().split("T")[0] : null,
  };
}

export function ProductInfoModal({
  open,
  onOpenChange,
  initialData,
  onSave,
}: ProductInfoModalProps) {
  const form = useForm<ProductInfoFormValues>({
    resolver: zodResolver(productInfoSchema),
    defaultValues: toFormValues(initialData),
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(initialData));
    }
  }, [open, initialData, form]);

  const handleSubmit = (values: ProductInfoFormValues) => {
    onSave(toProductInfoData(values));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Información del producto</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(handleSubmit)(e);
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del producto</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Laptop HP"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplierName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del proveedor</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Distribuidora XYZ"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cost"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Costo</FormLabel>
                  <FormControl>
                    <FormattedInput
                      placeholder="0"
                      value={value ?? ""}
                      onChange={onChange}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de pago</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Seleccione la fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={form.formState.isSubmitting}
                onClick={() => form.handleSubmit(handleSubmit)()}
              >
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
