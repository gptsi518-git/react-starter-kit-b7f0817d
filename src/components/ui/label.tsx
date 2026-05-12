import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-text-3",
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = "Label";
