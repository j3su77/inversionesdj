"use client";

import { LoanForm } from "../_components/loan-form";
import { getClientById } from "@/actions/clients";
import { ClientSearch } from "../../clientes/_components/client-search";
import { useEffect, useState } from "react";
import { Client } from "@prisma/client";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientInfoCard } from "@/components/client-info-card";
import { useRouter, useSearchParams } from "next/navigation";
import { TitlePage } from "@/components/title-page";


const getClientId = async (id: string) => {
  const client = await getClientById(id);
  return client;
};

function RegistrarPrestamo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [client, setClient] = useState<Client | null>(null);
  const clientId = searchParams.get("clientId");

  useEffect(() => {
    if (clientId) {
      getClientId(clientId).then((client) => setClient(client));
    }
  }, [clientId]);

  const cleanClient = () => {
    setClient(null);
    // const newQueryString = createQueryString("clientId", "");
    router.push(`/dashboard/prestamos/registrar`);
  };

  // const createQueryString = useCallback(
  //   (name: string, value: string) => {
  //     const params = new URLSearchParams(searchParams.toString());
  //     params.set(name, value);

  //     return params.toString();
  //   },
  //   [searchParams]
  // );

  return (
    <div className="mx-auto h-full p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <TitlePage text="Registrar Préstamo" icon={UserPlus} />
          <p className="text-muted-foreground">
            Ingresa los detalles del nuevo préstamo
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/prestamos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a préstamos
          </Link>
        </Button>
      </div>

      <Card className="">
        <CardHeader>
          <CardTitle>Seleccionar Cliente</CardTitle>
          <CardDescription>
            Busca y selecciona el cliente para el préstamo o{" "}
            <Link
              href="/dashboard/clientes/registrar"
              className="text-primary hover:underline"
            >
              <UserPlus className="inline h-4 w-4 mb-1" /> registra uno nuevo
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 justify-start items-start h-full min-h-[200px]">
          {client ? (
            <div className="flex flex-col gap-4 justify-start items-start">
              <Button variant="outline" size="sm" onClick={cleanClient}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a seleccionar cliente
              </Button>
              <ClientInfoCard client={client} />
            </div>
          ) : (
            <ClientSearch onClientSelect={setClient} />
          )}
        </CardContent>
      </Card>

      {client && (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Préstamo</CardTitle>
              <CardDescription>
                Configurando préstamo para {client.fullName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoanForm client={client} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default RegistrarPrestamo;
