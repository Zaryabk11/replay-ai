/**
 * One-off: poll the two real demo meetings until both reach a terminal
 * status, printing a line whenever either one changes. Deleted after use.
 */
import { db } from "@/lib/db";

const targets = [
  { id: "cmux9cat40000x4ibfycrxkn5", label: "Quick Clip" },
  { id: "cmux9dyxq0000z8ib08643i0h", label: "City Council — March 18, 2026" },
];

const TERMINAL = new Set(["READY", "FAILED"]);
const POLL_MS = 6000;
const MAX_MS = 28 * 60 * 1000;

const last = new Map<string, string>();
const start = Date.now();

function ts() {
  return new Date().toISOString().slice(11, 19);
}

while (Date.now() - start < MAX_MS) {
  const rows = await db.meeting.findMany({
    where: { id: { in: targets.map((t) => t.id) } },
    select: { id: true, status: true, failureReason: true, durationSec: true, _count: { select: { segments: true, points: true, actionItems: true } } },
  });

  for (const target of targets) {
    const row = rows.find((r) => r.id === target.id);
    if (!row) continue;
    const key = `${row.status}|${row.failureReason ?? ""}`;
    if (last.get(target.id) === key) continue;
    last.set(target.id, key);

    const extra =
      row.status === "READY"
        ? ` (${row._count.segments} segments, ${row._count.points} points, ${row._count.actionItems} actions, ${row.durationSec ?? "?"}s)`
        : row.status === "FAILED"
          ? ` — ${row.failureReason}`
          : "";
    console.log(`[${ts()}] ${target.label}: ${row.status}${extra}`);
  }

  const allDone = targets.every((t) => {
    const key = last.get(t.id);
    return key && TERMINAL.has(key.split("|")[0]);
  });
  if (allDone) {
    console.log("Both meetings reached a terminal status.");
    break;
  }

  await new Promise((r) => setTimeout(r, POLL_MS));
}

if (Date.now() - start >= MAX_MS) {
  console.log("Timed out watching — check manually, this does not mean it failed.");
}

await db.$disconnect();
