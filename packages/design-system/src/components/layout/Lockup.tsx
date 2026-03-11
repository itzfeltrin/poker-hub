import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "../../utils";

type LockupRootProps<T extends ElementType = "div"> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

function LockupRoot<T extends ElementType = "div">({
  as,
  className,
  children,
  ...props
}: LockupRootProps<T>) {
  const Component = as || "div";
  return (
    <Component className={cn(className)} {...props}>
      {children}
    </Component>
  );
}

type LockupTitleProps<T extends ElementType = "h1"> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

function LockupTitle<T extends ElementType = "h1">({
  as,
  className,
  children,
  ...props
}: LockupTitleProps<T>) {
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

type LockupSubtitleProps<T extends ElementType = "p"> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

function LockupSubtitle<T extends ElementType = "p">({
  as,
  className,
  children,
  ...props
}: LockupSubtitleProps<T>) {
  const Component = as || "p";
  return (
    <Component
      className={cn("font-body text-muted-foreground mt-1", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export const Lockup = Object.assign(LockupRoot, {
  Title: LockupTitle,
  Subtitle: LockupSubtitle,
});
