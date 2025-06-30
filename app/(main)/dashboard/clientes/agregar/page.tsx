import React from "react";
import { AddClientForm } from "../_components/add-client-form";
import { TitlePage } from "@/components/title-page";
import { UserPlus } from "lucide-react";

const CreateClientPage = () => {
  return (
    <div>
      <TitlePage icon={UserPlus} text="Agregar cliente" />
      <AddClientForm />
    </div>
  );
};

export default CreateClientPage;
