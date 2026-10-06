"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/*
 * Toasts from the file: default and success = ink with a green dot; error and
 * info = semantic tinted. Warning is not in the file; it reuses the warning
 * semantic tokens. Entrance animation is sonner's own.
 */
const dot = (className: string) => (
  <span aria-hidden className={`size-1.75 shrink-0 rounded-full ${className}`} />
)

const base =
  "flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.75 font-sans text-sm shadow-toast"

const Toaster = (props: ToasterProps) => (
  <Sonner
    position="bottom-right"
    icons={{
      success: dot("bg-success-dot"),
      error: dot("bg-error-text"),
      info: dot("bg-info-text"),
      warning: dot("bg-warning-text"),
      loading: dot("bg-blue-grey"),
    }}
    toastOptions={{
      unstyled: true,
      classNames: {
        toast: `${base} border-ink bg-ink text-white`,
        success: "border-ink bg-ink text-white",
        error: "border-error-border bg-error-bg text-error-text",
        info: "border-info-border bg-info-bg text-info-text",
        warning: "border-warning-border bg-warning-bg text-warning-text",
        title: "flex-1",
        description: "text-xs opacity-85",
        actionButton:
          "cursor-pointer rounded-sm text-xs font-semibold text-blue-grey outline-none hover:underline focus-visible:shadow-focus",
        cancelButton: "cursor-pointer text-xs text-blue-grey",
      },
    }}
    {...props}
  />
)

export { Toaster }
