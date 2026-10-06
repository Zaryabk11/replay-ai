"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";
import { signIn } from "../actions";
import { AuthField } from "./auth-field";
import { FormError } from "./form-error";

export function SignInForm({ redirectTo = "/meetings" }: { redirectTo?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await signIn(values);
    if (!result.ok) {
      if (result.field === "email" || result.field === "password") {
        setError(result.field, { message: result.message });
      } else {
        setFormError(result.message);
      }
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
      <FormError>{formError}</FormError>
      <AuthField
        id="email"
        label="Work email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <AuthField
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
