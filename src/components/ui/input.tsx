import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

/*
 * Text input. States: default, focus, error (aria-invalid), success
 * (data-valid), disabled. Disabled mirrors the button's disabled look; the
 * file does not show a disabled input.
 */
function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input"> & { "data-valid"?: boolean }) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-line-500 bg-white px-2.75 text-ui text-ink outline-none transition-colors placeholder:text-slate-400 focus-visible:border-deep-teal-500 focus-visible:shadow-focus-input disabled:cursor-not-allowed disabled:border-line-300 disabled:bg-mist-paper disabled:text-blue-grey aria-invalid:border-coral-500 aria-invalid:shadow-focus-error data-[valid=true]:border-success-text data-[valid=true]:shadow-focus-success read-only:font-mono read-only:text-xs read-only:text-slate",
        className
      )}
      {...props}
    />
  )
}

function FieldMessage({
  tone = "error",
  className,
  ...props
}: React.ComponentProps<"p"> & { tone?: "error" | "success" }) {
  return (
    <p
      data-slot="field-message"
      className={cn(
        "mt-1.5 flex items-center gap-1.5 text-xs",
        tone === "error" ? "text-error-text" : "text-success-text",
        className
      )}
      {...props}
    />
  )
}

export { Input, FieldMessage }
