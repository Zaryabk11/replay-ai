"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { fadeUpTransition } from "@/lib/motion";

/**
 * Fade-up between routes, using the shared preset. Keyed on the pathname so
 * each route mounts its own subtree.
 *
 * `mode="wait"` would hold the old page for a full 240ms before the new one
 * starts, which reads as lag on a fast navigation, so the two cross over.
 * MotionConfig in src/components/providers.tsx disables this under
 * prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={fadeUpTransition}
        className="flex min-h-full flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
