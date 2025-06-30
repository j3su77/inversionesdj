import { cn } from "@/lib/utils";
import { VariantProps, cva } from "class-variance-authority";
import { AlertTriangle, Ban, CheckCircleIcon } from "lucide-react";

const bannerVariants = cva(
  "border text-center p-4 text-sm flex items-center w-full rounded-sm",
  {
    variants: {
      variant: {
        warning: "bg-yellow-200/80 border-yellow-400 text-yellow-600",
        success: "bg-emerald-300/90 border-emerald-800 text-emerald-800",
        destructive: "bg-red-400/80 border-red-700 text-red-700",
      },
    },
    defaultVariants: {
      variant: "warning",
    },
  }
);

interface BannerProps extends VariantProps<typeof bannerVariants> {
  label: string;
}

const iconMap = {
  warning: AlertTriangle,
  success: CheckCircleIcon,
  destructive: Ban,
};

export const Banner = ({ label, variant }: BannerProps) => {
  const Icon = iconMap[variant || "warning"];
  return (
    <div className={cn(bannerVariants({ variant }))}>
      <Icon className="w-4 h-4 mr-2 " />
      <span className="text-lg font-medium "> {label}</span>
    </div>
  );
};
