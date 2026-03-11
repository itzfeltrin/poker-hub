import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "../../utils";

type SubtitleProps<T extends ElementType = "p"> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

export function Subtitle<T extends ElementType = "p">({
  as,
  className,
  children,
  ...props
}: SubtitleProps<T>) {
  const Component = as || "p";
  return (
    <Component
      className={cn("font-body text-muted-foreground", className)}
      {...props}
    >
      {children}
    </Component>
  );
}
