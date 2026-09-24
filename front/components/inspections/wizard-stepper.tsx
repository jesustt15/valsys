"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  /** Stable ID — used as React key and for programmatic matching. */
  id: string;
  /** Display label (may change without breaking logic). */
  label: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (idx: number) => void;
}

/**
 * Horizontal stepper showing wizard progress.
 * States: completed (check + primary fill), active (numbered + ring), pending (numbered + muted).
 */
export function WizardStepper({
  steps,
  currentStep,
  onStepClick,
}: WizardStepperProps) {
  return (
    <nav aria-label="Progreso del formulario" className="px-4 pb-3 pt-1">
      <ol className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const isPending = idx > currentStep;

          return (
            <li
              key={step.id}
              className="flex items-center flex-1 last:flex-none"
            >
              <button
                type="button"
                onClick={() => onStepClick?.(idx)}
                disabled={isPending}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-0",
                  (isCompleted || isActive) && "cursor-pointer",
                  isPending && "cursor-default",
                )}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Paso ${idx + 1}: ${step.label}${isCompleted ? " (completado)" : isActive ? " (actual)" : ""}`}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isActive &&
                      "border-2 border-primary text-primary ring-2 ring-primary/20 bg-background",
                    isPending &&
                      "border border-border text-muted-foreground bg-background",
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold truncate max-w-[64px] text-center leading-tight",
                    isActive && "text-primary",
                    isCompleted && "text-primary/80",
                    isPending && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </button>

              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 rounded-full transition-colors min-w-[12px]",
                    idx < currentStep ? "bg-primary" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
