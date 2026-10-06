import "server-only";

import { db } from "@/lib/db";
import { isDemoEmail } from "@/lib/demo-account";
import { budgetFor, checkUploadRate, type RateCheck, type UploadBudget } from "@/lib/upload-limits";

/**
 * The database half of the upload budget. The rule itself lives in
 * upload-limits.ts and is pure; this only fetches what it needs.
 *
 * Three callers share it — the upload page (to show what is left), the token
 * route (to refuse a token) and the create action (to refuse a row) — so the
 * window is computed in one place.
 */
export async function uploadQuotaFor(user: { id: string; email: string }): Promise<{
  budget: UploadBudget;
  rate: RateCheck;
}> {
  const budget = budgetFor(isDemoEmail(user.email, process.env));
  const now = new Date();

  const recent = await db.meeting.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: new Date(now.getTime() - budget.windowHours * 3600_000) },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: budget.maxUploads + 1,
  });

  return {
    budget,
    rate: checkUploadRate(
      recent.map((r) => r.createdAt),
      budget,
      now
    ),
  };
}
