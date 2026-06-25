import { View } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";

export interface HubCardData {
  slug: string;
  name: string;
  type: HubType;
  short_description: string | null;
  location_state: string | null;
  location_city: string | null;
  indigenous_led: boolean;
  traditional_custodians: string[] | null;
}

export function HubCard({ hub }: { hub: HubCardData }) {
  const router = useRouter();
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");
  const custodians = hub.traditional_custodians?.filter(Boolean) ?? [];

  return (
    <Card onPress={() => router.push(`/hub/${hub.slug}`)} className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <Badge label={HUB_TYPE_LABELS[hub.type]} variant="neutral" />
        {hub.indigenous_led ? <IndigenousLedBadge /> : null}
      </View>

      <Text variant="subheading" numberOfLines={2}>
        {hub.name}
      </Text>

      {hub.short_description ? (
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {hub.short_description}
        </Text>
      ) : null}

      <View className="mt-1 gap-1">
        {place ? (
          <Text variant="caption" tone="faint">
            {place}
          </Text>
        ) : null}
        {custodians.length > 0 ? (
          <Text variant="caption" tone="eucalyptus">
            {custodians.join(" • ")} Country
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
