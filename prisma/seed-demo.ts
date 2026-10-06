/**
 * Seeds the shared demo account and its placeholder meetings.
 *
 *   npm run seed:demo
 *
 * Idempotent: rerun it after changing DEMO_PASSWORD, or to reset the
 * placeholder rows. It only ever touches the demo user's own records.
 *
 * The user is created through Better Auth rather than written straight into
 * the table, so the password hash matches what sign-in verifies against.
 */

// Env comes from --env-file-if-exists=.env.local in the npm script, not from
// a dotenv call here: ESM hoists the imports below above any statement, so
// db.ts would read DATABASE_URL before a config() call could set it.
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  PLACEHOLDER_PREFIX,
  demoMeetingSeeds,
  resolveDemoCredentials,
} from "@/lib/demo-account";

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const resolved = resolveDemoCredentials(process.env);
  if (!resolved.ok) {
    throw new Error(
      `${resolved.reason}\nSet DEMO_EMAIL and DEMO_PASSWORD in .env.local — see .env.example.`
    );
  }
  const { email, password, name } = resolved.credentials;

  const userId = await upsertDemoUser({ email, password, name });
  const count = await replacePlaceholderMeetings(userId);

  console.log(`\n✓ Demo account ready: ${email}`);
  console.log(`✓ ${count} placeholder meetings (${demoMeetingSeeds.map((m) => m.status).join(", ")})`);
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
 * Deletes the demo user's previous placeholders and writes a fresh set, so the
 * script does not stack up duplicates. Real meetings are left alone: the
 * filter is the title prefix.
 */
async function replacePlaceholderMeetings(userId: string): Promise<number> {
  const { count: removed } = await db.meeting.deleteMany({
    where: { userId, title: { startsWith: PLACEHOLDER_PREFIX } },
  });
  if (removed > 0) console.log(`· removed ${removed} old placeholder meetings`);

  const now = Date.now();
  await db.meeting.createMany({
    data: demoMeetingSeeds.map((seed) => ({
      userId,
      title: seed.title,
      status: seed.status,
      durationSec: seed.durationSec,
      // No audio: these never went through the pipeline.
      audioUrl: null,
      createdAt: new Date(now - seed.daysAgo * DAY_MS),
    })),
  });

  return demoMeetingSeeds.length;
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
