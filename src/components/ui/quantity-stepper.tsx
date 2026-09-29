"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  size = "lg",
  label = "Cantidad",
  className,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  size?: "md" | "lg";
  label?: string;
  className?: string;
}) {
  const btn = cn(
    "flex items-center justify-center transition-colors hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
    size === "lg" ? "h-full w-12" : "h-full w-9",
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-stretch border border-ink/25",
        size === "lg" ? "h-14" : "h-10",
        className,
      )}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Disminuir ${label.toLowerCase()}`}
      >
        <Minus size={size === "lg" ? 15 : 13} strokeWidth={1.25} />
      </button>
      <output
        aria-live="polite"
        className={cn(
          "flex items-center justify-center tabular-nums",
          size === "lg" ? "w-10 text-base" : "w-8 text-sm",
        )}
      >
        {value}
      </output>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Aumentar ${label.toLowerCase()}`}
      >
        <Plus size={size === "lg" ? 15 : 13} strokeWidth={1.25} />
      </button>
    </div>
  );
}
