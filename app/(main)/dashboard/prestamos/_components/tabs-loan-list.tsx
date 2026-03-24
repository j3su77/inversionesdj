"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { getLoansByStatus, type LoanStatusFilter } from "@/actions/loans";
import { getManagers, type ManagerUser } from "@/actions/users";
import { Loan } from "@prisma/client";
import { DataTable } from "@/components/datatable";
import { columnsLoan, columnsLoanOverdue } from "./columns-loan";
import useTabManager from "@/hooks/use-tab";
import { Skeleton } from "@/components/ui/skeleton";

type LoanRow = Loan & {
  client: {
    fullName: string;
    identification: number;
    phone: string | null;
    cellphone: string | null;
  } | null;
  managedBy?: { id: string; username: string } | null;
  payments: { interestAmount: number }[];
  _count: { payments: number } | null;
};

function matchLoanSearch(loan: LoanRow, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const fields = [
    loan.loanNumber,
    loan.client?.fullName ?? "",
    String(loan.client?.identification ?? ""),
    loan.client?.phone ?? "",
    loan.client?.cellphone ?? "",
    String(loan.totalAmount ?? ""),
    String(loan.balance ?? ""),
    loan.managedBy?.username ?? "",
  ];
  return fields.some((v) => String(v).toLowerCase().includes(q));
}

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
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [managedByUserId, setManagedByUserId] = useState<string | null>(null);
  const { activeTab, handleTabChange } = useTabManager({
    initialTab: "dueToday",
  });
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    getManagers().then(setManagers);
  }, []);

  useEffect(() => {
    const loadLoans = async () => {
      try {
        setIsLoading(true);
        const data = await getLoansByStatus(
          activeTab as LoanStatusFilter,
          managedByUserId ?? undefined
        );
        setLoans(data);
      } catch (error) {
        console.error("Error loading loans:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLoans();
  }, [activeTab, managedByUserId]);

  const filteredLoans = useMemo(
    () => loans.filter((loan) => matchLoanSearch(loan, searchQuery)),
    [loans, searchQuery]
  );

  if (!isClient || activeTab == null) {
    return (
      <div className="flex justify-center items-center py-8">
        <Skeleton className="h-[300px] w-full " />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, cliente, documento, teléfono, monto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Gestor:</span>
          <Select
            value={managedByUserId ?? "all"}
            onValueChange={(v) => setManagedByUserId(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {managers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
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
            <DataTable
              loading={isLoading}
              data={filteredLoans}
              columns={
                tab.value === "overdue" ? columnsLoanOverdue : columnsLoan
              }
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
