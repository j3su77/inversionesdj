"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  const lastSegment = segments[segments.length - 1];
  const isDynamicId = UUID_REGEX.test(lastSegment);

  // Si el último segmento es un ID (ej. UUID), subir dos niveles para evitar
  // rutas sin página como /dashboard/prestamos/gestionar/
  const levelsUp = isDynamicId && segments.length >= 3 ? 2 : 1;
  const parentPath = "/" + segments.slice(0, -levelsUp).join("/");

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
      onClick={() => router.push(parentPath)}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Atrás
    </Button>
  );
}
