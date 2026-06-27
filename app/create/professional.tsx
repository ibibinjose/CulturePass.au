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
import { OptionCard } from "@/components/ui/OptionCard";
import { SocialLinksField } from "@/components/ui/SocialLinksField";
import {
  PROFESSIONAL_CATEGORIES,
  PROFESSIONAL_CATEGORY_LABELS,
  type ProfessionalCategory,
} from "@/lib/constants";
import { professionalProfileSchema } from "@/lib/validation/profile";
import { pruneLinks } from "@/lib/social";
import { useMyProfile, useUpdateMyProfile } from "@/features/profiles/api";

export default function CreateProfessionalProfile() {
  const router = useRouter();
  const { data: profile } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const [banner, setBanner] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    professional_category: undefined as ProfessionalCategory | undefined,
    professional_title: "",
    public_bio: "",
    location: "",
    links: {} as Record<string, string>,
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  // Pre-generate the public profile from the member's existing profile so they
  // only have to confirm/extend it. Seeds once, after the profile loads.
  useEffect(() => {
    if (!profile || prefilled) return;
    const links = (profile.public_links ?? {}) as Record<string, string>;
    setForm({
      full_name: profile.full_name ?? "",
      professional_category:
        (profile.professional_category as ProfessionalCategory | null) ?? undefined,
      professional_title: profile.professional_title ?? "",
      public_bio: profile.public_bio || profile.bio || "",
      location: profile.location ?? "",
      links: { ...links },
    });
    setPrefilled(true);
  }, [profile, prefilled]);

  async function submit() {
    setBanner(null);
    const parsed = professionalProfileSchema.safeParse({
      is_public_professional: true,
      full_name: form.full_name,
      professional_category: form.professional_category,
      professional_title: form.professional_title,
      public_bio: form.public_bio || undefined,
      location: form.location || undefined,
      public_links: pruneLinks(form.links),
    });
    if (!parsed.success) {
      setBanner(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    try {
      await updateProfile.mutateAsync({
        full_name: parsed.data.full_name,
        is_public_professional: true,
        professional_category: parsed.data.professional_category,
        professional_title: parsed.data.professional_title,
        public_bio: parsed.data.public_bio ?? null,
        location: parsed.data.location ?? null,
        public_links: parsed.data.public_links,
      });
      if (profile) router.replace(`/profile/${profile.id}`);
      else router.replace("/");
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton className="mb-5" />

      <Text variant="overline" tone="pink">
        Professional Public Profile
      </Text>
      <Text variant="title" className="mt-2">
        Set up your public profile
      </Text>
      <Text variant="lead" className="mt-3">
        We’ve pre-filled this from your profile — review and add your social
        handles below.
      </Text>

      <View className="mt-8 gap-6">
        <Field label="Full name">
          <Input
            value={form.full_name}
            onChangeText={(full_name) => set({ full_name })}
            placeholder="Your name"
          />
        </Field>

        <Field label="Category">
          <View className="gap-3">
            {PROFESSIONAL_CATEGORIES.map((cat) => (
              <OptionCard
                key={cat}
                title={PROFESSIONAL_CATEGORY_LABELS[cat]}
                selected={form.professional_category === cat}
                onPress={() => set({ professional_category: cat })}
              />
            ))}
          </View>
        </Field>

        <Field label="Title">
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
            placeholder="Tell people about your work…"
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

        <View>
          <Text variant="overline" tone="pink" className="mb-3">
            Links & social
          </Text>
          <SocialLinksField value={form.links} onChange={(links) => set({ links })} />
        </View>

        {banner ? (
          <Card className="border-danger/30 bg-terracotta-50">
            <Text variant="caption" className="text-terracotta-600">
              {banner}
            </Text>
          </Card>
        ) : null}

        <Button
          label="Publish profile"
          loading={updateProfile.isPending}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}
