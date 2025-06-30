"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getLoansByStatus, type LoanStatusFilter } from "@/actions/loans";
import { Loader2 } from "lucide-react";
import { Loan } from "@prisma/client";
import { DataTable } from "@/components/datatable";
import { columnsLoan } from "./columns-loan";

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
  const [activeTab, setActiveTab] = useState<LoanStatusFilter>("active");
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
    const loadLoans = async () => {
      try {
        setIsLoading(true);
        const data = await getLoansByStatus(activeTab);
        setLoans(data);
      } catch (error) {
        console.error("Error loading loans:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLoans();
  }, [activeTab]);

  return (
    <Tabs
      defaultValue="active"
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as LoanStatusFilter)}
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
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            // <LoanTable loans={loans} />

            <DataTable data={loans} columns={columnsLoan} />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
