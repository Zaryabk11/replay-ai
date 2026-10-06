"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportMarkdown, type ExportInput } from "@/lib/export-markdown";

/**
 * Copy the summary and accepted action items as Markdown.
 *
 * Built from the live data rather than a server round trip, so what lands on
 * the clipboard matches what is on screen — including a decision taken a
 * second ago that has not been refetched yet.
 */
export function ExportButton({ input }: { input: ExportInput }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const markdown = exportMarkdown(input);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast.success("Summary copied as Markdown");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is refused without a user gesture, and over http://
      // on anything but localhost.
      toast.error("Couldn't reach the clipboard. Check the browser's permissions.");
    }
  }

  return (
    <Button size="sm" onClick={copy}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copied" : "Export"}
    </Button>
  );
}
