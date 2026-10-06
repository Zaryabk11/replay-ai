"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PLAYBACK_RATES, usePlayerStore } from "@/stores/player-store";
import { timecode } from "@/lib/export-markdown";
import { cn } from "@/lib/utils";

/**
 * The only component that touches the <audio> element.
 *
 * Everything else expresses intent through the store — a citation chip calls
 * `seek()`, and the effect below performs it — so the transcript and summary
 * never need a ref to the player.
 */
export function AudioPlayer({ src, tone = "light" }: { src: string; tone?: "light" | "dark" }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const {
    currentMs,
    durationMs,
    playing,
    rate,
    seekRequest,
    setCurrentMs,
    setDurationMs,
    setPlaying,
    cycleRate,
    consumeSeek,
  } = usePlayerStore();

  // Perform a pending seek. Keyed on the nonce, so seeking twice to the same
  // moment still moves the playhead.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !seekRequest) return;
    audio.currentTime = seekRequest.ms / 1000;
    consumeSeek();
    // A seek from a citation is a request to hear it, so start playing.
    if (audio.paused) void audio.play().catch(() => {});
  }, [seekRequest, consumeSeek]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
  }, [rate]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  }

  function scrub(event: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    const ms = Number(event.target.value);
    if (audio) audio.currentTime = ms / 1000;
    setCurrentMs(ms);
  }

  const dark = tone === "dark";
  // Until metadata loads there is no duration, so there is no progress to show
  // and nothing to seek against.
  const known = durationMs > 0;
  const progress = known ? Math.min(100, Math.max(0, (currentMs / durationMs) * 100)) : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-5 py-3",
        dark ? "rounded-2xl bg-ink" : "border-t border-line-200 bg-surface-raised"
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDurationMs(e.currentTarget.duration * 1000)}
        onTimeUpdate={(e) => setCurrentMs(e.currentTarget.currentTime * 1000)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setUnavailable(true)}
      />

      <button
        type="button"
        onClick={toggle}
        disabled={unavailable}
        aria-label={playing ? "Pause" : "Play"}
        className="flex size-7.5 shrink-0 items-center justify-center rounded-full bg-deep-teal-500 text-white outline-none transition-colors hover:bg-deep-teal-600 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:bg-blue-grey"
      >
        {playing ? (
          <PauseIcon className="size-3.5 fill-current" />
        ) : (
          <PlayIcon className="size-3.5 translate-x-px fill-current" />
        )}
      </button>

      <span
        className={cn(
          "shrink-0 font-mono text-[11px] tabular-nums",
          dark ? "text-blue-grey" : "text-slate"
        )}
      >
        {timecode(currentMs)} / {known ? timecode(durationMs) : "--:--"}
      </span>

      {/* A range input gives keyboard seeking and a drag target for free. */}
      <label className="relative flex min-w-0 flex-1 items-center">
        <span className="sr-only">Seek</span>
        <span
          aria-hidden
          className={cn("h-[3px] w-full rounded-xs", dark ? "bg-white/20" : "bg-line-300")}
        >
          <span
            className={cn("block h-full rounded-xs", dark ? "bg-harbor-blue-500" : "bg-deep-teal-500")}
            style={{ width: `${progress}%` }}
          />
        </span>
        <input
          type="range"
          min={0}
          max={known ? durationMs : 1}
          value={known ? Math.min(currentMs, durationMs) : 0}
          disabled={!known}
          onChange={scrub}
          className="absolute inset-x-0 h-4 w-full cursor-pointer opacity-0 disabled:cursor-default"
        />
      </label>

      {unavailable && (
        <span className="shrink-0 text-xs text-error-text">Recording unavailable</span>
      )}

      <button
        type="button"
        onClick={cycleRate}
        aria-label={`Playback speed ${rate}×. Click to change.`}
        title={`Speed: ${PLAYBACK_RATES.join("× / ")}×`}
        className={cn(
          "shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[11px] tabular-nums outline-none transition-colors focus-visible:shadow-focus",
          dark ? "text-blue-grey hover:text-white" : "text-slate hover:text-ink"
        )}
      >
        {rate}×
      </button>
    </div>
  );
}
