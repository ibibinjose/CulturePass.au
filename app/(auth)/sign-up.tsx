import { useState } from "react";
import { Pressable } from "react-native";
import { Link, useRouter } from "expo-router";

import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { AuthShell } from "@/features/auth/AuthShell";
import { useSignUp } from "@/features/auth/api";
import { signUpSchema } from "@/lib/validation/auth";
import { authMessage } from "./sign-in";

type FieldErrors = Partial<Record<"full_name" | "email" | "password" | "confirm_password", string>>;

export default function SignUpScreen() {
  const router = useRouter();
  const signUp = useSignUp();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setBanner(null);
    setNotice(null);
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) {
      const f = parsed.error.formErrors.fieldErrors;
      setErrors({
        full_name: f.full_name?.[0],
        email: f.email?.[0],
        password: f.password?.[0],
        confirm_password: f.confirm_password?.[0],
      });
      return;
    }
    setErrors({});
    try {
      const { needsConfirmation } = await signUp.mutateAsync(parsed.data);
      if (needsConfirmation) {
        setNotice(
          "Almost there — we’ve sent a confirmation link to your email. Confirm it, then sign in.",
        );
        return;
      }
      router.replace("/");
    } catch (err) {
      setBanner(authMessage(err));
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join CulturePass to discover and create cultural experiences across Australia."
      error={banner}
      notice={notice}
      footer={
        <Link href="/sign-in" asChild>
          <Pressable hitSlop={8}>
            <Text variant="label">
              Already have an account? <Text variant="label" tone="ochre">Sign in</Text>
            </Text>
          </Pressable>
        </Link>
      }
    >
      <Field label="Full name" error={errors.full_name}>
        <Input
          value={form.full_name}
          onChangeText={(full_name) => set({ full_name })}
          placeholder="Your name"
          autoComplete="name"
          invalid={!!errors.full_name}
        />
      </Field>
      <Field label="Email" error={errors.email}>
        <Input
          value={form.email}
          onChangeText={(email) => set({ email })}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          invalid={!!errors.email}
        />
      </Field>
      <Field label="Password" error={errors.password} helper="At least 8 characters">
        <PasswordInput
          value={form.password}
          onChangeText={(password) => set({ password })}
          placeholder="Create a password"
          autoComplete="new-password"
          invalid={!!errors.password}
        />
      </Field>
      <Field label="Confirm password" error={errors.confirm_password}>
        <PasswordInput
          value={form.confirm_password}
          onChangeText={(confirm_password) => set({ confirm_password })}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          invalid={!!errors.confirm_password}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
      </Field>
      <Button label="Create account" loading={signUp.isPending} onPress={submit} />
    </AuthShell>
  );
}
