import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export const TitlePage = ({
  text,
  children,
  icon: Icon,
}: {
  text: ReactNode;
  icon?: LucideIcon;
  children?: ReactNode;
}) => {
  return (
    <div className="relative w-full flex flex-col md:flex-row justify-between items-center min-h-[70px] text-primary overflow-hidden mb-2">
      <div className="w-full m-2 mx-3 flex flex-col md:flex-row md:items-center md:justify-between items-start gap-1">
        <div className="flex gap-3 items-center">
          {Icon && <Icon className="w-12 h-12 text-primary" />}
          <h2 className="text-3xl font-bold w-full">{text}</h2>
        </div>
        {!!children && <div className="flex w-fit justify-end">{children}</div>}
      </div>
      <div className="absolute bottom-0 left-0 right-0 w-full bg-secondary h-[1px]" />
    </div>
  );
};
