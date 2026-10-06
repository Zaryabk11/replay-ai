/**
 * Upload one local audio file into the demo account's library and start the
 * real pipeline against it — Deepgram transcription, Gemini summarization,
 * citation validation — the same path a real upload takes, minus the browser.
 *
 *   npx tsx --env-file-if-exists=.env.local prisma/seed-demo-recording.ts \
 *     "./council-meeting.mp3" "City Council — Oct 6 Session"
 *
 * The title argument is optional; the filename is used if you leave it off.
 * Run it once per file.
 *
 * This talks to Vercel Blob and the database directly rather than through
 * /api/upload, so none of the public upload budget in upload-limits.ts
 * applies. That budget exists to stop the "Try the demo" button from being
 * used to burn free-tier credit — it has nothing to do with content you're
 * choosing to seed yourself.
 *
 * Where processing actually runs depends on where the Inngest event lands,
 * not on this machine. For anything long enough to need Deepgram's callback
 * (past a couple of minutes), that callback has to be publicly reachable, so
 * set INNGEST_EVENT_KEY (Inngest dashboard → Keys) before running this —
 * without it, the send either fails outright or, if INNGEST_DEV is set
 * locally, routes to your local dev server, which needs a tunnel for a file
 * this long. With the event key set, Inngest Cloud invokes your *deployed*
 * app instead, which is already publicly reachable.
 *
 * Assumes DATABASE_URL here is the same database your deployment uses —
 * otherwise this seeds a meeting the deployed app can never see.
 */

import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { put } from "@vercel/blob";
import { inngest, meetingUploaded } from "@/inngest/client";
import { db } from "@/lib/db";
import { resolveDemoCredentials } from "@/lib/demo-account";
import { resolveContentType } from "@/lib/upload-limits";

async function main() {
  const [, , filePath, titleArg] = process.argv;
  if (!filePath) {
    throw new Error('Usage: tsx prisma/seed-demo-recording.ts <path-to-audio-file> ["Title"]');
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set — see .env.example.");
  }

  const resolved = resolveDemoCredentials(process.env);
  if (!resolved.ok) {
    throw new Error(`${resolved.reason}\nSet DEMO_EMAIL and DEMO_PASSWORD in .env.local.`);
  }

  const user = await db.user.findUnique({
    where: { email: resolved.credentials.email },
    select: { id: true },
  });
  if (!user) {
    throw new Error(
      `No user found for ${resolved.credentials.email}. Run \`npm run seed:demo\` first.`
    );
  }

  const filename = basename(filePath);
  const title = titleArg?.trim() || titleFrom(filename);
  const contentType = resolveContentType({ name: filename, size: 0, type: "" });

  console.log(`Reading ${filename}...`);
  const bytes = readFileSync(filePath);
  console.log(`Uploading ${(bytes.length / (1024 * 1024)).toFixed(1)} MB to Blob...`);

  const blob = await put(filename, bytes, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });

  const meeting = await db.meeting.create({
    data: {
      userId: user.id,
      title,
      status: "UPLOADED",
      audioUrl: blob.url,
      blobPathname: blob.pathname,
      sizeBytes: bytes.length,
      contentType,
    },
    select: { id: true },
  });

  console.log(`Created meeting ${meeting.id} — sending meeting/uploaded...`);
  if (!process.env.INNGEST_EVENT_KEY) {
    console.warn(
      "\n⚠ INNGEST_EVENT_KEY is not set. See the file header — this send is\n" +
        "  likely to fail, or to route somewhere that can't reach Deepgram's\n" +
        "  callback for a file this long.\n"
    );
  }

  await inngest.send(meetingUploaded.create({ meetingId: meeting.id }));

  console.log(`\n✓ ${title}`);
  console.log(`  Meeting: ${meeting.id}`);
  console.log(`  Blob:    ${blob.url}`);
  console.log(`  Watch it process at /meetings/${meeting.id}/processing`);
  console.log(`  or in the Inngest dashboard's Runs tab.\n`);
}

function titleFrom(filename: string): string {
  const base = filename.replace(extname(filename), "").replace(/[_-]+/g, " ").trim();
  return base || "Untitled recording";
}

main()
  .then(async () => {
    await db.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n✗ Failed:\n", error instanceof Error ? error.message : error);
    await db.$disconnect().catch(() => {});
    process.exit(1);
  });
