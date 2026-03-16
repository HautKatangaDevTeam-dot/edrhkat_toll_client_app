import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  toneClassName?: string;
};

export function StatCard({
  label,
  value,
  icon,
  toneClassName,
}: StatCardProps) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-center gap-3 p-3.5">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary",
            toneClassName
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
