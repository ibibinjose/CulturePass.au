import { useState, useRef, useEffect } from "react";
import { Pressable, View } from "react-native";
import { Link, useRouter } from "expo-router";

import {
  Button,
  Field,
  Input,
  PasswordInput,
  Text,
} from "@/components/ui";
import { AuthShell } from "@/features/auth/AuthShell";
import { useSignUp, useSignIn, useResendVerification, useConfirmSignUp } from "@/features/auth/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { signUpSchema } from "@/lib/validation/auth";
import { authMessage } from "@/lib/aws/auth";
import { waitForAuth } from "./sign-in";

type FieldErrors = Partial<Record<"full_name" | "email" | "password" | "confirm_password", string>>;

export default function SignUpScreen() {
  const router = useRouter();
  const signUp = useSignUp();
  const signIn = useSignIn();
  const resend = useResendVerification();
  const confirm = useConfirmSignUp();
  const { isAuthenticated } = useAuth();
  const isAuthRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

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
  const [pendingVerification, setPendingVerification] = useState<null | { email: string; password?: string }>(null);
  const [verifyCode, setVerifyCode] = useState("");

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
        setPendingVerification({ email: parsed.data.email, password: parsed.data.password });
        setNotice(
          "Almost there — we’ve sent a verification code (or link) to your email.",
        );
        return;
      }
      router.replace("/");
    } catch (err) {
      setBanner(authMessage(err));
    }
  }

  async function handleResend() {
    if (!pendingVerification) return;
    setBanner(null);
    setNotice(null);
    try {
      await resend.mutateAsync({ email: pendingVerification.email });
      setNotice("Verification email resent — check your inbox.");
    } catch (err) {
      setBanner(authMessage(err));
    }
  }

  async function handleVerify() {
    if (!pendingVerification) return;
    const code = verifyCode.trim();
    if (!code) {
      setBanner("Enter the verification code from your email.");
      return;
    }
    setBanner(null);
    setNotice(null);
    try {
      await confirm.mutateAsync({ email: pendingVerification.email, code });
      const em = pendingVerification.email;
      const pw = pendingVerification.password;
      setPendingVerification(null);
      setVerifyCode("");
      setNotice("Email verified!");
      if (pw) {
        try {
          await signIn.mutateAsync({ email: em, password: pw });
          await waitForAuth(() => isAuthRef.current);
          router.replace("/");
          return;
        } catch {
          setBanner("Email verified. Please sign in with your password.");
          setForm((f) => ({ ...f, email: em }));
        }
      } else {
        setBanner("Email verified. Sign in to continue.");
        setForm((f) => ({ ...f, email: em }));
      }
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
          <Pressable hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>
            <Text variant="label">
              Already have an account? <Text variant="label" tone="pink">Sign in</Text>
            </Text>
          </Pressable>
        </Link>
      }
    >
      {!pendingVerification ? (
        <>
          <Field label="Full name" error={errors.full_name}>
            <Input
              value={form.full_name}
              onChangeText={(full_name) => { setBanner(null); setNotice(null); set({ full_name }); }}
              placeholder="Your name"
              autoComplete="name"
              invalid={!!errors.full_name}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input
              value={form.email}
              onChangeText={(email) => { setBanner(null); setNotice(null); setPendingVerification(null); set({ email }); }}
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
              onChangeText={(password) => { setBanner(null); setNotice(null); set({ password }); }}
              placeholder="Create a password"
              autoComplete="new-password"
              invalid={!!errors.password}
            />
          </Field>
          <Field label="Confirm password" error={errors.confirm_password}>
            <PasswordInput
              value={form.confirm_password}
              onChangeText={(confirm_password) => { setBanner(null); setNotice(null); set({ confirm_password }); }}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              invalid={!!errors.confirm_password}
              onSubmitEditing={submit}
              returnKeyType="go"
            />
          </Field>
          <Button label="Create account" loading={signUp.isPending} onPress={submit} />
        </>
      ) : (
        <>
          <Text className="mb-1 text-center">
            Verify <Text tone="pink">{pendingVerification.email}</Text>
          </Text>
          <Text variant="caption" className="mb-4 text-center">
            Enter the code from the email, or click the link if provided.
          </Text>
          <Field label="Verification code" helper="6-digit code or use the email link">
            <Input
              value={verifyCode}
              onChangeText={(t) => { setBanner(null); setNotice(null); setVerifyCode(t); }}
              placeholder="123456"
              keyboardType="number-pad"
              autoComplete="one-time-code"
            />
          </Field>
          <View className="flex-row gap-3">
            <Button label="Verify & continue" loading={confirm.isPending} onPress={handleVerify} />
            <Button label="Resend verification email" variant="outline" loading={resend.isPending} onPress={handleResend} />
          </View>
          <Pressable
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => {
              setPendingVerification(null);
              setVerifyCode("");
              setBanner(null);
              setNotice(null);
            }}
            className="mt-3 items-center"
          >
            <Text variant="label" tone="muted">Back to sign-up form</Text>
          </Pressable>
        </>
      )}
    </AuthShell>
  );
}
