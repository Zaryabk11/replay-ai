import { cn } from "@/lib/utils";

/**
 * The Recap mark: a waveform on a rounded teal tile.
 * Source: src/assets/logo-mark.svg, inlined so it can be recoloured per
 * surface and needs no extra request. The same artwork is the favicon
 * (src/app/icon.svg).
 *
 * `tone="onTeal"` is the sidebar variant — the teal tile would disappear
 * against the teal panel, so the tile becomes a translucent white scrim.
 */
export function LogoMark({
  tone = "default",
  className,
}: {
  tone?: "default" | "onTeal";
  className?: string;
}) {
  const onTeal = tone === "onTeal";

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect
        width="64"
        height="64"
        rx="15"
        fill={onTeal ? "rgb(255 255 255 / 0.18)" : "var(--color-deep-teal-500)"}
      />
      <g
        transform="translate(5 8)"
        fill={onTeal ? "var(--color-white)" : "var(--color-mist-paper)"}
      >
        <rect x="9" y="19" width="5" height="12" rx="2.5" />
        <rect x="18" y="12" width="5" height="26" rx="2.5" />
        {/* The tall centre bar carries the accent in both tones. */}
        <rect x="27" y="5" width="5" height="40" rx="2.5" fill="var(--color-blue-grey-300)" />
        <rect x="36" y="14" width="5" height="22" rx="2.5" />
        <rect x="45" y="21" width="5" height="8" rx="2.5" />
      </g>
    </svg>
  );
}
