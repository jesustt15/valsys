"use client";

import { cn } from "@/lib/utils";

interface PlateInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  id?: string;
  /** aria-describedby forwarded to the input (e.g. to associate an InlineError). */
  describedBy?: string;
}

/**
 * Plate input styled as a pill (Stitch pattern).
 * Mono uppercase tracking; .toUpperCase() onChange; maxLength 7.
 * No country prefix — correct for the Venezuelan context (V/E/J doc types).
 */
export function PlateInput({
  value,
  onChange,
  disabled,
  hasError,
  id,
  describedBy,
}: PlateInputProps) {
  return (
    <div
      className={cn(
        "relative flex items-center bg-background border-2 rounded-full px-4 h-[52px] transition-colors",
        hasError
          ? "border-status-danger"
          : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25",
      )}
    >
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        disabled={disabled}
        maxLength={7}
        placeholder="ABC123"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        className="w-full bg-transparent border-none text-center font-mono text-[15px] font-bold uppercase tracking-[0.12em] text-foreground focus:ring-0 focus:outline-none px-2 disabled:opacity-50"
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
      />
    </div>
  );
}
