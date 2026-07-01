import { useState, useRef, useEffect } from "react";
import { Pressable } from "react-native";
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
import { useSignIn } from "@/features/auth/api";
import { signInSchema } from "@/lib/validation/auth";

export const COGNITO_MESSAGES: Record<string, string> = {
  NotAuthorizedException: "That email or password isn't right.",
  UserNotConfirmedException: "Please confirm your email first — check your inbox.",
  UsernameExistsException: "An account with that email already exists.",
  CodeMismatchException: "That code isn't right — please check and try again.",
  ExpiredCodeException: "That code has expired — please request a new one.",
  LimitExceededException: "Too many attempts — please wait a few minutes and try again.",
  InvalidPasswordException: "Password does not meet the requirements.",
};

export function authMessage(err: unknown): string {
  if (err instanceof Error) {
    return COGNITO_MESSAGES[err.name] ?? err.message;
  }
  return "Something went wrong.";
}

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
  const { isAuthenticated } = useAuth();
  const isAuthRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);
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
      await waitForAuth(() => isAuthRef.current);
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
      <Field label="Email" error={errors.email}>
        <Input
          value={email}
          onChangeText={(t) => { setBanner(null); setEmail(t); }}
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
          onChangeText={(t) => { setBanner(null); setPassword(t); }}
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
