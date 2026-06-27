import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  Screen,
  Text,
  Button,
  Avatar,
  Badge,
  LinkButtons,
  ShareBar,
  Pinwheel,
  type LinkItem,
} from "@/components/ui";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { useHub } from "@/features/hubs/api";
import { socialUrl } from "@/lib/social";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";

/** Link-in-bio (linktree-style) page for a hub. */
export default function HubLinkInBio() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { data: hub, isLoading } = useHub(slug ?? "");

  if (isLoading) {
    return (
      <Screen maxWidth="form" contentClassName="pt-section">
        <Text variant="caption" tone="faint">
          Loading…
        </Text>
      </Screen>
    );
  }

  if (!hub) {
    return (
      <Screen maxWidth="form" contentClassName="pt-section">
        <Text variant="title">Not available</Text>
        <Text variant="body" tone="muted" className="mt-3">
          This hub is unpublished or doesn’t exist.
        </Text>
      </Screen>
    );
  }

  const logoUrl =
    hub.images?.find((i) => i.type === "logo")?.url ?? hub.images?.[0]?.url ?? null;

  const items: LinkItem[] = [];
  const website = socialUrl("website", hub.website);
  if (website) items.push({ label: "Website", href: website });
  if (hub.contact_email) items.push({ label: "Email", href: `mailto:${hub.contact_email}` });
  if (hub.phone) items.push({ label: "Call", href: `tel:${hub.phone}` });

  return (
    <Screen maxWidth="form" contentClassName="pt-section">
      <View className="items-center gap-4">
        <Avatar name={hub.name} uri={logoUrl} size={108} ring />
        <View className="items-center gap-2">
          <Text variant="title" className="text-center">
            {hub.name}
          </Text>
          <Badge label={HUB_TYPE_LABELS[hub.type as HubType]} />
          {hub.indigenous_led ? <IndigenousLedBadge /> : null}
        </View>
      </View>

      {hub.short_description ? (
        <Text variant="body" className="mt-6 text-center leading-7">
          {hub.short_description}
        </Text>
      ) : null}

      <LinkButtons className="mt-8" items={items} />

      <Button
        label="View hub"
        variant="outline"
        className="mt-3"
        onPress={() => router.push(`/hub/${hub.slug}`)}
      />

      <ShareBar
        className="mt-8"
        path={`/l/hub/${hub.slug}`}
        title={hub.name}
        message={hub.short_description ?? undefined}
      />

      <View className="mt-10 items-center gap-2">
        <Pinwheel size={22} />
        <Text variant="overline" tone="faint" className="text-center">
          Powered by CulturePass Australia
        </Text>
      </View>
    </Screen>
  );
}
