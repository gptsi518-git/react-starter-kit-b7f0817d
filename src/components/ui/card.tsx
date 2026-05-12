import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-lg border bg-paper px-4 py-4 shadow-card",
  {
    variants: {
      variant: {
        default: "border-border bg-paper",
        flat:    "border-border-soft bg-background-soft shadow-none",
        teal:    "border-teal-bd bg-teal-bg text-teal-ink",
        amber:   "border-amber-bd bg-amber-bg text-amber-ink",
        purple:  "border-purple-bd bg-purple-bg text-purple-ink",
        blue:    "border-blue-bd bg-blue-bg text-blue-ink",
        rose:    "border-rose-bd bg-rose-bg text-rose-ink",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, className }))} {...props} />
  ),
);
Card.displayName = "Card";

export const SectionTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h3 className={cn("mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-text-3", className)}>
    {children}
  </h3>
);
