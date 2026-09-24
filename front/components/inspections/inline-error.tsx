import { AlertCircle } from "lucide-react";

interface InlineErrorProps {
  message: string;
  id?: string;
}

/**
 * Accessible inline error alert box with warning icon.
 * Uses status-danger tokens and role="alert" for screen readers.
 */
export function InlineError({ message, id }: InlineErrorProps) {
  return (
    <div
      id={id}
      role="alert"
      className="flex items-start gap-2 p-2.5 rounded-lg bg-status-danger/10 border border-status-danger/40 text-status-danger"
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
