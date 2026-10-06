import { create } from "zustand";

/**
 * Playback state, shared by the player, the transcript and the citation chips.
 *
 * The `<audio>` element stays the source of truth for what is actually
 * playing; this store mirrors it and carries *intent* the other way. A chip
 * does not reach for the element — it records a seek, and the player performs
 * it. That keeps the transcript and summary free of DOM refs.
 */

export const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

/**
 * A seek carries a nonce because seeking twice to the same millisecond is a
 * real request — clicking the same citation chip again should jump back to it.
 * Comparing `ms` alone would swallow the second click.
 */
export type SeekRequest = { ms: number; nonce: number };

type PlayerState = {
  currentMs: number;
  durationMs: number;
  playing: boolean;
  rate: PlaybackRate;
  /** Whether the transcript follows playback. Persisted per session only. */
  autoScroll: boolean;
  /** The pending seek, or null once the player has consumed it. */
  seekRequest: SeekRequest | null;
  /** Set when a citation asks the transcript to scroll somewhere specific. */
  focusSegmentIndex: number | null;

  setCurrentMs: (ms: number) => void;
  setDurationMs: (ms: number) => void;
  setPlaying: (playing: boolean) => void;
  setRate: (rate: PlaybackRate) => void;
  cycleRate: () => void;
  toggleAutoScroll: () => void;
  /** Ask the player to jump. Optionally focus a transcript line too. */
  seek: (ms: number, options?: { segmentIndex?: number }) => void;
  consumeSeek: () => void;
  clearFocus: () => void;
  reset: () => void;
};

const initial = {
  currentMs: 0,
  durationMs: 0,
  playing: false,
  rate: 1 as PlaybackRate,
  autoScroll: true,
  seekRequest: null,
  focusSegmentIndex: null,
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...initial,

  setCurrentMs: (ms) => set({ currentMs: Math.max(0, ms) }),
  setDurationMs: (ms) => set({ durationMs: Math.max(0, ms) }),
  setPlaying: (playing) => set({ playing }),
  setRate: (rate) => set({ rate }),

  cycleRate: () => {
    const index = PLAYBACK_RATES.indexOf(get().rate);
    set({ rate: PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length] });
  },

  toggleAutoScroll: () => set((state) => ({ autoScroll: !state.autoScroll })),

  seek: (ms, options) =>
    set((state) => ({
      // Move the playhead immediately so the highlight does not lag the click.
      currentMs: Math.max(0, ms),
      seekRequest: { ms: Math.max(0, ms), nonce: (state.seekRequest?.nonce ?? 0) + 1 },
      focusSegmentIndex: options?.segmentIndex ?? null,
    })),

  consumeSeek: () => set({ seekRequest: null }),
  clearFocus: () => set({ focusSegmentIndex: null }),
  reset: () => set(initial),
}));

/**
 * Index of the segment playing at `currentMs`.
 *
 * Binary search, because this runs on every timeupdate — roughly four times a
 * second — against a list that can hold thousands of segments.
 *
 * Segments are contiguous in practice but gaps appear on silence, so a time
 * inside a gap resolves to the segment just before it rather than to nothing;
 * that keeps the highlight from flickering off between lines.
 */
export function activeSegmentIndex(
  segments: readonly { startMs: number; endMs: number }[],
  currentMs: number
): number {
  if (segments.length === 0) return -1;
  if (currentMs < segments[0].startMs) return -1;

  let low = 0;
  let high = segments.length - 1;
  let answer = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (segments[mid].startMs <= currentMs) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return answer;
}
