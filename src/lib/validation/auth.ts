import { z } from "zod";

/** Mirrors `emailAndPassword.minPasswordLength` in src/lib/auth.ts. */
export const MIN_PASSWORD_LENGTH = 8;

export const signInSchema = z.object({
  email: z.string().trim().min(1, "Enter your work email.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "That name is too long."),
  email: z.string().trim().min(1, "Enter your work email.").email("Enter a valid email address."),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(128, "That password is too long."),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
