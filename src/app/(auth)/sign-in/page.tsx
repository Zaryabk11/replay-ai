import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getSession } from "@/lib/session";
import { SignInForm } from "../_components/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in · Recap",
  description: "Review your cited meetings.",
};

export default async function SignInPage() {
  if (await getSession()) redirect("/meetings");

  return (
    <div className="flex flex-col gap-5.5">
      <Brand size="md" href="/" />

      <div>
        <h1 className="font-serif text-[28px] leading-tight font-medium text-ink">Sign in</h1>
        <p className="mt-1.5 text-base text-slate">Review your cited meetings.</p>
      </div>

      <SignInForm />

      <p className="text-sm text-slate">
        No account?{" "}
        <Link
          href="/sign-up"
          className="rounded-sm font-medium text-deep-teal-500 outline-none hover:text-deep-teal-600 focus-visible:shadow-focus"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
