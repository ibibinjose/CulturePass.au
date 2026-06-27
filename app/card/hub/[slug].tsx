import { Linking, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  Screen,
  Text,
  Button,
  Card,
  Avatar,
  Badge,
  ShareBar,
  Pinwheel,
} from "@/components/ui";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { useHub } from "@/features/hubs/api";
import { socialUrl } from "@/lib/social";
import { saveContact } from "@/lib/vcard";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";

/** Shareable digital business card for a hub, with "Save contact" (vCard). */
export default function HubBusinessCard() {
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
        <Text variant="title">Card unavailable</Text>
        <Text variant="body" tone="muted" className="mt-3">
          This hub is unpublished or doesn’t exist.
        </Text>
      </Screen>
    );
  }

  const logoUrl =
    hub.images?.find((i) => i.type === "logo")?.url ?? hub.images?.[0]?.url ?? null;
  const website = socialUrl("website", hub.website);
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");

  const contacts: { label: string; href: string }[] = [];
  if (website) contacts.push({ label: "Website", href: website });
  if (hub.contact_email) contacts.push({ label: "Email", href: `mailto:${hub.contact_email}` });
  if (hub.phone) contacts.push({ label: "Call", href: `tel:${hub.phone}` });

  function handleSaveContact() {
    if (!hub) return;
    void saveContact({
      name: hub.name,
      org: hub.name,
      title: HUB_TYPE_LABELS[hub.type as HubType],
      email: hub.contact_email,
      phone: hub.phone,
      address: hub.address || place || null,
      urls: website ? [website] : [],
      note: hub.short_description,
    });
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-section">
      <Card elevated className="items-center gap-4 p-7">
        <Avatar name={hub.name} uri={logoUrl} size={100} ring />
        <View className="items-center gap-2">
          <Text variant="title" className="text-center">
            {hub.name}
          </Text>
          <Badge label={HUB_TYPE_LABELS[hub.type as HubType]} />
          {hub.indigenous_led ? <IndigenousLedBadge /> : null}
          {place ? (
            <Text variant="caption" tone="faint">
              {place}
            </Text>
          ) : null}
        </View>

        {contacts.length > 0 ? (
          <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-1">
            {contacts.map((c) => (
              <Pressable key={c.label} onPress={() => Linking.openURL(c.href)} hitSlop={6}>
                <Text variant="label" tone="pink">
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Button
          label="Save contact"
          variant="primary"
          className="mt-2 self-stretch"
          onPress={handleSaveContact}
        />
      </Card>

      <ShareBar
        className="mt-6"
        path={`/card/hub/${hub.slug}`}
        title={hub.name}
        message={hub.short_description ?? undefined}
      />

      <Button
        label="View hub"
        variant="ghost"
        className="mt-3"
        onPress={() => router.push(`/hub/${hub.slug}`)}
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
