"use client"

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const MainLogo = ({
  goRoot,
  className,
  height = 18,
  width = 100,
}: {
  goRoot?: boolean;
  height?: number;
  width?: number;
  className?: string;
}) => {
  const pathname = usePathname();

  const isDashboard = useMemo(() => pathname.includes("dashboard"), [pathname]);

  const router = useRouter();

  const navigate = () => {
    if (!goRoot) return;

    router.push(!isDashboard ? "/" : "/dashboard");
  };

  return (
    <Image
      className={cn("inline", goRoot && "cursor-pointer", className)}
      onClick={navigate}
      src="/images/inversiones-dj.png"
      alt="logo de dj inversiones"
      height={height}
      width={width}
      style={{
        width: "auto",
        height: "auto",
      }}
    />
  );
};
