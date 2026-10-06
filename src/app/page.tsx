import type { Metadata } from "next";
import Link from "next/link";
import { AuthIllustration } from "@/components/auth-illustration";
import { Brand } from "@/components/brand";
import { DemoButton } from "@/components/demo-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Recap — every meeting, cited back to the moment it happened",
  description:
    "Upload a recording. Recap returns a cited transcript, a cited summary, and triaged action items — each one linked to the exact timestamp in the recording.",
};

/** Copy describes only what ships. Nothing here promises a feature we lack. */
const steps = [
  { n: "01", title: "Upload", body: "Drop a recording. MP4, MOV, MP3, WAV." },
  { n: "02", title: "Cited transcript", body: "Speaker-separated, every line timestamped." },
  { n: "03", title: "Cited summary", body: "Each takeaway links to its source moment." },
  { n: "04", title: "Action triage", body: "Accept, edit, or dismiss proposed actions." },
];

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="flex items-center justify-between gap-4 border-b border-line-200 px-5 py-4 sm:px-7">
        <Brand size="md" href="/" />
        {session ? (
          <Button size="sm" render={<Link href="/meetings" />}>
            Go to your library
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/sign-in" />}>
              Sign in
            </Button>
            <DemoButton label="Try the demo" variant="default" size="sm" fullWidth={false} />
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-col items-center gap-5 px-5 py-14 text-center sm:px-12 sm:py-16">
          <Badge variant="label">AI meeting reviewer</Badge>
          <h1 className="max-w-155 font-serif text-4xl leading-[1.05] font-medium tracking-tight text-ink">
            Every meeting, cited back to the moment it happened.
          </h1>
          <p className="max-w-135 text-base leading-relaxed text-slate">
            Upload a recording. Recap returns a cited transcript, a cited summary, and triaged
            action items — each one linked to the exact timestamp in the recording.
          </p>
          <div className="mt-1 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {session ? (
              <Button size="lg" render={<Link href="/meetings" />}>
                Go to your library
              </Button>
            ) : (
              <>
                <DemoButton label="Try the demo" variant="default" fullWidth={false} />
                <Button variant="secondary" size="lg" render={<Link href="/sign-in" />}>
                  Sign in
                </Button>
              </>
            )}
          </div>
          {/* Not in the design file's homepage mock, which is a short browser
              frame. At real viewport heights the page needed something between
              the hero and the steps, and this is the claim in one picture. */}
          <AuthIllustration className="mt-6 max-w-110" />
        </section>

        <section
          aria-label="How Recap works"
          className="grid grid-cols-1 gap-px border-t border-line-200 bg-line-200 sm:grid-cols-2 lg:grid-cols-4"
        >
          {steps.map((step) => (
            <div key={step.n} className="bg-white px-6 py-6.5">
              <div className="mb-2 font-mono text-[11px] text-deep-teal-500">{step.n}</div>
              <div className="mb-1.25 text-base font-semibold text-ink">{step.title}</div>
              <p className="text-[12.5px] leading-normal text-slate">{step.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line-200 px-5 py-5 font-mono text-[11px] text-slate-400 sm:px-7">
        <span>RECAP · AI MEETING REVIEWER</span>
        <Link
          href="/design"
          className="rounded-sm outline-none hover:text-slate focus-visible:shadow-focus"
        >
          Design system
        </Link>
      </footer>
    </div>
  );
}
