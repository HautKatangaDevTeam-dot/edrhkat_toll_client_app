import type { ReactNode } from "react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ResourceSectionProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ResourceSection({
  title,
  description,
  actions,
  filters,
  children,
  className,
}: ResourceSectionProps) {
  return (
    <Card className={cn("border-border/70", className)}>
      <CardHeader className="gap-3 border-b border-border/70 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
        {filters}
      </CardHeader>
      {children}
    </Card>
  );
}
