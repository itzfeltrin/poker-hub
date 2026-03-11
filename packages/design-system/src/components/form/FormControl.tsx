import type { ReactNode } from "react";
import { cn } from "../../utils";
import { Label } from "./Label";

interface FormControlProps {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

export function FormControl({
  label,
  htmlFor,
  className,
  children,
}: FormControlProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
