import { useState } from "react";
import { Pressable } from "react-native";
import { Link, useRouter } from "expo-router";

import {
  Button,
  Field,
  Input,
  PasswordInput,
  Text,
} from "@/components/ui";
import { AuthShell } from "@/features/auth/AuthShell";
import { useSignIn } from "@/features/auth/api";
import { signInSchema } from "@/lib/validation/auth";

export default function SignInScreen() {
  const router = useRouter();
  const signIn = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);

  async function submit() {
    setBanner(null);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors({
        email: parsed.error.formErrors.fieldErrors.email?.[0],
        password: parsed.error.formErrors.fieldErrors.password?.[0],
      });
      return;
    }
    setErrors({});
    try {
      await signIn.mutateAsync(parsed.data);
      router.replace("/");
    } catch (err) {
      setBanner(authMessage(err));
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to create hubs, RSVP and connect with community."
      error={banner}
      footer={
        <>
          <Link href="/reset-password" asChild>
            <Pressable hitSlop={8}>
              <Text variant="label" tone="muted">
                Forgot your password?
              </Text>
            </Pressable>
          </Link>
          <Link href="/sign-up" asChild>
            <Pressable hitSlop={8}>
              <Text variant="label">
                New here? <Text variant="label" tone="pink">Create an account</Text>
              </Text>
            </Pressable>
          </Link>
        </>
      }
    >
      <Field label="Email" error={errors.email}>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          invalid={!!errors.email}
          onSubmitEditing={submit}
          returnKeyType="next"
        />
      </Field>
      <Field label="Password" error={errors.password}>
        <PasswordInput
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          invalid={!!errors.password}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
      </Field>
      <Button label="Sign in" loading={signIn.isPending} onPress={submit} />
    </AuthShell>
  );
}

export function authMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Something went wrong.";
  if (/invalid login credentials/i.test(msg)) return "That email or password isn’t right.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox.";
  return msg;
}
