import { z } from "zod";

const email = z.string().trim().email("Enter a valid email");
const password = z.string().min(8, "At least 8 characters");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    full_name: z.string().trim().min(2, "Add your name").max(120),
    email,
    password,
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords don’t match",
    path: ["confirm_password"],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const resetRequestSchema = z.object({ email });
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;

export const updatePasswordSchema = z
  .object({
    password,
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords don’t match",
    path: ["confirm_password"],
  });
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
