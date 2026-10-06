import { AuthIllustration } from "@/components/auth-illustration";

/**
 * Signed-out shell: the form centred in the left half, the illustration in
 * the right. The right half drops below the form on phones and tablets.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-white lg:grid-cols-2">
      <main className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-85">{children}</div>
      </main>

      <aside className="flex flex-col items-center justify-center gap-8 border-t border-line-200 bg-mist-paper px-6 py-14 sm:px-12 lg:border-t-0 lg:border-l">
        <AuthIllustration className="max-w-105" />
        <p className="max-w-80 text-center font-serif text-xl leading-snug text-ink">
          &ldquo;Every claim links back to the exact second it was said.&rdquo;
        </p>
      </aside>
    </div>
  );
}
