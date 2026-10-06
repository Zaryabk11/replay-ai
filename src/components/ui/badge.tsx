import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
 * Status badges (success/warning/error/info/neutral/default) and the single
 * citation primitive: the [04:12] timestamp chip (citation, citation-active,
 * citation-verified). `label` is the mono uppercase eyebrow pill.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-sm border whitespace-nowrap transition-colors outline-none focus-visible:shadow-focus",
  {
    variants: {
      variant: {
        default: "border-deep-teal-200 bg-deep-teal-100 text-deep-teal-500",
        success: "border-success-border bg-success-bg text-success-text",
        warning: "border-warning-border bg-warning-bg text-warning-text",
        error: "border-error-border bg-error-bg text-error-text",
        info: "border-info-border bg-info-bg text-info-text",
        neutral: "border-line-300 bg-mist-paper text-slate-400",
        citation:
          "border-deep-teal-200 bg-deep-teal-100 font-mono font-medium text-deep-teal-500",
        "citation-active":
          "border-deep-teal-500 bg-deep-teal-500 font-mono font-medium text-white",
        "citation-verified":
          "border-success-border bg-success-bg font-mono font-medium text-success-text",
        label:
          "rounded-full border-deep-teal-200 bg-deep-teal-100 font-mono text-deep-teal-500 uppercase tracking-eyebrow",
      },
      size: {
        default: "px-2 py-0.5 text-[11.5px]",
        sm: "px-1.5 py-px text-2xs",
      },
    },
    compoundVariants: [
      // Citation chips are larger by default (12px mono, 3px/8px).
      { variant: ["citation", "citation-active", "citation-verified"], size: "default", class: "px-2 py-[3px] text-xs" },
      { variant: ["citation", "citation-active", "citation-verified"], size: "sm", class: "text-[11px]" },
      { variant: "label", class: "px-3 py-1.25 text-[11px]" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ variant, size }), className) },
      props
    ),
    render,
    state: { slot: "badge", variant },
  })
}

export { Badge, badgeVariants }
