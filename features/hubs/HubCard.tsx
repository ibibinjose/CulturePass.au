import { View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";
import type { HubImage } from "@/lib/supabase/database.types";

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
    <Card onPress={() => router.push(`/hub/${hub.slug}`)} className="gap-4">
      <View className="flex-row gap-4">
        {thumbUrl ? (
          <Image
            source={{ uri: thumbUrl }}
            style={{ width: 88, height: 88, borderRadius: 12 }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="h-[88px] w-[88px] items-center justify-center rounded-lg bg-sand">
            <Text className="font-display text-3xl text-ink-faint">
              {hub.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="min-w-0 flex-1 gap-3">
          <View className="flex-row flex-wrap items-center gap-2">
            <Badge label={HUB_TYPE_LABELS[hub.type]} variant="neutral" />
            {hub.indigenous_led ? <IndigenousLedBadge /> : null}
          </View>

          <View className="gap-2">
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
      </View>

      <View className="gap-1 border-t border-linen pt-3">
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
