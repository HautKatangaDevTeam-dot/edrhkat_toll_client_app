import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FilterBarProps = {
  children: ReactNode;
  className?: string;
};

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3 md:grid-cols-[minmax(0,1.2fr)_0.8fr_0.8fr] md:p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
