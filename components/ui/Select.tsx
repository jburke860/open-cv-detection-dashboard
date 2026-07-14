"use client";

import { ChevronDown } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Select({
  id,
  value,
  onChange,
  disabled,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value);
  }

  return (
    <div className={cn("relative inline-flex", className)}>
      <select
        id={id}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-label={ariaLabel}
        className="w-full appearance-none rounded-lg border border-line-strong bg-surface-1 py-2 pl-3 pr-8 text-sm text-ink transition hover:border-accent focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
        aria-hidden
      />
    </div>
  );
}
