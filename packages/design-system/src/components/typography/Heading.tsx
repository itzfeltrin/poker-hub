import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "../../utils";

type HeadingProps<T extends ElementType = "h2"> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

export function Heading<T extends ElementType = "h2">({
  as,
  className,
  children,
  ...props
}: HeadingProps<T>) {
  const Component = as || "h2";
  return (
    <Component
      className={cn("font-display text-lg font-semibold", className)}
      {...props}
    >
      {children}
    </Component>
  );
}
