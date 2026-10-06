import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
 * One button system (Recap spec): primary, secondary (always outlined),
 * ghost, destructive, plus disabled and loading states.
 * Hover/active for secondary, ghost and destructive are not specified in the
 * file; they reuse existing tokens (see /design notes).
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:shadow-focus active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-line-300 disabled:bg-mist-paper disabled:text-blue-grey data-loading:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-deep-teal-500 bg-deep-teal-500 text-white hover:border-deep-teal-600 hover:bg-deep-teal-600 active:border-deep-teal-700 active:bg-deep-teal-700",
        secondary:
          "border-blue-grey bg-white text-deep-teal-500 hover:bg-mist-paper active:bg-deep-teal-100",
        ghost:
          "border-transparent bg-transparent text-deep-teal-500 hover:bg-deep-teal-50 active:bg-deep-teal-100",
        destructive:
          "border-coral-500 bg-coral-500 text-white hover:border-error-text hover:bg-error-text active:border-error-text active:bg-error-text",
      },
      size: {
        sm: "h-7 rounded-md px-3 text-xs",
        default: "h-9 rounded-lg px-4 text-ui",
        lg: "h-11 rounded-xl px-5.5 text-base",
        icon: "size-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-3.25 animate-spin-fast rounded-full border-2 border-white/40 border-t-white",
        className
      )}
    />
  )
}

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  onClick,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & { loading?: boolean }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading ? "" : undefined}
      aria-busy={loading || undefined}
      // Loading keeps the primary look (spec) but ignores clicks.
      onClick={loading ? undefined : onClick}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && (
        <Spinner
          className={
            variant === "secondary" || variant === "ghost"
              ? "border-deep-teal-200 border-t-deep-teal-500"
              : undefined
          }
        />
      )}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
