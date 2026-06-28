import { useState } from "react";
import { Pressable } from "react-native";
import { Link, useRouter } from "expo-router";

import {
  Button,
  Field,
  PasswordInput,
  Text,
} from "@/components/ui";
import { AuthShell } from "@/features/auth/AuthShell";
import { useAuth } from "@/features/auth/AuthProvider";
import { useUpdatePassword } from "@/features/auth/api";
import { updatePasswordSchema } from "@/lib/validation/auth";
import { authMessage } from "./sign-in";

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const { isAuthenticated, isRecovering, initializing } = useAuth();
  const update = useUpdatePassword();
  const [form, setForm] = useState({ password: "", confirm_password: "" });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const [errors, setErrors] = useState<{ password?: string; confirm_password?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The recovery link establishes a session (web auto-detects it from the URL).
  const canUpdate = isAuthenticated || isRecovering;

  async function submit() {
    setBanner(null);
    const parsed = updatePasswordSchema.safeParse(form);
    if (!parsed.success) {
      const f = parsed.error.formErrors.fieldErrors;
      setErrors({ password: f.password?.[0], confirm_password: f.confirm_password?.[0] });
      return;
    }
    setErrors({});
    try {
      await update.mutateAsync(parsed.data);
      setDone(true);
    } catch (err) {
      setBanner(authMessage(err));
    }
  }

  if (done) {
    return (
      <AuthShell
        title="Password updated"
        notice="Your password has been changed. You can now continue."
        footer={null}
      >
        <Button label="Continue" onPress={() => router.replace("/")} />
      </AuthShell>
    );
  }

  if (!initializing && !canUpdate) {
    return (
      <AuthShell
        title="Reset link needed"
        subtitle="Open the password-reset link from your email on this device to set a new password."
        footer={
          <Link href="/reset-password" asChild>
            <Pressable hitSlop={8}>
              <Text variant="label" tone="pink">
                Request a new link
              </Text>
            </Pressable>
          </Link>
        }
      >
        <Link href="/sign-in" asChild>
          <Pressable hitSlop={8}>
            <Text variant="label" tone="muted">
              Back to sign in
            </Text>
          </Pressable>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" error={banner}>
      <Field label="New password" error={errors.password} helper="At least 8 characters">
        <PasswordInput
          value={form.password}
          onChangeText={(password) => set({ password })}
          placeholder="New password"
          autoComplete="new-password"
          invalid={!!errors.password}
        />
      </Field>
      <Field label="Confirm new password" error={errors.confirm_password}>
        <PasswordInput
          value={form.confirm_password}
          onChangeText={(confirm_password) => set({ confirm_password })}
          placeholder="Re-enter new password"
          autoComplete="new-password"
          invalid={!!errors.confirm_password}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
      </Field>
      <Button label="Update password" loading={update.isPending} onPress={submit} />
    </AuthShell>
  );
}
