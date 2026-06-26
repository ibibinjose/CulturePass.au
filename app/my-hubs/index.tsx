import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import { Screen, Text, Button, Card, Badge, Divider } from "@/components/ui";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { useMyHubs } from "@/features/hubs/api";
import { useMyProfile } from "@/features/profiles/api";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";

type MyHub = NonNullable<ReturnType<typeof useMyHubs>["data"]>[number];

export default function MyHubsScreen() {
  const router = useRouter();
  const { data: profile } = useMyProfile();
  const { data: hubs, isLoading, isError } = useMyHubs();

  if (!profile) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-10">
        <Text variant="title" className="mt-6">
          Sign in required
        </Text>
        <Text variant="body" tone="muted" className="mt-2">
          You need to sign in to view your hubs.
        </Text>
        <Button
          label="Sign in"
          className="mt-6 self-start"
          onPress={() => router.push("/(auth)/sign-in")}
        />
      </Screen>
    );
  }

  const count = hubs?.length ?? 0;

  return (
    <Screen contentClassName="pt-10">
      <View className="mb-2 flex-row items-center justify-between">
        <Text variant="overline" tone="ochre">
          My Hubs
        </Text>
        <Button
          label="+ Create"
          variant="primary"
          size="sm"
          onPress={() => router.push("/create/hub")}
        />
      </View>

      <Text variant="title">Your hubs</Text>
      <Text variant="body" tone="muted" className="mt-2">
        {count > 0
          ? `${count} ${count === 1 ? "hub" : "hubs"} you own — view, edit and add events.`
          : "View, edit and manage the hubs you own."}
      </Text>

      <View className="mt-10 gap-4">
        {isLoading ? (
          <>
            <HubManageSkeleton />
            <HubManageSkeleton />
          </>
        ) : isError ? (
          <Card>
            <Text variant="caption" tone="muted">
              Couldn’t load your hubs. Please try again.
            </Text>
          </Card>
        ) : count > 0 ? (
          hubs?.map((hub) => (
            <HubManageCard
              key={hub.id}
              hub={hub}
              onView={() => router.push(`/hub/${hub.slug}`)}
              onEdit={() => router.push(`/hub/edit/${hub.slug}`)}
              onAddEvent={() => router.push(`/create/event?hubId=${hub.id}`)}
            />
          ))
        ) : (
          <Card className="items-start">
            <Text variant="subheading">No hubs yet</Text>
            <Text variant="caption" tone="muted" className="mt-1">
              You haven’t created any hubs. Start by creating your first hub.
            </Text>
            <Button
              label="Create your first hub"
              variant="secondary"
              className="mt-4 self-start"
              onPress={() => router.push("/create/hub")}
            />
          </Card>
        )}
      </View>
    </Screen>
  );
}

function HubManageCard({
  hub,
  onView,
  onEdit,
  onAddEvent,
}: {
  hub: MyHub;
  onView: () => void;
  onEdit: () => void;
  onAddEvent: () => void;
}) {
  const images = (hub.images ?? []).filter((i) => i && i.url);
  const thumbUrl = images.find((i) => i.type !== "logo")?.url ?? images[0]?.url ?? null;
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");

  const verifyBadge =
    hub.verification_status === "verified" ? (
      <Badge label="Verified" variant="eucalyptus" />
    ) : hub.verification_status === "rejected" ? (
      <Badge label="Rejected" variant="danger" />
    ) : (
      <Badge label="Pending" variant="neutral" />
    );

  return (
    <Card className="gap-4">
      <Pressable onPress={onView} className="flex-row gap-4 active:opacity-70">
        {thumbUrl ? (
          <Image
            source={{ uri: thumbUrl }}
            style={{ width: 64, height: 64, borderRadius: 12 }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-lg bg-sand">
            <Text className="font-display text-xl text-ink-faint">
              {hub.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text variant="subheading" numberOfLines={1} className="flex-1">
              {hub.name}
            </Text>
            {verifyBadge}
          </View>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {HUB_TYPE_LABELS[hub.type as HubType]}
            {place ? ` · ${place}` : ""}
          </Text>
          {hub.indigenous_led ? <IndigenousLedBadge className="mt-1" /> : null}
        </View>
      </Pressable>

      <Divider />

      <View className="flex-row gap-2">
        <Button label="View" variant="outline" size="sm" onPress={onView} />
        <Button label="Edit" variant="outline" size="sm" onPress={onEdit} />
        <Button label="+ Event" variant="ghost" size="sm" className="ml-auto" onPress={onAddEvent} />
      </View>
    </Card>
  );
}

function HubManageSkeleton() {
  return (
    <Card className="gap-4">
      <View className="flex-row gap-4">
        <View className="h-16 w-16 rounded-lg bg-sand" />
        <View className="flex-1 gap-2">
          <View className="h-5 w-2/3 rounded bg-sand" />
          <View className="h-4 w-1/2 rounded bg-sand" />
        </View>
      </View>
      <Divider />
      <View className="h-10 w-40 rounded-lg bg-sand" />
    </Card>
  );
}
