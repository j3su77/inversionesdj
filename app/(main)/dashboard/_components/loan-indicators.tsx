"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
} from "lucide-react";
import { getLoanStats } from "@/actions/loans";
import { Skeleton } from "@/components/ui/skeleton";

interface LoanStats {
  totalActiveLoans: number;
  currentLoans: number;
  overdueLoans: number;
  dueTodayLoans: number;
  totalActiveAmount: number;
  totalPendingAmount: number;
  overdueAmount: number;
  overduePercentage: number;
}

const getLoanStatsClient = async () => {
  try {
    const response = await getLoanStats();
    return response;
  } catch (error) {
    console.error("Error fetching loan stats:", error);
    return {
      success: false,
      data: null,
      error: error,
    };
  }
};

export function LoanIndicators() {
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const result = await getLoanStatsClient();
      if (result.success && result.data) {
        setStats(result.data);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-40 bg-gray-200 rounded-lg" />
        ))}
        
        <div className="col-span-full">
        <Skeleton className="h-52 bg-gray-200 rounded-lg w-full" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Error al cargar estadísticas de préstamos
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Préstamos Activos */}
      {/* todo: agregar link a la tabla de prestamos activos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Préstamos Activos
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalActiveLoans}</div>
          <p className="text-xs text-muted-foreground">
            Total de préstamos en curso
          </p>
        </CardContent>
      </Card>

      {/* Préstamos al Día */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Al Día</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.currentLoans}
          </div>
          <p className="text-xs text-muted-foreground">Préstamos sin retraso</p>
        </CardContent>
      </Card>

      {/* Préstamos en Mora */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Mora</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {stats.overdueLoans}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.overduePercentage.toFixed(1)}% del total
          </p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(stats.overduePercentage, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Vencen Hoy */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vencen Hoy</CardTitle>
          <Calendar className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {stats.dueTodayLoans}
          </div>
          <p className="text-xs text-muted-foreground">
            Pagos programados para hoy
          </p>
        </CardContent>
      </Card>

      {/* Resumen Financiero */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-lg">Resumen Financiero</CardTitle>
          <CardDescription>
            Montos totales de la cartera de préstamos activos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Monto Total Prestado</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${stats.totalActiveAmount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Saldo Pendiente</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${stats.totalPendingAmount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">Monto en Mora</p>
                <p className="text-2xl font-bold text-red-600">
                  ${stats.overdueAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Barra de progreso del cobro */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progreso de Cobro</span>
              <span>
                {stats.totalActiveAmount > 0
                  ? (
                      ((stats.totalActiveAmount - stats.totalPendingAmount) /
                        stats.totalActiveAmount) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    stats.totalActiveAmount > 0
                      ? Math.min(
                          ((stats.totalActiveAmount -
                            stats.totalPendingAmount) /
                            stats.totalActiveAmount) *
                            100,
                          100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
