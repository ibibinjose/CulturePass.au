import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { TagInput } from "@/components/ui/TagInput";
import { ImagePickerComponent } from "@/components/ui/ImagePicker";
import { SocialLinksField } from "@/components/ui/SocialLinksField";
import { Toggle } from "@/components/ui/Toggle";
import { useMyProfile, useUpdateMyProfile } from "@/features/profiles/api";
import { profileSchema } from "@/lib/validation/profile";
import { pruneLinks } from "@/lib/social";
import {
  PROFESSIONAL_CATEGORIES,
  PROFESSIONAL_CATEGORY_LABELS,
  type ProfessionalCategory,
} from "@/lib/constants";

type ProfileForm = {
  full_name: string;
  avatar_url: string | null;
  bio: string;
  location: string;
  interests: string[];
  cultural_background: string;
  indigenous_connection: string;
  preferred_languages: string[];
  is_public_professional: boolean;
  professional_category: ProfessionalCategory | null;
  professional_title: string;
  public_bio: string;
  links: Record<string, string>;
};

const EMPTY_FORM: ProfileForm = {
  full_name: "",
  avatar_url: null,
  bio: "",
  location: "",
  interests: [],
  cultural_background: "",
  indigenous_connection: "",
  preferred_languages: [],
  is_public_professional: false,
  professional_category: null,
  professional_title: "",
  public_bio: "",
  links: {},
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useMyProfile();
  const updateMyProfile = useUpdateMyProfile();
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);

  // Sync the form once the profile loads (useState only seeds on first mount).
  useEffect(() => {
    if (!profile) return;
    const links = (profile.public_links ?? {}) as Record<string, string>;
    setForm({
      full_name: profile.full_name || "",
      avatar_url: profile.avatar_url ?? null,
      bio: profile.bio || "",
      location: profile.location || "",
      interests: profile.interests ?? [],
      cultural_background: profile.cultural_background || "",
      indigenous_connection: profile.indigenous_connection || "",
      preferred_languages: profile.preferred_languages ?? [],
      is_public_professional: profile.is_public_professional ?? false,
      professional_category: profile.professional_category ?? null,
      professional_title: profile.professional_title || "",
      public_bio: profile.public_bio || "",
      links: { ...links },
    });
  }, [profile]);

  const set = (patch: Partial<ProfileForm>) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    setBanner(null);
    const parsed = profileSchema.safeParse({
      full_name: form.full_name,
      avatar_url: form.avatar_url ?? undefined,
      bio: form.bio || undefined,
      location: form.location || undefined,
      interests: form.interests,
      cultural_background: form.cultural_background || undefined,
      indigenous_connection: form.indigenous_connection || undefined,
      preferred_languages: form.preferred_languages,
    });

    if (!parsed.success) {
      setBanner(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    // A public professional must declare a category (mirrors the DB CHECK).
    if (form.is_public_professional && !form.professional_category) {
      setBanner("Choose a professional category to make your profile public.");
      return;
    }

    const publicLinks = pruneLinks(form.links);

    setSubmitting(true);
    try {
      await updateMyProfile.mutateAsync({
        full_name: form.full_name.trim(),
        avatar_url: form.avatar_url,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
        interests: form.interests,
        cultural_background: form.cultural_background.trim() || null,
        indigenous_connection: form.indigenous_connection.trim() || null,
        preferred_languages: form.preferred_languages,
        is_public_professional: form.is_public_professional,
        professional_category: form.professional_category,
        professional_title: form.professional_title.trim() || null,
        public_bio: form.public_bio.trim() || null,
        public_links: publicLinks,
      });
      router.back();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Screen maxWidth="form" contentClassName="pt-10">
        <Text variant="caption" tone="faint">
          Loading…
        </Text>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen maxWidth="form" contentClassName="pt-6">
        <BackButton className="mb-4" />
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
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton className="mb-5" />

      <Text variant="overline" tone="pink">
        Profile
      </Text>
      <Text variant="title" className="mt-2">
        Edit your profile
      </Text>
      <Text variant="lead" className="mt-3">
        Update your personal information and privacy settings.
      </Text>

      <View className="mt-8 gap-6">
        <Field label="Avatar">
          <ImagePickerComponent
            currentImageUrl={form.avatar_url}
            onImageChange={(url) => set({ avatar_url: url })}
            imageType="avatar"
            folderPath="avatars"
            label="Upload Avatar"
            helperText="Add a profile picture"
          />
        </Field>

        <Field label="Full name">
          <Input
            value={form.full_name}
            onChangeText={(full_name) => set({ full_name })}
            placeholder="Your name"
          />
        </Field>

        <Field label="Bio" optional>
          <Input
            value={form.bio}
            onChangeText={(bio) => set({ bio })}
            placeholder="Tell others about yourself…"
            multiline
          />
        </Field>

        <Field label="Location" optional>
          <Input
            value={form.location}
            onChangeText={(location) => set({ location })}
            placeholder="e.g. Naarm / Melbourne"
          />
        </Field>

        <Field label="Interests" optional>
          <TagInput
            value={form.interests}
            onChange={(interests) => set({ interests })}
            placeholder="Add an interest"
          />
        </Field>

        <Field label="Cultural background" optional>
          <Input
            value={form.cultural_background}
            onChangeText={(cultural_background) => set({ cultural_background })}
            placeholder="Share your cultural background…"
          />
        </Field>

        <Field label="Connection to Country / community" optional>
          <Input
            value={form.indigenous_connection}
            onChangeText={(indigenous_connection) => set({ indigenous_connection })}
            placeholder="e.g. Wiradjuri, or a community connection…"
          />
        </Field>

        <Field label="Languages spoken" optional>
          <TagInput
            value={form.preferred_languages}
            onChange={(preferred_languages) => set({ preferred_languages })}
            placeholder="Add a language"
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
                  set({
                    professional_category: enabled ? category : null,
                    // Dropping the category also unpublishes the public profile.
                    is_public_professional: enabled ? form.is_public_professional : false,
                  })
                }
              />
            ))}
          </View>
        </Field>

        {form.professional_category ? (
          <>
            <Field label="Professional title" optional>
              <Input
                value={form.professional_title}
                onChangeText={(professional_title) => set({ professional_title })}
                placeholder='e.g. "Wiradjuri Artist" or "Founder of …"'
              />
            </Field>

            <Field label="Public bio" optional>
              <Input
                value={form.public_bio}
                onChangeText={(public_bio) => set({ public_bio })}
                placeholder="Public-facing bio…"
                multiline
              />
            </Field>

            <Field label="Links & social" optional>
              <SocialLinksField
                value={form.links}
                onChange={(links) => set({ links })}
              />
            </Field>

            <Card className="gap-4 p-4">
              <Text variant="subheading">Professional visibility</Text>
              <Text variant="caption" tone="muted">
                Public profiles are discoverable by everyone, including signed-out
                visitors.
              </Text>
              <Toggle
                label="Make profile public"
                enabled={form.is_public_professional}
                onToggle={(is_public_professional) => set({ is_public_professional })}
              />
            </Card>
          </>
        ) : null}

        {banner ? (
          <Card className="border-danger/30 bg-terracotta-50">
            <Text variant="caption" className="text-terracotta-600">
              {banner}
            </Text>
          </Card>
        ) : null}

        <Button label="Save changes" loading={submitting} onPress={submit} />
      </View>
    </Screen>
  );
}
