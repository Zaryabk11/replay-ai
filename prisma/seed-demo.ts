/**
 * Seeds the shared demo account and the library behind "Try the demo".
 *
 *   npm run seed:demo
 *
 * The demo account is an ordinary user row — Better Auth checks its password
 * against the database — so this has to run against whichever database the
 * app is pointed at. Running it locally with a production DATABASE_URL in
 * .env.local seeds production.
 *
 * Idempotent, and destructive to the demo user only: every meeting that
 * account owns is replaced on each run, so the demo always looks the same.
 * Nothing outside that account is touched.
 *
 * The user is created through Better Auth rather than written straight into
 * the table, so the password hash matches what sign-in verifies against.
 */

// Env comes from --env-file-if-exists=.env.local in the npm script, not from
// a dotenv call here: ESM hoists the imports below above any statement, so
// db.ts would read DATABASE_URL before a config() call could set it.
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveDemoCredentials } from "@/lib/demo-account";
import { speakersFromSegments } from "@/lib/speakers";
import {
  demoLibrary,
  durationSecFor,
  resolveLine,
  timeLines,
  type DemoMeeting,
} from "./demo-content";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Optional: a real recording for the seeded meetings, so playback works in
 * the demo. The transcript timings are synthetic, so a clip only lines up by
 * coincidence — it is there to show the player, not to match the words.
 */
const AUDIO_URL = process.env.DEMO_AUDIO_URL?.trim() || null;

async function main() {
  const resolved = resolveDemoCredentials(process.env);
  if (!resolved.ok) {
    throw new Error(
      `${resolved.reason}\nSet DEMO_EMAIL and DEMO_PASSWORD in .env.local — see .env.example.`
    );
  }
  const { email, password, name } = resolved.credentials;

  const userId = await upsertDemoUser({ email, password, name });
  const summary = await replaceLibrary(userId);

  console.log(`\n✓ Demo account ready: ${email}`);
  for (const line of summary) console.log(`  · ${line}`);
  if (!AUDIO_URL) {
    console.log(
      `\n  Playback is disabled (no DEMO_AUDIO_URL). Citations still seek and\n` +
        `  scroll the transcript; the player shows "Recording unavailable".`
    );
  }
  console.log(`\nSign in with "Try the demo", or with the credentials above.\n`);
}

/** Creates the demo user, or resets its password if it already exists. */
async function upsertDemoUser({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}): Promise<string> {
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email);

  if (!existing) {
    const created = await auth.api.signUpEmail({ body: { name, email, password } });
    console.log("· created the demo user");
    return created.user.id;
  }

  const userId = existing.user.id;
  const hash = await ctx.password.hash(password);

  // A user can exist without a credential account, e.g. if it was made some
  // other way, so cover both.
  if (await ctx.internalAdapter.findCredentialAccount(userId)) {
    await ctx.internalAdapter.updatePassword(userId, hash);
  } else {
    await ctx.internalAdapter.createAccount({
      userId,
      providerId: "credential",
      accountId: userId,
      password: hash,
    });
  }

  if (existing.user.name !== name) {
    await ctx.internalAdapter.updateUser(userId, { name });
  }

  console.log("· demo user already existed — password reset to DEMO_PASSWORD");
  return userId;
}

/**
 * Replace the demo account's whole library. Scoped by userId rather than by
 * a title prefix: the demo is meant to be reset, and anything a visitor
 * uploaded into it is not worth preserving.
 */
async function replaceLibrary(userId: string): Promise<string[]> {
  const { count: removed } = await db.meeting.deleteMany({ where: { userId } });
  if (removed > 0) console.log(`· cleared ${removed} existing demo meetings`);

  const now = Date.now();
  const summary: string[] = [];

  for (const meeting of demoLibrary) {
    summary.push(await createMeeting(userId, meeting, now));
  }

  return summary;
}

async function createMeeting(
  userId: string,
  demo: DemoMeeting,
  now: number
): Promise<string> {
  const timed = timeLines(demo.lines);
  const hasTranscript = timed.length > 0;

  const meeting = await db.meeting.create({
    data: {
      userId,
      title: demo.title,
      status: demo.status,
      createdAt: new Date(now - demo.daysAgo * DAY_MS),
      audioUrl: AUDIO_URL,
      durationSec: hasTranscript ? durationSecFor(timed) : null,
      summaryHeadline: demo.headline,
      summaryOverview: demo.overview,
      readyAt: demo.status === "READY" ? new Date(now - demo.daysAgo * DAY_MS) : null,
      processingStartedAt: demo.status === "UPLOADED" ? null : new Date(now - demo.daysAgo * DAY_MS),
      failureStage: demo.failureStage ?? null,
      failureReason: demo.failureReason ?? null,
      droppedCitations: demo.points.filter((p) => p.cite === null).length,
      segments: {
        create: timed.map((line) => ({
          index: line.index,
          speaker: line.speaker,
          text: line.text,
          startMs: line.startMs,
          endMs: line.endMs,
        })),
      },
      speakers: { create: speakersFromSegments(timed) },
    },
    select: { id: true },
  });

  if (!hasTranscript) {
    return `${demo.title} — ${demo.status.toLowerCase()}`;
  }

  // Segment ids are only known once the rows exist, so citations are wired up
  // in a second pass. resolveLine throws if a snippet no longer matches.
  const stored = await db.transcriptSegment.findMany({
    where: { meetingId: meeting.id },
    select: { id: true, index: true },
  });
  const idByIndex = new Map(stored.map((s) => [s.index, s.id]));
  const citationId = (snippet: string | null) =>
    snippet === null ? null : (idByIndex.get(resolveLine(timed, snippet).index) ?? null);

  await db.summaryPoint.createMany({
    data: demo.points.map((point, position) => ({
      meetingId: meeting.id,
      text: point.text,
      position,
      segmentId: citationId(point.cite),
    })),
  });

  await db.actionItem.createMany({
    data: demo.actionItems.map((item, position) => ({
      meetingId: meeting.id,
      text: item.text,
      assignee: item.assignee,
      position,
      status: item.status,
      dismissedAt: item.status === "DISMISSED" ? new Date(now - demo.daysAgo * DAY_MS) : null,
      segmentId: citationId(item.cite),
    })),
  });

  const accepted = demo.actionItems.filter((i) => i.status === "ACCEPTED").length;
  return (
    `${demo.title} — ${timed.length} segments, ${demo.points.length} takeaways, ` +
    `${demo.actionItems.length} actions (${accepted} accepted)`
  );
}

main()
  .then(async () => {
    await db.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n✗ Seed failed:\n", error instanceof Error ? error.message : error);
    await db.$disconnect().catch(() => {});
    process.exit(1);
  });
