import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "../../utils";

type TitleProps<T extends ElementType = "h1"> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

export function Title<T extends ElementType = "h1">({
  as,
  className,
  children,
  ...props
}: TitleProps<T>) {
  const Component = as || "h1";
  return (
    <Component
      className={cn("font-display text-3xl font-bold tracking-tight", className)}
      {...props}
    >
      {children}
    </Component>
  );
}
