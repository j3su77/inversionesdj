"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getLoansByStatus, type LoanStatusFilter } from "@/actions/loans";  
import { Loan } from "@prisma/client";
import { DataTable } from "@/components/datatable";
import { columnsLoan } from "./columns-loan";
import useTabManager from "@/hooks/use-tab";
import { Skeleton } from "@/components/ui/skeleton";

const tabs = [
  {
    value: "active",
    label: "Activos",
  },
  {
    value: "dueToday",
    label: "Por Cobrar Hoy",
  },
  {
    value: "overdue",
    label: "En Mora",
  },
  {
    value: "paid",
    label: "Pagados",
  },
  {
    value: "all",
    label: "Todos",
  },
] as const;

export function TabsLoanList() {
  const [isClient, setIsClient] = useState<boolean>(false);
  const { activeTab, handleTabChange } = useTabManager({
    initialTab: "dueToday",
  });
  const [loans, setLoans] = useState<
    (Loan & {
      client: {
        fullName: string;
        identification: number;
        phone: string | null;
        cellphone: string | null;
      } | null;
      payments: {
        interestAmount: number;
      }[];
      _count: {
        payments: number;
      } | null;
    })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const loadLoans = async () => {
      try {
        setIsLoading(true);
        const data = await getLoansByStatus(activeTab as LoanStatusFilter);
        setLoans(data);
      } catch (error) {
        console.error("Error loading loans:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLoans();
  }, [activeTab]);

  useEffect(() => {
    console.log({ activeTab });
  }, [activeTab]);

  if (!isClient || activeTab == null) {
    return (
      <div className="flex justify-center items-center py-8">
        <Skeleton className="h-[300px] w-full " />
      </div>
    );
  }

  return (
    <Tabs
      defaultValue="active"
      value={activeTab}
      onValueChange={(value) => handleTabChange(value as LoanStatusFilter)}
      className="space-y-4"
    >
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="space-y-4">
          <DataTable loading={isLoading} data={loans} columns={columnsLoan} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
