"use client"
import { SimpleModal } from "@/components/simple-modal";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export const ModalLogout = () => {
  const onAccept = async () => {
    await signOut({ callbackUrl: "/" });
  };
  return (
    <SimpleModal
      title="¿Estás seguro de cerrar sesión?"
      textBtn={<LogOut className="h-4 w-4" />}
      btnClass="px-2 py-2 rounded hover:bg-red-600"
      onAccept={() => onAccept()}
      large={false}
    >
      Al cerrar sesión, deberás volver a iniciar sesión para acceder a tu
      cuenta. ¿Quieres continuar?
    </SimpleModal>
  );
};
