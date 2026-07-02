import { useState } from "react";
import { Pressable } from "react-native";
import { Link, useRouter } from "expo-router";

import {
  Button,
  Field,
  Input,
  Text,
} from "@/components/ui";
import { AuthShell } from "@/features/auth/AuthShell";
import { useResetPassword } from "@/features/auth/api";
import { resetRequestSchema } from "@/lib/validation/auth";
import { authMessage } from "@/lib/aws/auth";

export default function ResetPasswordScreen() {
  const router = useRouter();
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
          : "Enter your email and we'll send you a 6-digit confirmation code."
      }
      error={banner}
      notice={
        sent
          ? "A confirmation code has been sent to your email. Enter it on the next screen to set a new password."
          : null
      }
      footer={
        <Link href="/sign-in" asChild>
          <Pressable hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>
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
              onChangeText={(t) => { setBanner(null); setEmail(t); }}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              invalid={!!error}
              onSubmitEditing={submit}
              returnKeyType="go"
            />
          </Field>
          <Button label="Send reset code" loading={reset.isPending} onPress={submit} />
        </>
      ) : (
        <>
          <Button
            label="Enter my code"
            onPress={() =>
              router.push({
                pathname: "/update-password",
                params: { email },
              })
            }
          />
          <Button label="Resend code" variant="outline" loading={reset.isPending} onPress={submit} />
        </>
      )}
    </AuthShell>
  );
}
