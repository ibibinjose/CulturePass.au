import { useState } from "react";
import { Pressable } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { confirmResetPassword } from "aws-amplify/auth";

import {
  Button,
  Field,
  Input,
  PasswordInput,
  Text,
} from "@/components/ui";
import { AuthShell } from "@/features/auth/AuthShell";
import { useUpdatePassword } from "@/features/auth/api";
import { updatePasswordSchema } from "@/lib/validation/auth";
import { authMessage } from "./sign-in";

export default function UpdatePasswordScreen() {
  // Cognito reset: email + code + new password (code arrives by email, not a link)
  const params = useLocalSearchParams<{ email?: string }>();
  const update = useUpdatePassword();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [form, setForm] = useState({ password: "", confirm_password: "" });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const [errors, setErrors] = useState<{
    email?: string;
    code?: string;
    password?: string;
    confirm_password?: string;
  }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setBanner(null);
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Email is required";
    if (!code.trim()) newErrors.code = "Confirmation code is required";
    const parsed = updatePasswordSchema.safeParse(form);
    if (!parsed.success) {
      const f = parsed.error.formErrors.fieldErrors;
      newErrors.password = f.password?.[0];
      newErrors.confirm_password = f.confirm_password?.[0];
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    try {
      await confirmResetPassword({
        username: email.trim(),
        confirmationCode: code.trim(),
        newPassword: form.password,
      });
      setDone(true);
    } catch (err) {
      setBanner(authMessage(err));
    }
  }

  if (done) {
    return (
      <AuthShell
        title="Password updated"
        notice="Your password has been changed. Sign in with your new password."
        footer={null}
      >
        <Link href="/sign-in" asChild>
          <Pressable hitSlop={8}>
            <Button label="Sign in" />
          </Pressable>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Enter the confirmation code we emailed you, then choose a new password."
      error={banner}
      footer={
        <Link href="/reset-password" asChild>
          <Pressable hitSlop={8}>
            <Text variant="label" tone="pink">
              Resend code
            </Text>
          </Pressable>
        </Link>
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
        />
      </Field>
      <Field label="Confirmation code" error={errors.code} helper="Check your email for the 6-digit code">
        <Input
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          invalid={!!errors.code}
        />
      </Field>
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

