import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-100 text-emerald-700",
        warning: "border-transparent bg-amber-100 text-amber-700",
        info: "border-transparent bg-blue-100 text-blue-700",
        purple: "border-transparent bg-violet-100 text-violet-700",
        pink: "border-transparent bg-pink-100 text-pink-700",
        jatim: "border-transparent bg-blue-100 text-blue-700",
        jateng: "border-transparent bg-emerald-100 text-emerald-700",
        jabar: "border-transparent bg-amber-100 text-amber-700",
        "jawa timur": "border-transparent bg-blue-100 text-blue-700",
        "jawa tengah": "border-transparent bg-emerald-100 text-emerald-700",
        "jawa barat": "border-transparent bg-amber-100 text-amber-700",
        sumatra: "border-transparent bg-orange-100 text-orange-700",
        india: "border-transparent bg-violet-100 text-violet-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
