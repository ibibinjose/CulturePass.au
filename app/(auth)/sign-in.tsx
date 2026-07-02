import { useState, useRef, useEffect } from "react";
import { Pressable, View } from "react-native";
import { Link, useRouter } from "expo-router";

import { useAuth } from "@/features/auth/AuthProvider";

import {
  Button,
  Field,
  Input,
  PasswordInput,
  Text,
} from "@/components/ui";
import { AuthShell } from "@/features/auth/AuthShell";
import { useSignIn, useResendVerification, useConfirmSignUp } from "@/features/auth/api";
import { signInSchema } from "@/lib/validation/auth";
import { authMessage } from "@/lib/aws/auth";

/** Poll until isAuthenticated is true or the timeout elapses. */
export async function waitForAuth(
  isAuthenticated: () => boolean,
  timeoutMs = 3000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const check = () => {
      if (isAuthenticated() || Date.now() >= deadline) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

export default function SignInScreen() {
  const router = useRouter();
  const signIn = useSignIn();
  const resend = useResendVerification();
  const confirm = useConfirmSignUp();
  const { isAuthenticated } = useAuth();
  const isAuthRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState<null | { email: string; password?: string }>(null);
  const [verifyCode, setVerifyCode] = useState("");

  // Already signed in (deep link, back button, stale tab) → straight home.
  useEffect(() => {
    if (isAuthenticated) router.replace("/");
  }, [isAuthenticated, router]);

  async function submit() {
    setBanner(null);
    setNotice(null);
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
      await waitForAuth(() => isAuthRef.current);
      router.replace("/");
    } catch (err) {
      // A lingering session isn't a failure — recover by continuing home.
      if (err instanceof Error && err.name === "UserAlreadyAuthenticatedException") {
        router.replace("/");
        return;
      }
      if (err instanceof Error && err.name === "UserNotConfirmedException") {
        setPendingVerification({ email: parsed.data.email, password: parsed.data.password });
        setNotice("Check your inbox for the verification code or link. After verifying, we’ll help you complete onboarding and your profile.");
        return;
      }
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
          // User just verified (often new accounts): recommend/complete onboarding + profile
          router.replace("/onboarding");
          return;
        } catch {
          setBanner("Email verified. Please enter your password to sign in.");
          setEmail(em);
          setPassword("");
        }
      } else {
        setBanner("Email verified. You can sign in now.");
        setEmail(em);
      }
    } catch (err) {
      setBanner(authMessage(err));
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to create hubs, RSVP and connect with community."
      error={banner}
      notice={notice}
      footer={
        <>
          <Link href="/reset-password" asChild>
            <Pressable hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>
              <Text variant="label" tone="muted">
                Forgot your password?
              </Text>
            </Pressable>
          </Link>
          <Link href="/sign-up" asChild>
            <Pressable hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>
              <Text variant="label">
                New here? <Text variant="label" tone="pink">Create an account</Text>
              </Text>
            </Pressable>
          </Link>
        </>
      }
    >
      {pendingVerification ? (
        <>
          <Text className="mb-1">
            <Text variant="label">Email:</Text> <Text tone="pink">{pendingVerification.email}</Text>
          </Text>
          <Text variant="caption" className="mb-4">
            Enter the verification code, or click the link in the email.
          </Text>
          <Field label="Verification code">
            <Input
              value={verifyCode}
              onChangeText={(t) => { setBanner(null); setNotice(null); setVerifyCode(t); }}
              placeholder="123456"
              keyboardType="number-pad"
              autoComplete="one-time-code"
            />
          </Field>
          <View className="flex-row gap-3">
            <Button label="Verify & sign in" loading={confirm.isPending} onPress={handleVerify} />
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
            className="mt-2"
          >
            <Text variant="label" tone="muted">Back to sign-in</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Field label="Email" error={errors.email}>
            <Input
              value={email}
              onChangeText={(t) => { setBanner(null); setNotice(null); setPendingVerification(null); setEmail(t); }}
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
              onChangeText={(t) => { setBanner(null); setNotice(null); setPendingVerification(null); setPassword(t); }}
              placeholder="Your password"
              invalid={!!errors.password}
              onSubmitEditing={submit}
              returnKeyType="go"
            />
          </Field>
          <Button label="Sign in" loading={signIn.isPending} onPress={submit} />
        </>
      )}
    </AuthShell>
  );
}
