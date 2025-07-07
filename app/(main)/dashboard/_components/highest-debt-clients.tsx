"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Calendar, DollarSign, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getClientsWithHighestDebt } from "@/actions/clients";
import Link from "next/link";

type ClientWithDebt = {
  id: string;
  fullName: string;
  identification: number;
  totalDebt: number;
  totalLoans: number;
  nextPaymentDate: Date | null;
  loans: Array<{
    id: string;
    balance: number;
    totalAmount: number;
    nextPaymentDate: Date | null;
    paymentFrequency: string;
    currentInstallmentAmount: number;
  }>;
};

export function HighestDebtClients() {
  const [clients, setClients] = useState<ClientWithDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const data = await getClientsWithHighestDebt(10);
        setClients(data);
      } catch (err) {
        setError("Error al cargar los clientes con mayor deuda");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Clientes con Mayor Deuda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Clientes con Mayor Deuda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Clientes con Mayor Deuda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No hay clientes con deuda pendiente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Clientes con Mayor Deuda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Identificación</TableHead>
                <TableHead className="text-right">Deuda Total</TableHead>
                <TableHead className="text-center">Préstamos</TableHead>
                <TableHead>Próximo Pago</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client, index) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <Badge variant={index < 3 ? "destructive" : "secondary"}>
                      {index + 1}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {client.fullName}
                  </TableCell>
                  <TableCell>
                    {client.identification.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    <span className="text-red-600">
                      {formatCurrency({ value: client.totalDebt, symbol: true })}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="flex items-center gap-1 w-fit mx-auto">
                      <Users className="h-3 w-3" />
                      {client.totalLoans}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {client.nextPaymentDate ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(client.nextPaymentDate, "dd/MM/yyyy", { locale: es })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin fecha</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/dashboard/clientes/editar/${client.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}