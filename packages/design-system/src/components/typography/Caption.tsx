import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "../../utils";

type CaptionProps<T extends ElementType = "span"> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

export function Caption<T extends ElementType = "span">({
  as,
  className,
  children,
  ...props
}: CaptionProps<T>) {
  const Component = as || "span";
  return (
    <Component
      className={cn("font-body text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </Component>
  );
}
