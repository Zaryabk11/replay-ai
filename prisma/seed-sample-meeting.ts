/**
 * Seeds one READY meeting with a synthetic transcript, summary and action
 * items, so the meeting page can be exercised without burning provider credit.
 *
 *   npx tsx --env-file-if-exists=.env.local prisma/seed-sample-meeting.ts [segmentCount]
 *
 * Pass a large count (e.g. 4000) to check the transcript stays smooth.
 * Like the placeholder meetings, the title carries PLACEHOLDER_PREFIX, so
 * `npm run seed:demo` clears it.
 */

import { db } from "@/lib/db";
import { PLACEHOLDER_PREFIX, resolveDemoCredentials } from "@/lib/demo-account";
import { speakersFromSegments } from "@/lib/speakers";

const LINES = [
  ["Speaker 1", "Let's review last week's onboarding metrics before we get into the roadmap."],
  ["Speaker 2", "We need to fix the onboarding flow. The drop-off is worse than last cycle."],
  ["Speaker 3", "Agreed. Drop-off spikes right after the workspace step, about a third of people."],
  ["Speaker 1", "What's the effort to simplify that step?"],
  ["Speaker 2", "We estimate two sprints to ship the new flow end to end."],
  ["Speaker 3", "Sales is hearing the same thing from new accounts in their first week."],
  ["Speaker 1", "Let's lock the scope by Thursday and review estimates next week."],
] as const;

async function main() {
  const count = Math.max(LINES.length, Number(process.argv[2] ?? 60));

  const resolved = resolveDemoCredentials(process.env);
  if (!resolved.ok) throw new Error(resolved.reason);

  const user = await db.user.findUnique({
    where: { email: resolved.credentials.email },
    select: { id: true },
  });
  if (!user) throw new Error("Run `npm run seed:demo` first.");

  const title = `${PLACEHOLDER_PREFIX} Product Weekly Sync (sample recap)`;
  await db.meeting.deleteMany({ where: { userId: user.id, title } });

  // ~8 seconds per line, so the timecodes look like a real meeting.
  const segments = Array.from({ length: count }, (_, index) => {
    const [speaker, text] = LINES[index % LINES.length];
    const startMs = index * 8000 + 4080;
    return { index, speaker, text, startMs, endMs: startMs + 7200 };
  });

  const meeting = await db.meeting.create({
    data: {
      userId: user.id,
      title,
      status: "READY",
      // A short public clip, so the player has something real to play.
      audioUrl: "https://file-examples.com/storage/fe0b4b2a0a6a3f5a9e2e0d0/2017/11/file_example_MP3_700KB.mp3",
      durationSec: Math.round((segments.at(-1)!.endMs + 1000) / 1000),
      summaryHeadline: "Onboarding flow needs simplification before Q3.",
      summaryOverview:
        "The team identified a drop-off after the workspace step and agreed to rebuild it. Two sprints were approved to ship the new flow.",
      readyAt: new Date(),
      droppedCitations: 1,
      segments: { create: segments },
      speakers: { create: speakersFromSegments(segments) },
    },
    select: { id: true },
  });

  const stored = await db.transcriptSegment.findMany({
    where: { meetingId: meeting.id },
    select: { id: true, index: true },
  });
  const at = (index: number) => stored.find((s) => s.index === index)?.id ?? null;

  await db.summaryPoint.createMany({
    data: [
      { meetingId: meeting.id, text: "Drop-off occurs after the workspace step", position: 0, segmentId: at(2) },
      { meetingId: meeting.id, text: "Simplify the onboarding flow", position: 1, segmentId: at(1) },
      { meetingId: meeting.id, text: "Estimated effort: two sprints", position: 2, segmentId: at(4) },
      // One point whose citation the validator dropped, so that path is visible.
      { meetingId: meeting.id, text: "Launch timing is still open", position: 3, segmentId: null },
    ],
  });

  await db.actionItem.createMany({
    data: [
      { meetingId: meeting.id, text: "Fix the onboarding flow error", assignee: "Speaker 2", position: 0, status: "PROPOSED", segmentId: at(1) },
      { meetingId: meeting.id, text: "Review drop-off spikes and report Friday", assignee: "Speaker 3", position: 1, status: "ACCEPTED", segmentId: at(2) },
      { meetingId: meeting.id, text: "Lock scope by Thursday", assignee: "Speaker 1", position: 2, status: "PROPOSED", segmentId: at(6) },
      { meetingId: meeting.id, text: "Create a launch plan", assignee: "Marketing", position: 3, status: "DISMISSED", dismissedAt: new Date(), segmentId: null },
    ],
  });

  console.log(`\n✓ Sample meeting ready: /meetings/${meeting.id}`);
  console.log(`  ${segments.length} segments · 4 takeaways · 4 action items\n`);
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
