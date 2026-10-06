"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

/* 36x20 pill, 16px white thumb, 2px inset, teal when on (share dialog).
   The off colour is not in the file; blue-grey is used. */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-blue-grey outline-none transition-colors focus-visible:shadow-focus data-checked:bg-deep-teal-500 data-disabled:cursor-not-allowed data-disabled:bg-line-300",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-white transition-transform duration-150 data-checked:translate-x-4.5"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
