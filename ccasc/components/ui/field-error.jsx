import { cn } from "@/lib/utils";

/**
 * Inline validation message rendered directly beneath the input it belongs to.
 * Renders nothing when there is no message.
 */
export function FieldError({ children, className }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <p role="alert" className={cn("text-xs text-destructive", className)}>
      {children}
    </p>
  );
}
