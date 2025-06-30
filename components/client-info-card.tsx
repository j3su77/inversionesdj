import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Client } from "@prisma/client";
import { User, Phone, MapPin, CreditCard } from "lucide-react";

interface ClientInfoCardProps {
  client: Client;
  variant?: "compact" | "full";
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

export function ClientInfoCard({
  client,
  variant = "full",
}: ClientInfoCardProps) {
  return (
    <Card
      className={`w-full bg-slate-100 border border-slate-200 rounded-sm ${
        variant === "compact" ? "py-2 px-3 gap-2" : ""
      }`}
    >
      <CardHeader className={`${variant === "compact" ? "py-2 p-1" : "py-1"}`}>
        <CardTitle>Información del cliente</CardTitle>
      </CardHeader>
      <CardContent className={`${variant === "compact" ? "p-1" : "pt-2"}`}>
        <div className="grid gap-2 md:grid-cols-2">
          <InfoItem
            icon={<User className="h-4 w-4" />}
            label="Nombre completo"
            value={client.fullName}
          />
          <InfoItem
            icon={<CreditCard className="h-4 w-4" />}
            label="Identificación"
            value={client.identification.toString()}
          />
          <InfoItem
            icon={<Phone className="h-4 w-4" />}
            label="Teléfono"
            value={client.cellphone || "No especificado"}
          />
          <InfoItem
            icon={<MapPin className="h-4 w-4" />}
            label="Dirección"
            value={client.address || "No especificada"}
          />
        </div>
      </CardContent>
    </Card>
  );
}
