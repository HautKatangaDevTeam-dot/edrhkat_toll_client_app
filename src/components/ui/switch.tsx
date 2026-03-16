"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SwitchProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> & {
  onCheckedChange?: (checked: boolean) => void;
};

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, defaultChecked, disabled, onCheckedChange, ...props }, ref) => {
    return (
      <label
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
          checked ? "bg-primary" : "bg-input",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        <span
          className={cn(
            "block h-5 w-5 rounded-full bg-background shadow-lg transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </label>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
