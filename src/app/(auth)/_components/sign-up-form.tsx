"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { MIN_PASSWORD_LENGTH, signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { signUp } from "../actions";
import { AuthField } from "./auth-field";
import { FormError } from "./form-error";

export function SignUpForm({ redirectTo = "/meetings" }: { redirectTo?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await signUp(values);
    if (!result.ok) {
      if (result.field === "name" || result.field === "email" || result.field === "password") {
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
        id="name"
        label="Name"
        autoComplete="name"
        placeholder="Sarah Kim"
        error={errors.name?.message}
        {...register("name")}
      />
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
        autoComplete="new-password"
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
