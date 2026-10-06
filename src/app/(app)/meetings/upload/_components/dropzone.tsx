"use client";

import { upload } from "@vercel/blob/client";
import { ArrowRightIcon, PlayIcon, UploadIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import {
  FILE_INPUT_ACCEPT,
  checkFile,
  formatBytes,
  resolveContentType,
  type UploadBudget,
} from "@/lib/upload-limits";
import { cn } from "@/lib/utils";
import { createMeetingFromUpload } from "../../actions";

type Phase = "idle" | "uploading" | "creating";

/** Strip the extension — "Q4_Roadmap_Review.mp4" is a better default title than nothing. */
function titleFrom(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return (base || "Untitled recording").slice(0, 120);
}

export function Dropzone({ budget }: { budget: UploadBudget }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  const busy = phase !== "idle";

  function choose(candidate: File | undefined) {
    if (!candidate) return;
    setError(null);

    const check = checkFile(
      { name: candidate.name, size: candidate.size, type: candidate.type },
      budget
    );
    if (!check.ok) {
      setFile(null);
      setError(check.message);
      return;
    }
    setFile(candidate);
  }

  async function start() {
    if (!file || busy) return;
    setError(null);
    setPhase("uploading");
    setProgress(0);

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: resolveContentType({ name: file.name, size: file.size, type: file.type }),
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      });

      setPhase("creating");
      const result = await createMeetingFromUpload({
        blobUrl: blob.url,
        pathname: blob.pathname,
        title: titleFrom(file.name),
      });

      if (!result.ok) {
        setError(result.message);
        setPhase("idle");
        return;
      }

      router.replace(`/meetings/${result.data.id}/processing`);
    } catch (cause) {
      // The token route refuses over-budget uploads, so this is where a rate
      // limit or a signed-out session surfaces.
      setError(cause instanceof Error ? cause.message : "That upload failed. Try again.");
      setPhase("idle");
    }
  }

  return (
    <div className="flex w-full max-w-140 flex-col">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) choose(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex flex-col items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-deep-teal-500 bg-deep-teal-100" : "border-blue-grey bg-deep-teal-50",
          busy && "opacity-60"
        )}
      >
        <span
          aria-hidden
          className="flex size-10.5 items-center justify-center rounded-2xl bg-deep-teal-100 text-deep-teal-500"
        >
          <UploadIcon className="size-5" />
        </span>
        <p className="font-serif text-xl text-ink">
          {dragging ? "Drop to upload" : "Drop your recording here"}
        </p>
        <p className="font-mono text-[11px] tracking-caps text-slate-400 uppercase">
          Supports MP3 · M4A · WAV · MP4 · up to {formatBytes(budget.maxBytes)}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-1"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          Choose a file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={FILE_INPUT_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            choose(e.target.files?.[0]);
            // Let the same file be re-picked after an error.
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-error-border bg-error-bg px-3 py-2.5 text-xs text-error-text"
        >
          {error}
        </p>
      )}

      {file && (
        <div className="mt-4 flex items-center gap-3.5 rounded-2xl border border-line-300 p-3.5">
          <span
            aria-hidden
            className="flex h-11 w-16 shrink-0 items-center justify-center rounded-md bg-ink text-white"
          >
            <PlayIcon className="size-3.5 fill-current" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-medium text-ink">{file.name}</div>
            <div className="text-xs text-slate-400">{formatBytes(file.size)}</div>
          </div>
          {!busy && (
            <button
              type="button"
              aria-label={`Remove ${file.name}`}
              onClick={() => {
                setFile(null);
                setError(null);
              }}
              className="rounded-sm p-1 text-blue-grey outline-none transition-colors hover:text-slate focus-visible:shadow-focus"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      )}

      {phase === "uploading" && (
        <Progress value={progress} className="mt-4">
          <ProgressLabel>Uploading</ProgressLabel>
          <ProgressValue />
        </Progress>
      )}

      <Button
        size="lg"
        className="mt-4 w-full"
        disabled={!file}
        loading={busy}
        onClick={start}
      >
        {phase === "uploading" && "Uploading…"}
        {phase === "creating" && "Starting review…"}
        {phase === "idle" && (
          <>
            Start review <ArrowRightIcon />
          </>
        )}
      </Button>

      <p className="mt-3.5 text-center text-xs text-slate-400">
        The recording is the evidence behind every citation, so it is stored with the recap.
      </p>
    </div>
  );
}
