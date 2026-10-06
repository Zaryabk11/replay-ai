"use client"

import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { fadeUp, layoutShiftTransition, scaleIn } from "@/lib/motion"

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        onClick={() =>
          toast.success("Summary saved", { action: { label: "Undo", onClick: () => {} } })
        }
      >
        Success
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.error("Upload failed — network error", {
            action: { label: "Retry", onClick: () => {} },
          })
        }
      >
        Error
      </Button>
      <Button variant="secondary" onClick={() => toast.info("Transcript is processing…")}>
        Info
      </Button>
      <Button variant="secondary" onClick={() => toast.warning("Low-confidence section")}>
        Warning
      </Button>
    </div>
  )
}

export function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="secondary" />}>Open share dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share meeting</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="flex gap-2">
            <Input readOnly value="recap.app/m/8fd1-product-sync" />
            <Button>Copy</Button>
          </div>
          <label className="flex items-center justify-between text-sm text-ink">
            <span>Share as a clip (04:12–05:40)</span>
            <Switch defaultChecked />
          </label>
          <div>
            <Label htmlFor="dialog-email">Invite by email</Label>
            <Input id="dialog-email" placeholder="you@company.com" />
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Replays on a 3s loop, like the spec's demo cards. */
function useLoop(ms = 3000) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms)
    return () => clearInterval(id)
  }, [ms])
  return tick
}

function Stage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-23 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line-400 bg-surface-raised ${className}`}
    >
      {children}
    </div>
  )
}

export function MotionDemo() {
  const tick = useLoop()
  const wide = tick % 2 === 1

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
      <MotionCard name="Fade-up" ms="240ms" ease="cubic-bezier(.2,.8,.2,1)" use="Content enter · toasts · lists">
        <Stage>
          <motion.div
            key={tick}
            {...fadeUp}
            className="rounded-lg bg-deep-teal-500 px-4 py-2.25 text-sm text-white"
          >
            New summary
          </motion.div>
        </Stage>
      </MotionCard>

      <MotionCard name="Scale-in" ms="160ms" ease="cubic-bezier(.34,1.3,.64,1)" use="Dialogs · popovers · menus">
        <Stage>
          <motion.div
            key={tick}
            {...scaleIn}
            className="rounded-xl border border-deep-teal-200 bg-white px-4 py-3 text-sm shadow-popover"
          >
            Share dialog
          </motion.div>
        </Stage>
      </MotionCard>

      <MotionCard name="Layout shift" ms="320ms" ease="cubic-bezier(.4,0,.2,1)" use="Panel resize · reflow · splits">
        <Stage className="justify-start gap-1.5 p-3">
          <motion.div
            layout
            transition={layoutShiftTransition}
            className="h-full rounded-md bg-deep-teal-500"
            style={{ flexBasis: wide ? "66%" : "34%" }}
          />
          <motion.div layout transition={layoutShiftTransition} className="h-full flex-1 rounded-md bg-line-300" />
        </Stage>
      </MotionCard>
    </div>
  )
}

function MotionCard({
  name,
  ms,
  ease,
  use,
  children,
}: {
  name: string
  ms: string
  ease: string
  use: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-line-300 bg-white p-5.5">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-base font-semibold">{name}</span>
        <span className="font-mono text-[11px] text-deep-teal-500">{ms}</span>
      </div>
      {children}
      <div className="mt-3 font-mono text-[11px] leading-relaxed text-slate-400">
        {ease}
        <br />
        <span className="text-slate">{use}</span>
      </div>
    </div>
  )
}
