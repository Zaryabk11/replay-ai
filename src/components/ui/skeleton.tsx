import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "animate-shimmer rounded-xs bg-[linear-gradient(90deg,var(--color-skeleton-base)_25%,var(--color-skeleton-shine)_50%,var(--color-skeleton-base)_75%)] bg-size-[400px_100%]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
