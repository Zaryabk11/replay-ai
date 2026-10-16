"use client";

import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { fadeUp } from "@/lib/motion";
import { enableSharing, revokeSharing } from "../actions";

/**
 * The "Shared" badge and the share dialog live in one component because they
 * share the same `enabled` state — the badge is the owner's reminder that a
 * link is live, so it has to track the dialog's toggle exactly, not a stale
 * prop from the server render.
 */
export function ShareDialog({
  meetingId,
  initialEnabled,
  initialUrl,
}: {
  meetingId: string;
  initialEnabled: boolean;
  initialUrl: string | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [url, setUrl] = useState(initialUrl);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    if (!next) {
      // Turning off breaks any link already handed out, so confirm first
      // rather than flipping it straight to disabled.
      setConfirmingRevoke(true);
      return;
    }
    startTransition(async () => {
      const result = await enableSharing(meetingId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setEnabled(true);
      setUrl(result.data.url);
      toast.success("Sharing is on");
    });
  }

  function confirmRevoke() {
    startTransition(async () => {
      const result = await revokeSharing(meetingId);
      setConfirmingRevoke(false);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setEnabled(false);
      setUrl(null);
      toast.success("Link revoked");
    });
  }

  async function copy() {
    if (!url) return;
    const absolute = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't reach the clipboard. Check the browser's permissions.");
    }
  }

  return (
    <>
      <AnimatePresence>
        {enabled && (
          <motion.span key="shared-badge" {...fadeUp}>
            <Badge variant="info">Shared</Badge>
          </motion.span>
        )}
      </AnimatePresence>

      <Dialog onOpenChange={(open) => { if (!open) setConfirmingRevoke(false); }}>
        <DialogTrigger render={<Button variant="secondary" size="sm" />}>
          <Share2Icon /> Share
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share meeting</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <label className="flex items-center justify-between gap-3 text-sm text-ink">
              <span>
                <span className="block font-medium">Anyone with the link</span>
                <span className="block text-xs text-slate-400">Read-only, signed out</span>
              </span>
              <Switch checked={enabled} onCheckedChange={handleToggle} disabled={pending} />
            </label>

            <AnimatePresence mode="wait">
              {confirmingRevoke ? (
                <motion.div
                  key="confirm"
                  {...fadeUp}
                  className="rounded-lg border border-warning-border bg-warning-bg px-3.5 py-3 text-xs text-warning-text"
                >
                  <p className="mb-2.5">
                    Revoke this link? Anyone who has it will lose access right away.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingRevoke(false)} disabled={pending}>
                      Keep sharing
                    </Button>
                    <Button size="sm" variant="destructive" onClick={confirmRevoke} loading={pending}>
                      Revoke link
                    </Button>
                  </div>
                </motion.div>
              ) : (
                enabled &&
                url && (
                  <motion.div key="link" {...fadeUp} className="flex gap-2">
                    <Input readOnly value={url} />
                    <Button onClick={copy} disabled={pending}>
                      {copied ? <CheckIcon /> : <CopyIcon />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Done</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
