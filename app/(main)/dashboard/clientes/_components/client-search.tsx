"use client";

import { useEffect, useState } from "react";
import { getClientBySearch } from "@/actions/clients";
import { Input } from "@/components/ui/input";
import { CircleDollarSign, Eye, Loader2, Search, X } from "lucide-react";
import { Client } from "@prisma/client";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounced";

const getClients = async (query: string) => {
  const clients = await getClientBySearch(query);
  return clients;
};

export function ClientSearch({
  onClientSelect,
}: {
  onClientSelect: (client: Client) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Efecto para marcar el componente como montado
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Efecto para manejar la búsqueda debounced
  useEffect(() => {
    const searchClients = async () => {
      if (debouncedSearch.length < 3) {
        setClients([]);
        return;
      }
      setOpen(true);
      setIsLoading(true);
      try {
        const results = await getClients(debouncedSearch);
        setClients(results);
      } catch (error) {
        console.error("Error en búsqueda:", error);
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchClients();
  }, [debouncedSearch]);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
  };

  if (!isMounted) {
    return null;
  }

  const onClientSelected = async (client: Client) => {
    await onClientSelect(client);
    setSearchQuery("");
    setOpen(false);
  };

  return (
    <div className="w-[300px] space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Buscar cliente por nombres o # documento"
          className="w-full pl-8 py-2"
        />
        {searchQuery.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchQuery("")}
            className="h-fit w-fit absolute right-2 top-1/2 -translate-y-1/2"
          >
            <X className="text-red-500 w-4 h-4" />
          </Button>
        )}
        {isLoading && (
          <div className="absolute right-2 top-2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          </div>
        )}

        {clients.length > 0 && open && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white p-2 shadow-lg">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Resultados ({clients.length}):
              </p>
              <ul className="space-y-1">
                {clients.map((client) => (
                  <div key={client.id} className="flex flex-col w-full">
                    <div className="flex w-full flex-1 ">
                      <div className="flex flex-col w-full  text-xs text-muted-foreground mt-1">
                        <span className="font-medium">{client.fullName}</span>
                        <span>ID: {client.identification}</span>
                        <span>Tel: {client.cellphone}</span>
                      </div>

                      {onClientSelected ? (
                        <Button
                          className={cn(buttonVariants())}
                          onClick={() => onClientSelected(client)}
                        >
                          Seleccionar
                        </Button>
                      ) : (
                        <div className="flex flex-col items-end w-fit">
                          <Link
                            className={cn(buttonVariants())}
                            href={`/dashboard/clientes/editar/${client.id}`}
                            onClick={() => {
                              setOpen(false);
                            }}
                          >
                            <Eye />
                          </Link>
                          <Link
                            className={cn(buttonVariants())}
                            href={`/dashboard/prestamos/registrar?clientId=${client.id}`}
                            onClick={() => setOpen(false)}
                          >
                            <CircleDollarSign />
                          </Link>
                        </div>
                      )}
                    </div>
                    <Separator />
                  </div>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
