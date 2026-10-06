"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/app/(auth)/actions";

/** Avatar, name and sign-out at the foot of the teal sidebar. */
export function UserFooter({
  name,
  email,
  isDemo,
}: {
  name: string;
  email: string;
  isDemo: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function leave() {
    startTransition(async () => {
      await signOut();
      router.replace("/sign-in");
      router.refresh();
    });
  }

  return (
    <div className="mt-auto flex items-center gap-2.25 border-t border-white/14 pt-3">
      <span
        aria-hidden
        className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xs font-medium text-white"
      >
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] text-white">{name}</div>
        <div className="truncate text-[11px] text-white/60">{isDemo ? "Demo account" : email}</div>
      </div>
      <button
        type="button"
        onClick={leave}
        disabled={pending}
        aria-label="Sign out"
        title="Sign out"
        className="rounded-md p-1.5 text-white/72 outline-none transition-colors hover:bg-white/14 hover:text-white focus-visible:shadow-focus disabled:opacity-50"
      >
        <LogOutIcon aria-hidden className="size-4" />
      </button>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
