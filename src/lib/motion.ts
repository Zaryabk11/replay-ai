import type { Transition, Variants } from "motion/react"

/*
 * Recap motion presets (spec section 05): quiet, short, purposeful.
 * Motion confirms a change; it does not decorate.
 *
 * | preset       | duration | easing                          | use                         |
 * | fade-up      | 240ms    | cubic-bezier(.2, .8, .2, 1)     | content enter, toasts, lists |
 * | scale-in     | 160ms    | cubic-bezier(.34, 1.3, .64, 1)  | dialogs, popovers, menus     |
 * | layout shift | 320ms    | cubic-bezier(.4, 0, .2, 1)      | panel resize, reflow, splits |
 *
 * The same values back the `animate-fade-up` / `animate-scale-in` CSS
 * utilities in globals.css (used by CSS-driven surfaces like the dialog).
 */

export const easing = {
  fadeUp: [0.2, 0.8, 0.2, 1],
  scaleIn: [0.34, 1.3, 0.64, 1],
  layout: [0.4, 0, 0.2, 1],
} as const

export const duration = {
  fadeUp: 0.24,
  scaleIn: 0.16,
  layout: 0.32,
} as const

export const fadeUpTransition: Transition = {
  duration: duration.fadeUp,
  ease: easing.fadeUp,
}

export const scaleInTransition: Transition = {
  duration: duration.scaleIn,
  ease: easing.scaleIn,
}

/** Pass to a `layout` / `layout="position"` element's `transition` prop. */
export const layoutShiftTransition: Transition = {
  duration: duration.layout,
  ease: easing.layout,
}

/** Spread onto a motion element: `<motion.div {...fadeUp} />`. */
export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 14 },
  transition: fadeUpTransition,
}

/** Spread onto a motion element: `<motion.div {...scaleIn} />`. */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.92 },
  transition: scaleInTransition,
}

/** Spread onto a motion element that should animate its own layout changes. */
export const layoutShift = {
  layout: true,
  transition: layoutShiftTransition,
}

/** Variant form, for parents orchestrating children (`variants` + `custom`). */
export const fadeUpVariants: Variants = {
  hidden: fadeUp.initial,
  visible: { ...fadeUp.animate, transition: fadeUpTransition },
}

export const scaleInVariants: Variants = {
  hidden: scaleIn.initial,
  visible: { ...scaleIn.animate, transition: scaleInTransition },
}
