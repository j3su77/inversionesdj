import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ClientSegment {
  riskLevel: "bajo" | "medio" | "alto";
  incomeCategory: "A" | "B" | "C" | "D";
  paymentBehavior: "excelente" | "bueno" | "regular" | "malo";
}

// Función auxiliar para calcular la fecha esperada de pago
function calculateExpectedPaymentDate(
  startDate: Date,
  installmentNumber: number,
  frequency: string
): Date {
  const start = new Date(startDate);

  switch (frequency) {
    case "DAILY":
      return new Date(
        start.getTime() + (installmentNumber - 1) * 24 * 60 * 60 * 1000
      );
    case "WEEKLY":
      return new Date(
        start.getTime() + (installmentNumber - 1) * 7 * 24 * 60 * 60 * 1000
      );
    case "BIWEEKLY":
      return new Date(
        start.getTime() + (installmentNumber - 1) * 15 * 24 * 60 * 60 * 1000
      );
    case "MONTHLY":
      const monthlyDate = new Date(start);
      const originalDay = monthlyDate.getDate();
      const targetMonth = monthlyDate.getMonth() + (installmentNumber - 1);
      const targetYear = monthlyDate.getFullYear() + Math.floor(targetMonth / 12);
      const finalMonth = targetMonth % 12;
      
      // Crear fecha con el mes y año objetivo
      monthlyDate.setFullYear(targetYear, finalMonth, 1);
      // Obtener el último día del mes objetivo
      const lastDayOfMonth = new Date(targetYear, finalMonth + 1, 0).getDate();
      // Usar el día original o el último día del mes, el que sea menor
      monthlyDate.setDate(Math.min(originalDay, lastDayOfMonth));
      return monthlyDate;
    case "QUARTERLY":
      const quarterlyDate = new Date(start);
      quarterlyDate.setMonth(quarterlyDate.getMonth() + (installmentNumber - 1) * 3);
      return quarterlyDate;
    default:
      return new Date(
        start.getTime() + (installmentNumber - 1) * 30 * 24 * 60 * 60 * 1000
      );
  }
}

