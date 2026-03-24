"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, UserCheck, UserMinus, ShieldAlert } from "lucide-react";
import { getClientStatsCounts, type ClientStatsCounts } from "@/actions/clients";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  /** Si se define, los conteos son solo de clientes asignados a ese gestor (misma lógica que el filtro en la lista). */
  managedByUserId?: string | null;
};

export function ClientStatsCards({ managedByUserId = null }: Props) {
  const [stats, setStats] = useState<ClientStatsCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getClientStatsCounts(managedByUserId ?? undefined)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [managedByUserId]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive text-base">
            No se pudieron cargar las estadísticas de clientes
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const items: {
    title: string;
    description: string;
    value: number;
    icon: ReactNode;
    className?: string;
  }[] = [
    {
      title: "Total clientes",
      description: "Registrados",
      value: stats.total,
      icon: <Users className="h-5 w-5" />,
      className: "border-primary/20 bg-primary/5",
    },
    {
      title: "Activos",
      description: "Con actividad reciente o préstamos vigentes",
      value: stats.active,
      icon: <UserCheck className="h-5 w-5 text-emerald-600" />,
      className: "border-emerald-200/80 bg-emerald-50/80 dark:bg-emerald-950/20",
    },
    {
      title: "Inactivos",
      description: "Más de 1 año sin el criterio de activo",
      value: stats.inactive,
      icon: <UserMinus className="h-5 w-5 text-amber-700" />,
      className: "border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/20",
    },
    {
      title: "Bloqueados",
      description: "Estado bloqueado o restringido",
      value: stats.blocked,
      icon: <ShieldAlert className="h-5 w-5 text-red-600" />,
      className: "border-red-200/80 bg-red-50/80 dark:bg-red-950/20",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title} className={item.className}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            {item.icon}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{item.value}</div>
            <CardDescription className="text-xs mt-1">
              {item.description}
            </CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
