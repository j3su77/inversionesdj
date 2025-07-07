import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import { updateClientStatus } from "@/actions/clients";
import { Client } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Componente independiente (nuevo)
interface IndependentClientStatusToggleProps {
  client: Client;
  onStatusChange?: (isDisallowed: boolean) => void;
}

export const IndependentClientStatusToggle = ({
  client,
  onStatusChange,
}: IndependentClientStatusToggleProps) => {
  const router = useRouter();
  const [isDisallowed, setIsDisallowed] = useState(client.isDisallowed);
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (newStatus: boolean) => {
    setIsLoading(true);
    try {
      const result = await updateClientStatus(client.id, newStatus);

      if (result.success) {
        setIsDisallowed(newStatus);
        toast.success(result.message);
        onStatusChange?.(newStatus);
        router.refresh();
      } else {
        toast.error(result.error || "Error al actualizar el estado");
      }
    } catch (error) {
      console.error("Error updating client status:", error);
      toast.error("Error al actualizar el estado del cliente");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-card w-fit">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {isDisallowed ? "Restringido" : "Activo"}
          </span>
          {isLoading && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>
        <Switch
          checked={isDisallowed}
          onCheckedChange={handleStatusChange}
          disabled={isLoading}
          className="data-[state=checked]:bg-destructive"
        />
      </div>
    </div>
  );
};