// Función para calcular el perfil del cliente
function calculateClientProfile(
  monthlyIncome: number | null,
  loans: Array<{
    status: string;
    startDate: Date;
    paymentFrequency: string;
    nextPaymentDate: Date | null;
    balance: number;
    payments: Array<{
      paymentDate: Date;
      installmentNumber: number;
    }>;
  }>
): ClientSegment {
  // 1. Calcular categoría de ingresos
  let incomeCategory: "A" | "B" | "C" | "D" = "D";
  if (monthlyIncome) {
    if (monthlyIncome >= 10000000) incomeCategory = "A";
    else if (monthlyIncome >= 6000000) incomeCategory = "B";
    else if (monthlyIncome >= 1000000) incomeCategory = "C";
    else incomeCategory = "D";
  }

  // 2. Calcular comportamiento de pagos basado en historial real
  let paymentBehavior: "excelente" | "bueno" | "regular" | "malo" = "excelente";
  let totalLatePayments = 0; // Pagos que se hicieron después de la fecha esperada
  let totalPayments = 0; // Total de pagos realizados

  if (loans.length > 0) {
    let loansInArrears = 0; // Préstamos activos con próximo pago vencido

    loans.forEach((loan) => {
      // Analizar historial de pagos para detectar patrones de retraso
      // Ordenar pagos por número de cuota para análisis correcto
      const sortedPayments = [...loan.payments].sort(
        (a, b) => a.installmentNumber - b.installmentNumber
      );
      
      // Verificar si hay pagos recientes que fueron puntuales o adelantados
      let hasRecentOnTimePayments = false;
      if (sortedPayments.length > 0) {
        const lastPayment = sortedPayments[sortedPayments.length - 1];
        const lastPaymentDate = new Date(lastPayment.paymentDate);
        const daysSinceLastPayment = Math.floor(
          (new Date().getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Si el último pago fue hace menos de 60 días, verificar si fue puntual o adelantado
        if (daysSinceLastPayment <= 60) {
          const expectedDate = calculateExpectedPaymentDate(
            loan.startDate,
            lastPayment.installmentNumber,
            loan.paymentFrequency
          );
          const normalizedExpected = new Date(
            expectedDate.getFullYear(),
            expectedDate.getMonth(),
            expectedDate.getDate()
          );
          const normalizedActual = new Date(
            lastPaymentDate.getFullYear(),
            lastPaymentDate.getMonth(),
            lastPaymentDate.getDate()
          );
          const daysDifference = Math.floor(
            (normalizedActual.getTime() - normalizedExpected.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          // Si el último pago fue puntual (hasta 5 días después) o adelantado, considerar que hay pagos recientes puntuales
          if (daysDifference <= 5) {
            hasRecentOnTimePayments = true;
          }
        }
      }
      
      // Contar préstamos activos en mora (próximo pago vencido)
      // PERO solo si NO hay pagos recientes puntuales o adelantados
      // Esto evita marcar como mora cuando el cliente está haciendo pagos adelantados
      if (
        (loan.status === "ACTIVE" || loan.status === "PENDING") &&
        loan.nextPaymentDate &&
        loan.nextPaymentDate < new Date() &&
        loan.balance > 0 &&
        !hasRecentOnTimePayments // No contar como mora si hay pagos recientes puntuales/adelantados
      ) {
        loansInArrears++;
      }
      
      sortedPayments.forEach((payment) => {
        totalPayments++;
        
        // Usar el número de cuota real del pago, no el índice
        const expectedDate = calculateExpectedPaymentDate(
          loan.startDate,
          payment.installmentNumber,
          loan.paymentFrequency
        );
        const actualDate = new Date(payment.paymentDate);

        // Normalizar fechas para comparación (solo fecha, sin hora)
        const normalizedExpected = new Date(
          expectedDate.getFullYear(),
          expectedDate.getMonth(),
          expectedDate.getDate()
        );
        const normalizedActual = new Date(
          actualDate.getFullYear(),
          actualDate.getMonth(),
          actualDate.getDate()
        );

        // Calcular diferencia en días: positivo = pago tardío, negativo = pago adelantado
        const daysDifference = Math.floor(
          (normalizedActual.getTime() - normalizedExpected.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        
        // Solo contar como tardío si el pago se hizo MÁS DE 5 días DESPUÉS de la fecha esperada
        // Los pagos adelantados (daysDifference negativo) NO se cuentan como tardíos
        // IMPORTANTE: daysDifference < 0 significa pago adelantado, NO contar como tardío
        if (daysDifference > 5) {
          totalLatePayments++;
        }
        // Nota: Si daysDifference <= 0 (pago adelantado o exacto), NO se incrementa totalLatePayments
      });
    });

    // Calcular el comportamiento basado SOLO en el porcentaje de pagos atrasados
    // (no incluir préstamos en mora en este cálculo)
    const latePaymentRate =
      totalPayments > 0 ? (totalLatePayments / totalPayments) * 100 : 0;

    // Si NO hay pagos tardíos (todos fueron puntuales o adelantados), comportamiento debe ser excelente
    if (latePaymentRate === 0) {
      paymentBehavior = "excelente";
    } else if (latePaymentRate <= 10) {
      paymentBehavior = "bueno";
    } else if (latePaymentRate <= 25) {
      paymentBehavior = "regular";
    } else {
      paymentBehavior = "malo";
    }

    // Ajustar comportamiento si hay préstamos activos en mora
    // IMPORTANTE: Solo degradar si hay evidencia de pagos tardíos
    // Si todos los pagos fueron puntuales o adelantados (latePaymentRate === 0), 
    // NO degradar el comportamiento bajo ninguna circunstancia
    if (loansInArrears > 0 && latePaymentRate > 0) {
      // Solo ajustar si hay préstamos en mora Y hay pagos tardíos
      // Si hay préstamos en mora pero todos los pagos fueron puntuales/adelantados, no degradar
      if (paymentBehavior === "excelente") {
        paymentBehavior = "bueno";
      }
      // Si hay múltiples préstamos en mora o el porcentaje de pagos tardíos ya es alto, marcar como malo
      if (loansInArrears >= 2 || latePaymentRate > 15) {
        paymentBehavior = "malo";
      } else if (latePaymentRate > 5) {
        paymentBehavior = "regular";
      }
    }
    // Si hay préstamos en mora pero latePaymentRate === 0 (todos los pagos fueron puntuales/adelantados),
    // NO degradar el comportamiento - mantener como "excelente"
  }

  // 3. Calcular nivel de riesgo (combina ingresos y comportamiento de pagos)
  let riskLevel: "bajo" | "medio" | "alto" = "medio";

  // Matriz de riesgo basada en ingresos y comportamiento
  if (incomeCategory === "A" || incomeCategory === "B") {
    if (paymentBehavior === "excelente" || paymentBehavior === "bueno") {
      riskLevel = "bajo";
    } else if (paymentBehavior === "regular") {
      riskLevel = "medio";
    } else {
      riskLevel = "alto";
    }
  } else if (incomeCategory === "C") {
    if (paymentBehavior === "excelente") {
      riskLevel = "bajo";
    } else if (paymentBehavior === "bueno" || paymentBehavior === "regular") {
      riskLevel = "medio";
    } else {
      riskLevel = "alto";
    }
  } else {
    // incomeCategory === "D"
    if (paymentBehavior === "excelente") {
      riskLevel = "medio";
    } else {
      riskLevel = "alto";
    }
  }

  // Asegurar que si todos los pagos fueron puntuales o adelantados (totalLatePayments === 0),
  // el comportamiento sea "excelente" y el riesgo se calcule correctamente
  if (loans.length > 0 && totalPayments > 0) {
    const allPaymentsOnTime = totalLatePayments === 0;
    if (allPaymentsOnTime) {
      // Si todos los pagos fueron puntuales o adelantados, el comportamiento DEBE ser "excelente"
      paymentBehavior = "excelente";
      // Recalcular el riesgo basado en el comportamiento "excelente"
      if (incomeCategory === "A" || incomeCategory === "B") {
        riskLevel = "bajo";
      } else if (incomeCategory === "C") {
        riskLevel = "bajo"; // Con comportamiento excelente, categoría C = riesgo bajo
      } else {
        // incomeCategory === "D"
        riskLevel = "medio"; // Con comportamiento excelente, categoría D = riesgo medio
      }
    }
  }

  // Ajustar riesgo si no hay historial crediticio
  if (loans.length === 0) {
    riskLevel = "medio"; // Sin historial = riesgo medio
    paymentBehavior = "excelente"; // Sin historial negativo
  }

  return {
    riskLevel,
    incomeCategory,
    paymentBehavior,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;

    // Obtener solo los datos necesarios para calcular el perfil
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        monthlyIncome: true,
        loans: {
          select: {
            status: true,
            startDate: true,
            paymentFrequency: true,
            nextPaymentDate: true,
            balance: true,
            payments: {
              select: {
                paymentDate: true,
                installmentNumber: true,
              },
              orderBy: {
                installmentNumber: "asc",
              },
            },
          },
        },
      },
    });

    if (!client) {
      return new NextResponse("Cliente no encontrado", { status: 404 });
    }

    // Calcular el perfil del cliente
    const profile = calculateClientProfile(client.monthlyIncome, client.loans);

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[CLIENT_PROFILE_ERROR]", error);
    return new NextResponse("Error al calcular el perfil del cliente", {
      status: 500,
    });
  }
}
