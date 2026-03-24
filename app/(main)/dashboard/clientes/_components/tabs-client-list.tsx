"use client"

import { useEffect, useState } from "react";
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
import { ListClientsByStatus } from "./list-client-by-status";
import { getManagers, type ManagerUser } from "@/actions/users";
import { ClientStatsCards } from "../../_components/client-stats-cards";

export const TabsClientList = () => {
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [managedByUserId, setManagedByUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getManagers().then(setManagers);
  }, []);

  return (
    <div className="space-y-4">
      <ClientStatsCards managedByUserId={managedByUserId} />

      <div className="flex flex-wrap items-center gap-4 mt-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, documento, teléfono, dirección..."
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
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="active">Activos</TabsTrigger>
          <TabsTrigger value="inactive">Inactivos (mas de 1 año)</TabsTrigger>
          <TabsTrigger value="blocked">Bloqueados</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <ListClientsByStatus status="all" managedByUserId={managedByUserId} searchQuery={searchQuery} />
        </TabsContent>
        <TabsContent value="active">
          <ListClientsByStatus status="active" managedByUserId={managedByUserId} searchQuery={searchQuery} />
        </TabsContent>
        <TabsContent value="inactive">
          <ListClientsByStatus status="inactive" managedByUserId={managedByUserId} searchQuery={searchQuery} />
        </TabsContent>
        <TabsContent value="blocked">
          <ListClientsByStatus status="blocked" managedByUserId={managedByUserId} searchQuery={searchQuery} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
