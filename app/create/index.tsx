import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import {
  BackButton,
  Icon,
  Screen,
  Text,
  type IconName,
} from "@/components/ui";
import { colors } from "@/lib/theme";

export default function CreateChooser() {
  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton className="mb-5" />

      <Text variant="overline" tone="pink">
        Create
      </Text>
      <Text variant="title" className="mt-2">
        What would you like to create?
      </Text>
      <Text variant="lead" className="mt-3">
        Events belong to a page. Start by creating a page, then publish events from it.
      </Text>

      <View className="mt-8 gap-4">
        <CreateOption
          icon="calendar"
          tone="pink"
          title="Host an event"
          description="Publish an event from one of your pages so people can discover, save and attend it."
          href="/my-hubs"
        />
        <CreateOption
          icon="grid"
          tone="eucalyptus"
          title="Create a page"
          description="A page for a community, council, organisation, club, venue, business or wellness practice."
          href="/create/hub"
        />
        <CreateOption
          icon="user"
          tone="neutral"
          title="Professional public profile"
          description="A public page for an artist, leader, founder, educator or practitioner."
          href="/create/professional"
        />
      </View>
    </Screen>
  );
}

const TONES = {
  pink: "bg-pink-50",
  ochre: "bg-ochre-50",
  eucalyptus: "bg-eucalyptus-50",
  neutral: "bg-sand",
} as const;

const TONE_ICON = {
  pink: colors.pinkDeep,
  ochre: colors.ochre,
  eucalyptus: colors.eucalyptus,
  neutral: colors.inkMuted,
} as const;

function CreateOption({
  icon,
  tone,
  title,
  description,
  href,
}: {
  icon: IconName;
  tone: keyof typeof TONES;
  title: string;
  description: string;
  href: Href;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      className="flex-row items-center gap-4 rounded-2xl border border-linen bg-card p-5 active:scale-[0.98] active:bg-sand/40 active:border-linen/80 transition-all duration-150"
    >
      <View className={`h-12 w-12 items-center justify-center rounded-xl border border-linen/30 ${TONES[tone]}`}>
        <Icon name={icon} size={22} color={TONE_ICON[tone]} />
      </View>
      <View className="flex-1 gap-1">
        <Text variant="subheading">{title}</Text>
        <Text variant="caption" tone="muted">
          {description}
        </Text>
      </View>
      <Icon name="chevron-right" size={20} color={colors.inkFaint} />
    </Pressable>
  );
}
