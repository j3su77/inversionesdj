import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { DataTable } from "@/components/datatable";
import { columnsClient } from "./columns-client";
import { getClientsByStatus } from "@/actions/clients";
import { Client, Loan } from "@prisma/client";

const clientsByStatus = async (
  status: "active" | "inactive" | "all" | "blocked",
  managedByUserId?: string | null
) => {
  const clients = await getClientsByStatus(status, managedByUserId);
  return clients;
};

function matchClientSearch(client: Client & { loans: Loan[] }, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const fields = [
    client.fullName,
    String(client.identification ?? ""),
    client.phone ?? "",
    client.cellphone ?? "",
    client.address ?? "",
    client.occupation ?? "",
    client.companyName ?? "",
    client.placeOfBirth ?? "",
    client.nationality ?? "",
    client.currentPosition ?? "",
    client.workplace ?? "",
  ];
  return fields.some((v) => String(v).toLowerCase().includes(q));
}

export const ListClientsByStatus = ({
  status,
  managedByUserId,
  searchQuery = "",
}: {
  status: "active" | "inactive" | "all" | "blocked";
  managedByUserId?: string | null;
  searchQuery?: string;
}) => {
  const [data, setData] = useState<(Client & { loans: Loan[] })[]>([]);
  const [isLoading, setIsloading] = useState(true);

  useEffect(() => {
    setIsloading(true);
    const load = async () => {
      try {
        const clients = await clientsByStatus(status, managedByUserId);
        setData(clients as (Client & { loans: Loan[] })[]);
      } catch (error) {
        console.log({ error });
      } finally {
        setIsloading(false);
      }
    };
    load();
  }, [status, managedByUserId]);

  const filteredData = useMemo(() => {
    return data.filter((client) => matchClientSearch(client, searchQuery));
  }, [data, searchQuery]);

  return (
    <div>
      {isLoading ? (
        <div className="w-full flex justify-center items-center min-h-[60vh]">
          <Loader2 className="text-primary w-12 h-12 animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columnsClient}
          data={filteredData}
          // editHref={{ btnText: "Ver", href: "/dashboard/clientes/editar", }}
          
        />
      )}
    </div>
  );
};
