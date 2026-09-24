"use client";

import { cn } from "@/lib/utils";

interface SegmentedSwitchOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedSwitchProps<T extends string> {
  options: SegmentedSwitchOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Required: accessible label for the group (ARIA). */
  ariaLabel: string;
}

/**
 * 2-option segmented switch (Stitch pattern).
 * Uses aria-pressed toggle buttons inside a labelled group — correct, simple
 * keyboard pattern (Tab to group, Tab through buttons, Space/Enter to toggle).
 */
export function SegmentedSwitch<T extends string>({
  options,
  value,
  onChange,
  disabled,
  ariaLabel,
}: SegmentedSwitchProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="grid gap-1 p-1 bg-background border border-border rounded-lg min-h-[48px]"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={cn(
              "min-h-[48px] flex items-center justify-center gap-2 rounded-md font-semibold text-sm transition-colors cursor-pointer",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
