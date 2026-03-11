import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "../../utils";

const colClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

const gapClasses = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
} as const;

type GridProps<T extends ElementType = "div"> = {
  as?: T;
  cols?: keyof typeof colClasses;
  gap?: keyof typeof gapClasses;
} & ComponentPropsWithoutRef<T>;

export function Grid<T extends ElementType = "div">({
  as,
  cols = 2,
  gap = "md",
  className,
  children,
  ...props
}: GridProps<T>) {
  const Component = as || "div";
  return (
    <Component
      className={cn("grid", colClasses[cols], gapClasses[gap], className)}
      {...props}
    >
      {children}
    </Component>
  );
}
