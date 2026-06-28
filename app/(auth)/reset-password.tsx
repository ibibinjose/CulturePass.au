import { useState } from "react";
import { Pressable } from "react-native";
import { Link } from "expo-router";

import {
  Button,
  Field,
  Input,
  Text,
} from "@/components/ui";
import { AuthShell } from "@/features/auth/AuthShell";
import { useResetPassword } from "@/features/auth/api";
import { resetRequestSchema } from "@/lib/validation/auth";
import { authMessage } from "./sign-in";

export default function ResetPasswordScreen() {
  const reset = useResetPassword();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setBanner(null);
    const parsed = resetRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.formErrors.fieldErrors.email?.[0]);
      return;
    }
    setError(undefined);
    try {
      await reset.mutateAsync(parsed.data);
      setSent(true);
    } catch (err) {
      setBanner(authMessage(err));
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        sent
          ? undefined
          : "Enter your email and we’ll send you a link to set a new password."
      }
      error={banner}
      notice={
        sent
          ? "If an account exists for that email, a reset link is on its way. Open it on this device to continue."
          : null
      }
      footer={
        <Link href="/sign-in" asChild>
          <Pressable hitSlop={8}>
            <Text variant="label" tone="muted">
              Back to sign in
            </Text>
          </Pressable>
        </Link>
      }
    >
      {!sent ? (
        <>
          <Field label="Email" error={error}>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              invalid={!!error}
              onSubmitEditing={submit}
              returnKeyType="go"
            />
          </Field>
          <Button label="Send reset link" loading={reset.isPending} onPress={submit} />
        </>
      ) : (
        <Button label="Resend link" variant="outline" loading={reset.isPending} onPress={submit} />
      )}
    </AuthShell>
  );
}
