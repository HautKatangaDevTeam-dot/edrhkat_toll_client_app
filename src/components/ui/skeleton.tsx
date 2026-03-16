"use client";

import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-muted/60",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite]",
        "before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)]",
        "dark:before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]",
        className
      )}
      {...props}
    />
  );
}
