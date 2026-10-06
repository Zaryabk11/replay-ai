import { ConstructionIcon } from "lucide-react";

/** Placeholder body for a nav section that has no feature behind it yet. */
export function ComingSoon({ note }: { note: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-line-200 bg-white px-5 py-14 text-center">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-2xl bg-mist-paper text-blue-grey"
      >
        <ConstructionIcon className="size-4.5" />
      </span>
      <div className="text-base font-semibold text-ink">Not built yet</div>
      <p className="max-w-62 text-[12.5px] leading-normal text-slate-400">{note}</p>
    </div>
  );
}
