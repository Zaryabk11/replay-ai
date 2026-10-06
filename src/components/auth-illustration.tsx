import { cn } from "@/lib/utils";

/**
 * A transcript line linked by its [04:12] chip to the summary it supports —
 * the product's whole claim, in one picture.
 *
 * Source: src/assets/auth-illustration.svg, inlined for two reasons. As an
 * <img> the SVG is its own document, so it could not reach the next/font
 * faces and fell back to Georgia and system-ui; here the families resolve to
 * the real tokens. It also drops ~6KB of C2PA metadata the file carried.
 */
export function AuthIllustration({ className }: { className?: string }) {
  const mono = "var(--font-geist-mono), ui-monospace, monospace";
  const sans = "var(--font-geist-sans), system-ui, sans-serif";
  const serif = "var(--font-newsreader), Georgia, serif";

  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label="A transcript line and the summary point it supports, linked by a shared 04:12 timestamp."
      className={cn("h-auto w-full", className)}
    >
      <defs>
        <filter id="recap-auth-card-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#111F21" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* Transcript card */}
      <g transform="translate(14 14)">
        <rect width="340" height="130" rx="10" fill="#fff" filter="url(#recap-auth-card-shadow)" />
        <text x="16" y="24" fontFamily={mono} fontSize="10" letterSpacing="0.8" fill="#8695A0">
          TRANSCRIPT
        </text>

        <text x="16" y="48" fontFamily={mono} fontSize="10" fill="#8695A0">
          04:08
        </text>
        <circle cx="64" cy="44" r="3.5" fill="#2F5D62" />
        <text x="73" y="48" fontFamily={sans} fontSize="11.5" fontWeight="600" fill="#1E2527">
          Speaker 1
        </text>
        <text x="64" y="64" fontFamily={sans} fontSize="12" fill="#5A676A">
          Let&apos;s review last week&apos;s onboarding metrics.
        </text>

        {/* The cited line, highlighted as it is in the transcript view */}
        <rect x="0" y="76" width="340" height="40" fill="#F6FAF9" />
        <rect x="0" y="76" width="2.5" height="40" fill="#2F5D62" />
        <text x="16" y="92" fontFamily={mono} fontSize="10" fill="#2F5D62">
          04:12
        </text>
        <circle cx="64" cy="88" r="3.5" fill="#6C8CA0" />
        <text x="73" y="92" fontFamily={sans} fontSize="11.5" fontWeight="600" fill="#1E2527">
          Speaker 2
        </text>
        <text x="64" y="108" fontFamily={sans} fontSize="12" fill="#1E2527">
          We need to fix the onboarding flow.
        </text>
      </g>

      {/* The citation, and the thread from it down to the summary */}
      <path
        d="M44 144 V164 Q44 172 52 172 H66"
        fill="none"
        stroke="#AAB8C1"
        strokeWidth="2"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      <rect x="30" y="136" width="50" height="18" rx="5" fill="#EAF0EF" stroke="#CFE0DC" />
      <text
        x="55"
        y="148.5"
        textAnchor="middle"
        fontFamily={mono}
        fontSize="11"
        fontWeight="500"
        fill="#2F5D62"
      >
        04:12
      </text>

      {/* Summary card */}
      <g transform="translate(46 160)">
        <rect width="340" height="126" rx="10" fill="#fff" filter="url(#recap-auth-card-shadow)" />
        <text x="16" y="24" fontFamily={mono} fontSize="10" letterSpacing="0.8" fill="#8695A0">
          SUMMARY
        </text>
        <text x="16" y="48" fontFamily={serif} fontSize="16" fontWeight="500" fill="#1E2527">
          Onboarding flow needs
        </text>
        <text x="16" y="67" fontFamily={serif} fontSize="16" fontWeight="500" fill="#1E2527">
          simplification.
        </text>
        <rect x="128" y="53" width="50" height="18" rx="5" fill="#EAF0EF" stroke="#CFE0DC" />
        <text
          x="153"
          y="65.5"
          textAnchor="middle"
          fontFamily={mono}
          fontSize="11"
          fontWeight="500"
          fill="#2F5D62"
        >
          04:12
        </text>

        <line x1="16" y1="82" x2="324" y2="82" stroke="#EAEEED" />
        <text x="16" y="105" fontFamily={sans} fontSize="12" fill="#5A676A">
          Alex to fix onboarding error
        </text>
        <rect x="254" y="92" width="58" height="18" rx="5" fill="#EAF2EC" stroke="#C2DBC9" />
        <text
          x="283"
          y="104.5"
          textAnchor="middle"
          fontFamily={mono}
          fontSize="11"
          fontWeight="500"
          fill="#2E5E3A"
        >
          ✓ 04:12
        </text>
      </g>
    </svg>
  );
}
