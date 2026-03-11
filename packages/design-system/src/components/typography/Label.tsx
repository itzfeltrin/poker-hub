import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "../../utils";

type LabelProps<T extends ElementType = "label"> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

export function Label<T extends ElementType = "label">({
  as,
  className,
  children,
  ...props
}: LabelProps<T>) {
  const Component = as || "label";
  return (
    <Component
      className={cn("font-body text-sm font-medium", className)}
      {...props}
    >
      {children}
    </Component>
  );
}
