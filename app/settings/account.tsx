import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Text, Button, Card, Field, PasswordInput, Divider } from "@/components/ui";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { useAuth } from "@/features/auth/AuthProvider";
import { useUpdatePassword } from "@/features/auth/api";
import { useDeleteAccount } from "@/features/profiles/api";

export default function AccountScreen() {
  return (
    <RequireAuth>
      <Account />
    </RequireAuth>
  );
}

function Account() {
  const router = useRouter();
  const { user } = useAuth();
  const updatePassword = useUpdatePassword();
  const deleteAccount = useDeleteAccount();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwNotice, setPwNotice] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function changePassword() {
    setPwError(null);
    setPwNotice(null);
    if (password.length < 8) {
      setPwError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setPwError("Passwords don’t match.");
      return;
    }
    try {
      await updatePassword.mutateAsync({ password, confirm_password: confirm });
      setPassword("");
      setConfirm("");
      setPwNotice("Password updated.");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Couldn’t update your password.");
    }
  }

  async function confirmDelete() {
    setDeleteError(null);
    try {
      await deleteAccount.mutateAsync();
      router.replace("/");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Couldn’t delete your account. Please try again.",
      );
    }
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-10">
      <Button
        label="← Back"
        variant="ghost"
        size="sm"
        className="mb-6 self-start"
        onPress={() => router.back()}
      />

      <Text variant="overline" tone="ochre">
        Account
      </Text>
      <Text variant="title" className="mt-2">
        Account
      </Text>

      {/* Email */}
      <View className="mt-8">
        <Field label="Email">
          <Card className="bg-sand">
            <Text variant="body">{user?.email}</Text>
          </Card>
        </Field>
        <Text variant="caption" tone="faint" className="mt-2">
          Contact support to change the email on your account.
        </Text>
      </View>

      {/* Change password */}
      <Text variant="heading" className="mt-10">
        Change password
      </Text>
      <View className="mt-5 gap-5">
        <Field label="New password" error={pwError ?? undefined} helper="At least 8 characters">
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            autoComplete="new-password"
            invalid={!!pwError}
          />
        </Field>
        <Field label="Confirm new password">
          <PasswordInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter new password"
            autoComplete="new-password"
            onSubmitEditing={changePassword}
            returnKeyType="go"
          />
        </Field>
        {pwNotice ? (
          <Card className="border-eucalyptus-100 bg-eucalyptus-50">
            <Text variant="caption" className="text-eucalyptus-700">
              {pwNotice}
            </Text>
          </Card>
        ) : null}
        <Button
          label="Update password"
          variant="outline"
          loading={updatePassword.isPending}
          onPress={changePassword}
        />
      </View>

      <Divider className="my-10" />

      {/* Danger zone */}
      <Text variant="heading" className="text-danger">
        Delete account
      </Text>
      <Text variant="body" tone="muted" className="mt-2">
        Permanently delete your account, profile, and any hubs you own. This can’t be undone.
      </Text>

      {deleteError ? (
        <Card className="mt-4 border-danger/30 bg-terracotta-50">
          <Text variant="caption" className="text-terracotta-600">
            {deleteError}
          </Text>
        </Card>
      ) : null}

      {confirmingDelete ? (
        <Card className="mt-4 border-danger/30">
          <Text variant="label" className="text-base">
            Are you absolutely sure?
          </Text>
          <Text variant="caption" tone="muted" className="mt-1">
            This deletes everything tied to your account immediately.
          </Text>
          <View className="mt-4 flex-row gap-3">
            <Button
              label="Yes, delete permanently"
              variant="primary"
              className="flex-1 bg-danger active:bg-danger/90"
              loading={deleteAccount.isPending}
              onPress={confirmDelete}
            />
            <Button
              label="Cancel"
              variant="outline"
              onPress={() => setConfirmingDelete(false)}
            />
          </View>
        </Card>
      ) : (
        <Button
          label="Delete my account"
          variant="outline"
          className="mt-4 border-danger/40"
          onPress={() => setConfirmingDelete(true)}
        />
      )}
    </Screen>
  );
}
