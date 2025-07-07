import { ExpenseCategory } from "@prisma/client";
import { clsx, type ClassValue } from "clsx"
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const formatDate = (date?: Date | null, formatStr?: string): string => {
  if (!date) return "-";
  try {
    return format(date, formatStr ? formatStr : "dd 'de' MMMM 'de' yyyy", {
      locale: es,
    });
  } catch {
    return "-";
  }
};

export const getPaymentFrequencyLabel = (frequency: string) => {
  switch (frequency) {
    case "DAILY":
      return "Diario";
    case "WEEKLY":
      return "Semanal";
    case "BIWEEKLY":
      return "Quincenal";
    case "MONTHLY":
      return "Mensual";
    case "QUARTERLY":
      return "Trimestral";
    default:
      return frequency;
  }
}

export const formatCurrency = ({
  value,
  symbol = true,
}: {
  value?: number;
  symbol?: boolean;
}): string => {
  try {
    // Si el valor es null, undefined o NaN, retorna un valor por defecto
    if (value == null || isNaN(value)) {
      return symbol ? "$ 0" : "0";
    }

    // Asegurarse de que el valor sea un número
    const numericValue = Number(value);

    if (symbol) {
      return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numericValue);
    }

    return new Intl.NumberFormat("es-CO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericValue);
  } catch (error) {
    console.error("Error formatting currency:", error);
    // Fallback simple en caso de error
    return symbol
      ? `$ ${value?.toLocaleString("es-CO") || "0"}`
      : value?.toLocaleString("es-CO") || "0";
  }
};

// Función de traducción con tipos
// export const translatePaymentFrequency = (
//   frequency: PaymentFrequency
// ): string => {
//   if (!frequency) return "No especificado";

//   const translations: Record<PaymentFrequency, string> = {
//     [PaymentFrequency.DAILY]: "Diario",
//     [PaymentFrequency.WEEKLY]: "Semanal",
//     [PaymentFrequency.BIWEEKLY]: "Quincenal",
//     [PaymentFrequency.MONTHLY]: "Mensual",
//     [PaymentFrequency.QUARTERLY]: "Trimestral",
//   };

//   return translations[frequency as PaymentFrequency] || "Desconocido";
// };


export function getExpenseCategoryLabel(category: ExpenseCategory): string {
  const labels: Record<ExpenseCategory, string> = {
    SERVICIOS_PUBLICOS: "Servicios Públicos",
    ARRIENDO: "Arriendo",
    NOMINA: "Nómina",
    MARKETING: "Marketing",
    TRANSPORTE: "Transporte",
    SUMINISTROS: "Suministros",
    TECNOLOGIA: "Tecnología",
    MANTENIMIENTO: "Mantenimiento",
    SEGUROS: "Seguros",
    IMPUESTOS: "Impuestos",
    LEGAL: "Legal",
    ALIMENTACION: "Alimentación",
    OTROS: "Otros",
  };

  return labels[category];
}

export function getExpenseCategoryColor(category: ExpenseCategory): string {
  const colors: Record<ExpenseCategory, string> = {
    SERVICIOS_PUBLICOS: "bg-blue-100 text-blue-800 border-blue-200",
    ARRIENDO: "bg-purple-100 text-purple-800 border-purple-200",
    NOMINA: "bg-green-100 text-green-800 border-green-200",
    MARKETING: "bg-pink-100 text-pink-800 border-pink-200",
    TRANSPORTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
    SUMINISTROS: "bg-orange-100 text-orange-800 border-orange-200",
    TECNOLOGIA: "bg-indigo-100 text-indigo-800 border-indigo-200",
    MANTENIMIENTO: "bg-red-100 text-red-800 border-red-200",
    SEGUROS: "bg-teal-100 text-teal-800 border-teal-200",
    IMPUESTOS: "bg-gray-100 text-gray-800 border-gray-200",
    LEGAL: "bg-slate-100 text-slate-800 border-slate-200",
    ALIMENTACION: "bg-emerald-100 text-emerald-800 border-emerald-200",
    OTROS: "bg-neutral-100 text-neutral-800 border-neutral-200",
  };

  return colors[category];
} 