"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ImageIcon,
  ImageUp,
  Loader2,
  Pencil,
  PlusCircle,
  Search,
} from "lucide-react";
import Image from "next/image";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Document } from "@prisma/client";
import { IKUpload } from "imagekitio-next";
import {
  IKUploadResponse,
  UploadError,
} from "imagekitio-next/dist/types/components/IKUpload/props";

interface Client {
  id: string;
  fullName: string;
  identification: number;
  cellphone?: string | null;
  address?: string | null;
  documents: Document[];
  monthlyIncome: number | null;
}

interface ClientWithDocuments extends Client {
  documents: Document[];
}

interface ImageFormProps {
  initialData: ClientWithDocuments;
}

type FormData = {
  fileUrl: string;
  type: "ID_CARD";
  clientId: string;
};

export const AddDocumentIdcard = ({ initialData }: ImageFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const toggleEdit = () => setIsEditing((current) => !current);
  const uploadRef = useRef<HTMLInputElement>(null);

  const firstDocument = initialData?.documents?.find(
    (doc) => doc.type === "ID_CARD"
  );
  const hasDocument = !!firstDocument?.fileUrl;

  const onError = (err: UploadError) => {
    console.error("Upload error:", err);
    setIsUploading(false);
    toast.error("Error al subir el documento");
  };

  const onSuccess = (response: IKUploadResponse) => {
    const fileUrl = response.url;

    onSubmit({
      fileUrl,
      type: "ID_CARD",
      clientId: initialData.id,
    }).then(() => {
      setIsUploading(false);
    });
  };

  const onUploadStart = () => {
    setIsUploading(true);
  };

  const onSubmit = async (values: FormData) => {
    try {
      await axios.post(`/api/documents/id-card`, values);
      toast.success("Documento actualizado");
      toggleEdit();
      router.refresh();
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Error al actualizar");
      throw error;
    }
  };

  const handleManualUploadClick = () => {
    if (uploadRef.current) {
      uploadRef.current.click();
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4">
      <div className="font-medium flex items-center justify-between ">
        <span className="flex text-primary font-bold gap-2">
          {" "}
          <ImageUp /> Documento de identidad
        </span>
        <Button onClick={toggleEdit} variant="ghost" disabled={isUploading}>
          {isUploading ? (
            "Subiendo..."
          ) : isEditing ? (
            "Cancelar"
          ) : (
            <>
              {hasDocument ? (
                <Pencil className="h-4 w-4 mr-2" />
              ) : (
                <PlusCircle className="h-4 w-4 mr-2" />
              )}
              {hasDocument ? "Actualizar documento" : "Agregar documento"}
            </>
          )}
        </Button>
      </div>

      {!isEditing && (
        <div className="relative aspect-video mt-2">
          {hasDocument ? (
            <Image
              alt="Documento subido"
              fill
              className="object-cover rounded-md"
              src={firstDocument.fileUrl}
            />
          ) : (
            <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md">
              <ImageIcon className="w-10 h-10 text-slate-500" />
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <div className="flex items-center justify-center w-full h-full">
          {isUploading ? (
            <div className="w-full h-full flex flex-col justify-center items-center  text-primary ">
              Subiendo
              <Loader2 className="w-10  h-10 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <Button
                onClick={handleManualUploadClick}
                className="w-fit justify-self-center"
              >
                <Search />
                Buscar archivo
              </Button>
              <IKUpload
                style={{ display: "none" }}
                ref={uploadRef}
                fileName={`${initialData.id}-${Date.now()}`}
                folder="/identification/"
                useUniqueFileName={true}
                tags={["id_card", `client_${initialData.id}`]}
                validateFile={(file) => {
                  const validTypes = [
                    "image/png",
                    "image/jpeg",
                    "application/pdf",
                  ];
                  const maxSize = 1 * 1024 * 1024; // 1MB

                  if (!validTypes.includes(file.type)) {
                    toast.error("Formato de archivo no válido");
                    return false;
                  }

                  if (file.size > maxSize) {
                    toast.error("El archivo es demasiado grande (máx. 1MB)");
                    return false;
                  }

                  return true;
                }}
                onError={onError}
                onSuccess={onSuccess}
                onUploadStart={onUploadStart}
              />

              <div className="text-xs text-muted-foreground mt-4">
                Formatos aceptados: PNG, JPG, PDF (max 1MB)
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
