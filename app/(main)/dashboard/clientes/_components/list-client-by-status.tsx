import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { DataTable } from "@/components/datatable";
import { columnsClient } from "./columns-client";
import { getClientsByStatus } from "@/actions/clients";
import { Client, Loan } from "@prisma/client";

const clientsByStatus = async (
  status: "active" | "inactive" | "all" | "blocked"
) => {
  const clients = await getClientsByStatus(status);

  return clients;
};

export const ListClientsByStatus = ({
  status,
}: {
  status: "active" | "inactive" | "all" | "blocked";
}) => {
  const [data, setData] = useState<(Client & { loans: Loan[] })[]>([]);
  const [isLoading, setIsloading] = useState(true);

  useEffect(() => {
    setIsloading(true);
    const data = async () => {
      try {
        const clients = await clientsByStatus(status);
        setData(clients as (Client & { loans: Loan[] })[]);
      } catch (error) {
        console.log({ error });
      } finally {
        setIsloading(false);
      }
    };
    data();
  }, [status]);

  return (
    <div>
      {isLoading ? (
        <div className="w-full flex justify-center items-center min-h-[60vh]">
          <Loader2 className="text-primary w-12 h-12 animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columnsClient}
          data={data}
          editHref={{ btnText: "Ver", href: "/dashboard/clientes/editar" }}
        />
      )}
    </div>
  );
};
