import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  id?: string;
  title: string;
  stepNumber?: number;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Stitch-style section card: rounded-xl, numbered title with icon,
 * border-separated header, consistent spacing.
 */
export function SectionCard({
  id,
  title,
  stepNumber,
  icon,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      id={id}
      className={cn(
        "bg-card border border-border rounded-xl p-4 space-y-3",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {icon && (
          <span className="text-primary shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <h3 className="font-headline text-xl font-bold text-foreground">
          {stepNumber != null ? `${stepNumber}. ` : ""}
          {title}
        </h3>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
