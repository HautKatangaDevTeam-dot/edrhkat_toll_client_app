import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-2xl border border-input/80 bg-background/95 px-3.5 py-2 text-sm text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition placeholder:text-muted-foreground/90 hover:border-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-60 dark:bg-background/80",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
