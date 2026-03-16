import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AppModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  eyebrow?: string;
  trigger?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  bodyClassName?: string;
};

const sizeClassNames: Record<NonNullable<AppModalProps["size"]>, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  trigger,
  children,
  footer,
  size = "md",
  className,
  bodyClassName,
}: AppModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={cn(
          "overflow-hidden border-border/80 p-0 shadow-2xl shadow-black/10",
          sizeClassNames[size],
          className
        )}
      >
        <DialogHeader className="space-y-2 border-b border-border/70 bg-muted/30 px-6 py-5 pr-14">
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className={cn("px-6 py-5", bodyClassName)}>{children}</div>
        {footer ? (
          <DialogFooter className="border-t border-border/70 bg-muted/20 px-6 py-4">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
