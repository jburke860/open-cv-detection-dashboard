"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  size = "md",
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-1",
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          type="button"
          aria-selected={value === item.value}
          disabled={item.disabled}
          onClick={() => onChange(item.value)}
          className={cn(
            "rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
            size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm",
            value === item.value
              ? "bg-surface-1 text-accent shadow-sm border border-line"
              : "border border-transparent text-ink-muted hover:text-ink"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
