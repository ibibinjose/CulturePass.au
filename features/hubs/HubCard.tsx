import { View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  Badge,
  Card,
  Icon,
  Text,
} from "@/components/ui";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { colors } from "@/lib/theme";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";
import type { HubImage } from "@/lib/types/database.types";

export interface HubCardData {
  slug: string;
  name: string;
  type: HubType;
  short_description: string | null;
  location_state: string | null;
  location_city: string | null;
  indigenous_led: boolean;
  traditional_custodians: string[] | null;
  images?: HubImage[] | null;
}

export function HubCard({ hub }: { hub: HubCardData }) {
  const router = useRouter();
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");
  const custodians = hub.traditional_custodians?.filter(Boolean) ?? [];
  const images = (hub.images ?? []).filter((image) => image && image.url);
  const thumbUrl =
    images.find((image) => image.type === "cover")?.url ??
    images.find((image) => image.type !== "logo")?.url ??
    images[0]?.url ??
    null;

  return (
    <Card onPress={() => router.push(`/hub/${hub.slug}`)} padded={false} className="overflow-hidden">
      <View className="flex-row gap-4 p-4">
        {thumbUrl ? (
          <Image
            source={{ uri: thumbUrl }}
            style={{ width: 92, height: 92, borderRadius: 18 }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="h-[92px] w-[92px] items-center justify-center rounded-[18px] bg-ochre-50">
            <Text className="font-display text-3xl text-ochre-300">
              {hub.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="min-w-0 flex-1 justify-center gap-2.5">
          <View className="flex-row flex-wrap items-center gap-2">
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
        </View>
      </View>

      {place || custodians.length > 0 ? (
        <View className="gap-1.5 border-t border-linen px-4 py-3">
          {place ? (
            <View className="flex-row items-center gap-1.5">
              <Icon name="map-pin" size={14} color={colors.inkFaint} />
              <Text variant="caption" tone="faint">
                {place}
              </Text>
            </View>
          ) : null}
          {custodians.length > 0 ? (
            <Text variant="caption" tone="eucalyptus">
              {custodians.join(" • ")} Country
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
