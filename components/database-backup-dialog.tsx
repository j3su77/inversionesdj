"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Database, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename="([^"]+)"/);
  return match?.[1] ?? null;
}

export function DatabaseBackupDialog() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (session?.user?.role !== Role.ADMIN) {
    return null;
  }

  const handleDownload = async () => {
    if (!password.trim()) {
      toast.error("Ingresa tu contraseña para continuar");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/database-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "No se pudo descargar la copia");
      }

      const blob = await response.blob();
      const filename =
        filenameFromContentDisposition(response.headers.get("Content-Disposition")) ??
        "inversiones-dj-backup.sql";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success("Copia de la base de datos descargada");
      setPassword("");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al descargar la copia");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Descargar copia de la base de datos">
          <Database className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Descargar copia de la base de datos</DialogTitle>
          <DialogDescription>
            Se generará un archivo SQL con una instantánea actual. Confirma con tu contraseña de
            administrador. Guarda el archivo en un lugar seguro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="backup-password">Contraseña</Label>
          <div className="relative">
            <Input
              id="backup-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleDownload} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando…
              </>
            ) : (
              "Descargar SQL"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
