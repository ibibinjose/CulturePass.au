import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Text, Button, Icon, BrandLockup, LocationPicker, ANYWHERE, type LocationValue } from "@/components/ui";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { useMyProfile, useUpdateMyProfile } from "@/features/profiles/api";
import { parsePreferences } from "@/lib/validation/profile";
import { INTEREST_OPTIONS } from "@/lib/constants";

export default function OnboardingScreen() {
  return (
    <RequireAuth>
      <Onboarding />
    </RequireAuth>
  );
}

function Onboarding() {
  const router = useRouter();
  const { data: profile } = useMyProfile();
  const update = useUpdateMyProfile();
  const [selected, setSelected] = useState<string[]>(profile?.interests ?? []);
  const [location, setLocation] = useState<LocationValue>(ANYWHERE);
  const [banner, setBanner] = useState<string | null>(null);

  const toggle = (interest: string) =>
    setSelected((cur) =>
      cur.includes(interest) ? cur.filter((i) => i !== interest) : [...cur, interest],
    );

  async function finish(skip: boolean) {
    setBanner(null);
    const prefs = parsePreferences(profile?.preferences);
    const savedLocation =
      !skip && location.state
        ? { state: location.state, councilId: location.councilId ?? null, label: location.label }
        : prefs.location;
    try {
      await update.mutateAsync({
        interests: skip ? (profile?.interests ?? []) : selected,
        ...(!skip && location.state && location.label !== "Anywhere"
          ? { location: location.label }
          : {}),
        preferences: { ...prefs, onboarding: { completed: true }, location: savedLocation },
      });
      router.replace("/");
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Couldn’t save. Please try again.");
    }
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-section">
      <BrandLockup className="mb-6" />

      <Text variant="overline" tone="pink">
        Welcome
      </Text>
      <Text variant="display" className="mt-2">
        What are you into?
      </Text>
      <Text variant="lead" className="mt-3">
        Pick a few interests and we’ll tune your Discover feed. You can change these any time.
      </Text>

      {/* Interests */}
      <View className="mt-8 flex-row flex-wrap gap-2.5">
        {INTEREST_OPTIONS.map((interest) => {
          const on = selected.includes(interest);
          return (
            <Pressable
              key={interest}
              onPress={() => toggle(interest)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              className={cn(
                "flex-row items-center gap-1.5 rounded-pill border px-4 py-2.5",
                on ? "border-ink bg-ink" : "border-linen bg-card active:bg-sand",
              )}
            >
              {on ? <Icon name="check" size={14} color={colors.paper} strokeWidth={2.4} /> : null}
              <Text variant="label" className={cn("font-heading text-sm", on ? "text-paper" : "text-ink-muted")}>
                {interest}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Location */}
      <View className="mt-8 gap-3">
        <Text variant="overline" tone="pink">
          Where are you?
        </Text>
        <Text variant="caption" tone="muted">
          Optional — helps surface what’s on near you.
        </Text>
        <LocationPicker value={location} onChange={setLocation} />
      </View>

      {banner ? (
        <Text variant="caption" className="mt-6 text-terracotta-600">
          {banner}
        </Text>
      ) : null}

      <View className="mt-section gap-3">
        <Button
          label={selected.length > 0 ? `Continue with ${selected.length} selected` : "Continue"}
          variant="whatsapp"
          loading={update.isPending}
          onPress={() => finish(false)}
        />
        <Button label="Skip for now" variant="ghost" disabled={update.isPending} onPress={() => finish(true)} />
      </View>
    </Screen>
  );
}
