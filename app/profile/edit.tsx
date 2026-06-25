import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { TagInput } from "@/components/ui/TagInput";
import { ImagePickerComponent } from "@/components/ui/ImagePicker";
import { Toggle } from "@/components/ui/Toggle";
import { useMyProfile, useUpdateMyProfile } from "@/features/profiles/api";
import { profileSchema } from "@/lib/validation/profile";
import { PROFESSIONAL_CATEGORIES, PROFESSIONAL_CATEGORY_LABELS } from "@/lib/constants";

export default function EditProfileScreen() {
  const router = useRouter();
  const { data: profile } = useMyProfile();
  const updateMyProfile = useUpdateMyProfile();
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    avatar_url: profile?.avatar_url || null,
    bio: profile?.bio || "",
    location: profile?.location || "",
    coordinates: profile?.coordinates || "",
    interests: profile?.interests || [],
    cultural_background: profile?.cultural_background || "",
    indigenous_connection: profile?.indigenous_connection || "",
    preferred_languages: profile?.preferred_languages || [],
    is_public_professional: profile?.is_public_professional || false,
    professional_category: profile?.professional_category || null,
    professional_title: profile?.professional_title || "",
    public_bio: profile?.public_bio || "",
    public_links: profile?.public_links || [],
    email: "", // This would come from auth context
    phone: "",
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    setBanner(null);
    const parsed = profileSchema.safeParse({ 
      full_name: form.full_name,
      avatar_url: form.avatar_url,
      bio: form.bio,
      location: form.location,
      interests: form.interests,
      cultural_background: form.cultural_background,
      indigenous_connection: form.indigenous_connection,
      preferred_languages: form.preferred_languages,
    });
    
    if (!parsed.success) {
      setBanner(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setSubmitting(true);
    try {
      await updateMyProfile.mutateAsync({
        full_name: form.full_name,
        avatar_url: form.avatar_url,
        bio: form.bio,
        location: form.location,
        coordinates: form.coordinates,
        interests: form.interests,
        cultural_background: form.cultural_background,
        indigenous_connection: form.indigenous_connection,
        preferred_languages: form.preferred_languages,
        is_public_professional: form.is_public_professional,
        professional_category: form.professional_category as "artist" | "politician" | "founder" | "creative" | "community_leader" | "cultural_leader" | "wellness_practitioner" | "educator" | "other" | null,
        professional_title: form.professional_title,
        public_bio: form.public_bio,
        public_links: form.public_links,
      });
      router.back();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (updateMyProfile.isPending) {
    return (
      <Screen>
        <Text>Loading...</Text>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen maxWidth="form" contentClassName="pt-10">
        <Button
          label="← Back"
          variant="ghost"
          size="sm"
          className="mb-6 self-start"
          onPress={() => router.back()}
        />
        <Text variant="title" className="mt-6">
          Sign in required
        </Text>
        <Text variant="body" tone="muted" className="mt-2">
          You need to sign in to edit your profile.
        </Text>
        <Button
          label="Sign in"
          className="mt-6 self-start"
          onPress={() => router.push("/(auth)/sign-in")}
        />
      </Screen>
    );
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
        Profile
      </Text>
      <Text variant="title" className="mt-2">
        Edit your profile
      </Text>
      <Text variant="body" tone="muted" className="mt-3">
        Update your personal information and privacy settings.
      </Text>

      <View className="mt-8 gap-6">
        <Field label="Avatar">
          <ImagePickerComponent
            currentImageUrl={form.avatar_url || null}
            onImageChange={(url) => set({ avatar_url: url })}
            imageType="avatar"
            folderPath="avatars"
            label="Upload Avatar"
            helperText="Add a profile picture"
          />
        </Field>

        <View className="flex-row gap-3">
          <Field label="First name" className="flex-1">
            <Input
              value={form.first_name}
              onChangeText={(first_name) => set({ first_name })}
              placeholder="Given name"
            />
          </Field>
          <Field label="Last name" className="flex-1">
            <Input
              value={form.last_name}
              onChangeText={(last_name) => set({ last_name })}
              placeholder="Family name"
            />
          </Field>
        </View>

        <Field label="Bio" optional>
          <Input
            value={form.bio}
            onChangeText={(bio) => set({ bio })}
            placeholder="Tell others about yourself…"
            multiline
          />
        </Field>

        <Field label="Professional category" optional>
          <View className="gap-2">
            {PROFESSIONAL_CATEGORIES.map((category) => (
              <Toggle
                key={category}
                label={PROFESSIONAL_CATEGORY_LABELS[category]}
                enabled={form.professional_category === category}
                onToggle={(enabled) =>
                  set({ professional_category: enabled ? category : "" })
                }
              />
            ))}
          </View>
        </Field>

        <Field label="Public profile URL" optional>
          <Input
            value={form.public_url}
            onChangeText={(public_url) => set({ public_url })}
            placeholder="your-custom-url"
            autoCapitalize="none"
          />
        </Field>

        {form.professional_category && (
          <>
            <Field label="Professional Title" optional>
              <Input
                value={form.professional_title}
                onChangeText={(professional_title) => set({ professional_title })}
                placeholder="Your professional title"
              />
            </Field>

            <Field label="Public Bio" optional>
              <Input
                value={form.public_bio}
                onChangeText={(public_bio) => set({ public_bio })}
                placeholder="Public-facing bio..."
                multiline
              />
            </Field>

            <Field label="Public Links" optional>
              <TagInput
                value={Array.isArray(form.public_links) ? form.public_links : []}
                onChange={(public_links) => set({ public_links })}
                placeholder="Add links to your work"
              />
            </Field>

            <Card className="p-4 gap-4">
              <Text variant="subheading">Professional Visibility</Text>
              <Toggle
                label="Make profile public"
                enabled={form.is_public_professional}
                onToggle={(is_public_professional) => set({ is_public_professional })}
              />
            </Card>
          </>
        )}

        {banner ? (
          <Card className="mt-6 border-danger/30 bg-terracotta-50">
            <Text variant="caption" className="text-terracotta-600">
              {banner}
            </Text>
          </Card>
        ) : null}

        <Button
          label="Save changes"
          loading={submitting}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}