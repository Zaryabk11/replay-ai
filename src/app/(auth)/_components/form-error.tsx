import { TriangleAlertIcon } from "lucide-react";

/** Form-level failure, e.g. wrong password. Field errors render under the field. */
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-error-border bg-error-bg px-3 py-2.5 text-xs text-error-text"
    >
      <TriangleAlertIcon aria-hidden className="mt-px size-3.5 shrink-0" />
      {children}
    </p>
  );
}
