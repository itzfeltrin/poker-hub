import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "../../utils";

const sizeClasses = {
  sm: "max-w-xl",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  full: "",
} as const;

type ContainerProps<T extends ElementType = "div"> = {
  as?: T;
  size?: keyof typeof sizeClasses;
} & ComponentPropsWithoutRef<T>;

export function Container<T extends ElementType = "div">({
  as,
  size = "md",
  className,
  children,
  ...props
}: ContainerProps<T>) {
  const Component = as || "div";
  return (
    <Component
      className={cn(
        "space-y-8 pb-20 md:pb-0",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
