"use client";

import type { ChangeEvent } from "react";

import { cn } from "@/lib/cn";

export function Slider({
  id,
  min,
  max,
  step,
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(Number(event.target.value));
  }

  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={handleChange}
      className={cn("cv-slider w-full cursor-pointer disabled:cursor-not-allowed", className)}
      style={{ "--slider-progress": `${progress}%` } as React.CSSProperties}
    />
  );
}
