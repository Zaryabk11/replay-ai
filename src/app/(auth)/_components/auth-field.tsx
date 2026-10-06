import { FieldMessage, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Label + input + error message. The sign-in screen in the design file uses
 * the taller 14px control, so the size override lives here rather than being
 * repeated on every field.
 */
export function AuthField({
  id,
  label,
  error,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { id: string; label: string; error?: string }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn("h-11 px-3 text-base", className)}
        {...props}
      />
      {error && <FieldMessage id={`${id}-error`}>{error}</FieldMessage>}
    </div>
  );
}
