"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signInAsDemo } from "@/app/(auth)/actions";

/**
 * Signs in to the shared demo account. The action takes no arguments — the
 * credentials are read from the server environment inside it, so nothing
 * about them reaches this component or the browser bundle.
 */
export function DemoButton({
  redirectTo = "/meetings",
  label = "Try the demo — no account",
  variant = "secondary",
  size = "lg",
  className,
  fullWidth = true,
}: {
  redirectTo?: string;
  label?: string;
  variant?: "default" | "secondary";
  size?: "sm" | "default" | "lg";
  className?: string;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function tryDemo() {
    setError(null);
    startTransition(async () => {
      const result = await signInAsDemo();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={[fullWidth ? "w-full" : "", className].filter(Boolean).join(" ")}
        loading={pending}
        onClick={tryDemo}
      >
        {pending ? "Opening the demo…" : label}
      </Button>
      {error && (
        <p role="alert" className="text-center text-xs text-error-text">
          {error}
        </p>
      )}
    </>
  );
}
