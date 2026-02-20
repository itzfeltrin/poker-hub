import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 card-hover", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p
        className={cn(
          "text-2xl font-display font-bold",
          trend === "up" && "text-success",
          trend === "down" && "text-loss",
          !trend && "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}
