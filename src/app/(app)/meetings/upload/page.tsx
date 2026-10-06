import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { requireSession } from "@/lib/session";
import { uploadQuotaFor } from "@/lib/upload-quota";
import { Dropzone } from "./_components/dropzone";

export const metadata: Metadata = { title: "Upload recording · Recap" };
export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const { user } = await requireSession();
  const { budget, rate } = await uploadQuotaFor(user);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5 py-8 sm:px-7.5">
      <div className="w-full max-w-140">
        <Link
          href="/meetings"
          className="mb-1.5 inline-flex w-fit items-center gap-1 rounded-sm text-xs text-slate-400 outline-none transition-colors hover:text-slate focus-visible:shadow-focus"
        >
          <ChevronLeftIcon className="size-3.5" /> Meetings
        </Link>
        <h1 className="font-serif text-xl font-medium text-ink">Upload recording</h1>
        <p className="mt-3.5 mb-4.5 font-mono text-[11px] tracking-caps text-deep-teal-500 uppercase">
          Recording is primary evidence
        </p>
      </div>

      {rate.ok ? (
        <Dropzone budget={budget} />
      ) : (
        <div className="w-full max-w-140 rounded-xl border border-warning-border bg-warning-bg px-4 py-3.5 text-sm text-warning-text">
          {rate.message}
        </div>
      )}

      {rate.ok && (
        <p className="mt-2 text-center text-xs text-slate-400">
          {rate.remaining} of {budget.maxUploads} uploads left today.
        </p>
      )}
    </div>
  );
}
