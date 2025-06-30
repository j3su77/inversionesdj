"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListClientsByStatus } from "./list-client-by-status";

export const TabsClientList = () => {
  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="all">Todos</TabsTrigger>
        <TabsTrigger value="active">Activos</TabsTrigger>
        <TabsTrigger value="inactive">Inactivos (mas de 1 año)</TabsTrigger>
        <TabsTrigger value="blocked">Bloqueados</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <ListClientsByStatus status="all" />
      </TabsContent>
      <TabsContent value="active">
        <ListClientsByStatus status="active" />
      </TabsContent>
      <TabsContent value="inactive">
        <ListClientsByStatus status="inactive" />
      </TabsContent>
      <TabsContent value="blocked">
        <ListClientsByStatus status="blocked" />
      </TabsContent>
    </Tabs>
  );
};
