"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "@/lib/utils"

/*
 * Derived from the player bar in the file: 3px track, teal fill, 2px radius.
 * `inverse` matches the dark player (translucent white track, harbor-blue fill).
 */
function Progress({
  className,
  children,
  value,
  tone = "default",
  ...props
}: ProgressPrimitive.Root.Props & { tone?: "default" | "inverse" }) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap items-center gap-3", className)}
      {...props}
    >
      {children}
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className={cn(
          "relative flex h-[3px] w-full items-center overflow-hidden rounded-[2px]",
          tone === "default" ? "bg-line-300" : "bg-white/20"
        )}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(
            "h-full rounded-[2px] transition-[width] duration-320 ease-layout",
            tone === "default" ? "bg-deep-teal-500" : "bg-harbor-blue-500"
          )}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      data-slot="progress-label"
      className={cn("text-xs font-medium text-ink", className)}
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      className={cn("ml-auto font-mono text-[11px] text-slate tabular-nums", className)}
      {...props}
    />
  )
}

export { Progress, ProgressLabel, ProgressValue }
