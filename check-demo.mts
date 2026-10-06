import { db } from "@/lib/db";
import { resolveDemoCredentials } from "@/lib/demo-account";
const resolved = resolveDemoCredentials(process.env);
if (!resolved.ok) throw new Error(resolved.reason);
const user = await db.user.findUniqueOrThrow({ where: { email: resolved.credentials.email }, select: { id: true } });
const meetings = await db.meeting.findMany({
  where: { userId: user.id, audioUrl: { not: null } },
  orderBy: { createdAt: "desc" },
  select: { title: true, status: true, failureReason: true, durationSec: true, _count: { select: { segments: true } } },
});
for (const m of meetings) {
  console.log(`${m.title} | ${m.status} | segments: ${m._count.segments} | duration: ${m.durationSec ?? "-"}s${m.failureReason ? " | " + m.failureReason : ""}`);
}
await db.$disconnect();
