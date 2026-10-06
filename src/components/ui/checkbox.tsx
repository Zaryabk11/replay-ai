"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/* Not shown in the file; built from the radio in the share dialog (16px,
   2px line-500 border) and the primary teal. */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "relative flex size-4 shrink-0 items-center justify-center rounded-xs border-2 border-line-500 bg-white text-white outline-none transition-colors focus-visible:shadow-focus aria-invalid:border-coral-500 aria-invalid:shadow-focus-error data-checked:border-deep-teal-500 data-checked:bg-deep-teal-500 data-indeterminate:border-deep-teal-500 data-indeterminate:bg-deep-teal-500 data-disabled:cursor-not-allowed data-disabled:border-line-300 data-disabled:bg-mist-paper data-disabled:data-checked:bg-line-300",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current [&>svg]:size-3"
      >
        <CheckIcon strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
