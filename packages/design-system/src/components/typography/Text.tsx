import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "../../utils";

type TextProps<T extends ElementType = "p"> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

export function Text<T extends ElementType = "p">({
  as,
  className,
  children,
  ...props
}: TextProps<T>) {
  const Component = as || "p";
  return (
    <Component className={cn("font-body text-base", className)} {...props}>
      {children}
    </Component>
  );
}
