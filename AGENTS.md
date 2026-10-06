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
- **Summaries — Gemini 2.5 Flash**. `GEMINI_API_KEY`.

We are **not** using Groq or the Claude API. Free tiers only; do not add a
provider that needs a paid plan without asking first.

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

## Commands

| Command               | Does                                              |
| --------------------- | ------------------------------------------------- |
| `npm run dev`         | Dev server                                        |
| `npm run build`       | Production build (run before declaring done)      |
| `npm test`            | vitest                                            |
| `npm run lint`        | eslint                                            |
| `npm run db:migrate`  | Prisma migration against Neon (uses `DIRECT_URL`) |
| `npm run db:generate` | Regenerate the client — Prisma 7 does not do this on migrate |
| `npm run seed:demo`   | Create/update the demo account + placeholder meetings |

Environment lives in `.env.local` (gitignored). `.env.example` lists every
variable with no values.
