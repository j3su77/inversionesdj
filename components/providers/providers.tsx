"use client";
import { ImageKitProvider } from "imagekitio-next";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "../ui/sidebar";
import { AppSidebar } from "../app-sidebar";
import { ClientSearch } from "@/app/(main)/dashboard/clientes/_components/client-search";
import { Separator } from "../ui/separator";
import { ModalLogout } from "../modal-logout";
import { useRouter } from "next/navigation";
import { Client } from "@prisma/client";

const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT; // Cambiado de NEXT_PUBLIC_URL_ENDPOINT
const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY; // Cambiado de NEXT_PUBLIC_PUBLIC_KEY

const authenticator = async () => {
  try {
    const response = await fetch("/api/auth"); // Elimina el localhost:3000

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Request failed with status ${response.status}: ${errorText}`
      );
    }

    return await response.json();
  } catch (error: unknown) {
    throw new Error(
      `Authentication request failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  if (!publicKey || !urlEndpoint) {
    console.error("ImageKit configuration is missing!");
    return <div>Error de configuración</div>;
  }
  const selectedClient = async (client: Client) => {
    await router.push(`/dashboard/clientes/editar/${client.id}`);
  };
  return (
    <ImageKitProvider
      publicKey={publicKey}
      urlEndpoint={urlEndpoint}
      authenticator={authenticator}
    >
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden w-full">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white rounded-md shadow-sm mt-2 border mx-2">
              <SidebarTrigger className="-ml-1" />
              <div className="flex-1 h-full flex justify-center items-center">
                <ClientSearch
                  onClientSelect={selectedClient}
                />
              </div>
              <Separator orientation="vertical" className="mr-2 h-4" />
              <ModalLogout />
            </header>
            <Separator orientation="horizontal" className="mb-2" />
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ImageKitProvider>
  );
};
