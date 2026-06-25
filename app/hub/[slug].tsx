import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { WelcomeToCountry } from "@/components/cultural/WelcomeToCountry";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { useHub } from "@/features/hubs/api";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";

export default function HubScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: hub, isLoading, isError } = useHub(slug ?? "");

  if (isLoading) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-10">
        <Text variant="caption" tone="faint">
          Loading…
        </Text>
      </Screen>
    );
  }

  if (isError || !hub) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-10">
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
        <Text variant="title" className="mt-6">
          Hub not found
        </Text>
        <Text variant="body" tone="muted" className="mt-2">
          It may be unpublished, or your Supabase project isn’t connected yet.
        </Text>
      </Screen>
    );
  }

  // `council` is the embedded reference row from the select() join.
  const council = (hub as { council?: { name: string; traditional_custodians: string[] | null } })
    .council;
  const custodians =
    (hub.traditional_custodians && hub.traditional_custodians.length > 0
      ? hub.traditional_custodians
      : council?.traditional_custodians) ?? null;
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");

  return (
    <Screen maxWidth="prose" contentClassName="pt-10">
      <View className="mb-6 flex-row items-center justify-between">
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
        {hub.verification_status === "verified" ? (
          <Badge label="Verified" variant="eucalyptus" />
        ) : null}
      </View>

      {/* Header */}
      <View className="flex-row items-center gap-2">
        <Badge label={HUB_TYPE_LABELS[hub.type as HubType]} />
        {hub.indigenous_led ? <IndigenousLedBadge /> : null}
      </View>
      <Text variant="title" className="mt-4">
        {hub.name}
      </Text>
      {hub.short_description ? (
        <Text variant="bodyLarge" tone="muted" className="mt-3">
          {hub.short_description}
        </Text>
      ) : null}

      {/* Welcome to Country — placed high, as a sign of respect */}
      <WelcomeToCountry
        statement={hub.welcome_to_country}
        custodians={custodians}
        className="mt-8"
      />

      {/* About */}
      {hub.full_description ? (
        <View className="mt-10">
          <Text variant="overline" tone="faint">
            About
          </Text>
          <Text variant="body" className="mt-3 leading-7">
            {hub.full_description}
          </Text>
        </View>
      ) : null}

      {/* Details */}
      <View className="mt-10 gap-4">
        <Text variant="overline" tone="faint">
          Details
        </Text>
        <Card className="gap-4">
          {place ? <DetailRow label="Location" value={place} /> : null}
          {council?.name ? <DetailRow label="Council" value={council.name} /> : null}
          {hub.address ? <DetailRow label="Address" value={hub.address} /> : null}
          {hub.website ? <DetailRow label="Website" value={hub.website} /> : null}
          {hub.contact_email ? <DetailRow label="Email" value={hub.contact_email} /> : null}
          {hub.phone ? <DetailRow label="Phone" value={hub.phone} /> : null}
        </Card>
      </View>

      {hub.indigenous_partners && hub.indigenous_partners.length > 0 ? (
        <View className="mt-10">
          <Text variant="overline" tone="faint">
            Indigenous partners
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {hub.indigenous_partners.map((p) => (
              <Badge key={p} label={p} variant="outline" />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between gap-4">
        <Text variant="caption" tone="faint" className="w-24">
          {label}
        </Text>
        <Text variant="body" className="flex-1 text-right">
          {value}
        </Text>
      </View>
      <Divider />
    </View>
  );
}
