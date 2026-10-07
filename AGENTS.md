<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Replay AI

An AI meeting reviewer. Upload a recording and get back a cited transcript, a
cited summary, and triaged action items — each linked to the exact timestamp.

## Stack

| Area          | Choice                                                      |
| ------------- | ----------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, TypeScript, `src/`, Turbopack)       |
| Styling       | Tailwind v4, shadcn/ui on Base UI                            |
| Database      | Neon Postgres via Prisma 7 (`@prisma/adapter-neon`)          |
| Auth          | Better Auth (email + password)                               |
| Background    | Inngest                                                      |
| File storage  | Vercel Blob                                                  |
| Client state  | TanStack Query, Zustand                                      |
| Forms         | react-hook-form + zod                                        |
| Motion        | motion (presets in `src/lib/motion.ts`)                      |
| Icons         | lucide-react                                                 |
| Tests         | vitest                                                       |
| Fonts         | Geist, Geist Mono, Newsreader via `next/font`                |

### AI providers

Both sit behind the provider interface in `src/lib/providers/`, so neither SDK
is imported outside that folder.

- **Transcription — Deepgram**, with speaker diarization. `DEEPGRAM_API_KEY`.
- **Summaries — Gemini Flash-Lite**. `GEMINI_API_KEY`.

We are **not** using Groq or the Claude API. Free tiers only; do not add a
provider that needs a paid plan without asking first.

Both are called over `fetch`, not their SDKs: each uses one or two endpoints,
and the mapping is where the logic lives. The mappers (`parseDeepgramResult`,
`parseGeminiResult`) are pure and fixture-tested.

A transcript longer than `CHUNK_SIZE` (400) segments is map-reduced rather
than truncated: each chunk is summarized on its own, then a final call merges
the per-chunk results — seeing only their candidate points/action items and
citations, never the raw transcript — into one summary. A short meeting still
costs exactly one call. A 429 mid-summary is retried locally with backoff
(`src/lib/providers/gemini.ts`, `callGemini`) rather than failing the whole
Inngest step, which would redo every chunk already paid for; a wait past
`LOCAL_RETRY_CAP_MS` is handed to Inngest's own retry instead.

### Pipeline

`src/inngest/functions/process-meeting.ts` runs transcribe → summarize →
validate → save, one `step.run` each so a retry resumes rather than repeating
a metered call. Deepgram gets a callback URL and the pipeline parks on
`step.waitForEvent`, so no function is held open for the length of a meeting.
Set `DEEPGRAM_MODE=sync` to await the request inline for local testing.

### Meeting page

Playback state lives in `src/stores/player-store.ts`. Nothing but
`audio-player.tsx` touches the `<audio>` element — a citation chip records a
seek and the player performs it, so the transcript and summary need no refs.
The transcript is virtualized and subscribes to the *derived* active index
rather than `currentMs`, so it re-renders once per spoken line instead of four
times a second.

Speakers are a table. Segments store the provider's key ("Speaker 1"), so a
rename writes one row, every occurrence follows, and the colour stays put.

Every citation is checked against a real segment before it is stored
(`src/lib/pipeline/citations.ts`). A citation that cannot be resolved is
dropped and counted; the takeaway is kept uncited rather than discarded.

## Design system

`src/design/Recap System v2.dc.html` is the source of truth for every visual
decision. Do not invent colors, radii, shadows, or type sizes beyond it.

- Tokens live in `src/app/globals.css`. Tailwind's default palette is cleared,
  so only Recap colors exist (`bg-deep-teal-500`, `text-ink`, `border-line-300`,
  `bg-success-bg`, `shadow-focus`, ...).
- `/design` renders every token, component, and state. Check changes there.
- Signal Coral (`coral-500`) is **not** a brand color — error, destructive, and
  high-priority only.
- One citation primitive: the `[04:12]` timestamp chip (`<Badge variant="citation">`).
- One secondary button, always outlined.

## Conventions

- Route groups: `src/app/(auth)` for signed-out pages, `src/app/(app)` for the
  protected shell. `(app)/layout.tsx` redirects to `/sign-in` without a session.
- Server-side session reads go through `src/lib/session.ts`, never
  `auth.api.getSession` directly in a page.
- Mutations are server actions returning `ActionResult` (`src/lib/action-result.ts`),
  not thrown errors, so forms can render a message.
- Secrets stay server-side. Only `NEXT_PUBLIC_*` reaches the browser; the demo
  credentials in particular must never be imported into a client component.
- The "Try the demo" button signs into a real seeded account via
  `signInAsDemo()`; the credentials never leave the server. It only works
  where `npm run seed:demo` has been run against that database — the demo
  user is an ordinary row, not a bypass.
- The demo library lives in `prisma/demo-content.ts`: whole meetings with
  transcripts, summaries, citations and triaged actions, plus one
  transcribing and one failed so those states are reachable. Citations are
  written as a snippet of the line they come from and resolved at seed time,
  so a citation cannot drift onto the wrong line when the dialogue is edited.
  `seed:demo` replaces every meeting that account owns on each run.

## Commands

| Command               | Does                                              |
| --------------------- | ------------------------------------------------- |
| `npm run dev`         | Dev server                                        |
| `npm run build`       | Production build (run before declaring done)      |
| `npm test`            | vitest                                            |
| `npm run lint`        | eslint                                            |
| `npm run db:migrate`  | Prisma migration against Neon (uses `DIRECT_URL`) |
| `npm run db:generate` | Regenerate the client — Prisma 7 does not do this on migrate |
| `npm run seed:demo`   | Create/update the demo account and fill its library with demo meetings |
| `npm run seed:sample` | One READY meeting with a fake transcript, for the meeting page (pass a segment count, e.g. `npm run seed:sample 4000`) |
| `npm run seed:demo-recording` | Upload a real local audio file into the demo account and run it through the real pipeline (`-- <path> ["Title"]`) |
| `npx inngest-cli@latest dev` | Inngest dev server (run beside `npm run dev`)   |

Environment lives in `.env.local` (gitignored). `.env.example` lists every
variable with no values.
