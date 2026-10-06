import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getSession } from "@/lib/session";
import { SignUpForm } from "../_components/sign-up-form";

export const metadata: Metadata = {
  title: "Create account · Recap",
  description: "Get cited recaps of your own meetings.",
};

export default async function SignUpPage() {
  if (await getSession()) redirect("/meetings");

  return (
    <div className="flex flex-col gap-5.5">
      <Brand size="md" href="/" />

      <div>
        <h1 className="font-serif text-[28px] leading-tight font-medium text-ink">
          Create your account
        </h1>
        <p className="mt-1.5 text-base text-slate">Get cited recaps of your own meetings.</p>
      </div>

      <SignUpForm />

      <p className="text-sm text-slate">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="rounded-sm font-medium text-deep-teal-500 outline-none hover:text-deep-teal-600 focus-visible:shadow-focus"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
