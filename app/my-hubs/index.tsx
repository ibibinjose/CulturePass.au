import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import { Screen, Text, Button, Card, Badge, Divider, Icon } from "@/components/ui";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { useDeleteHub, useMyHubs } from "@/features/hubs/api";
import { useDeleteEvent, useMyHubEvents } from "@/features/events/api";
import { useMyProfile } from "@/features/profiles/api";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";
import { colors } from "@/lib/theme";
import { getHubImage } from "@/lib/hubImages";

type MyHub = NonNullable<ReturnType<typeof useMyHubs>["data"]>[number];
type MyHubEvent = NonNullable<ReturnType<typeof useMyHubEvents>["data"]>[number];

const eventDateFmt = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

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
        <Text variant="overline" tone="pink">
          My Hubs
        </Text>
        <Button
          label="Create hub"
          variant="primary"
          size="sm"
          onPress={() => router.push("/create/hub")}
        />
      </View>

      <Text variant="title">Hub manager</Text>
      <Text variant="body" tone="muted" className="mt-2">
        {count > 0
          ? `${count} ${count === 1 ? "hub" : "hubs"} you own. Manage hub branding, profile details and every event from one place.`
          : "Create and manage hubs, brand assets and events from one place."}
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
  const deleteHub = useDeleteHub();
  const [confirmingHubDelete, setConfirmingHubDelete] = useState(false);
  const images = (hub.images ?? []).filter((i) => i && i.url);
  const logoUrl = getHubImage(images, "logo");
  const coverUrl = getHubImage(images, "cover") ?? images.find((i) => i.type !== "logo")?.url ?? images[0]?.url ?? null;
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");

  const verifyBadge =
    hub.verification_status === "verified" ? (
      <Badge label="Verified" variant="eucalyptus" />
    ) : hub.verification_status === "rejected" ? (
      <Badge label="Rejected" variant="danger" />
    ) : (
      <Badge label="Pending" variant="neutral" />
    );

  async function handleDeleteHub() {
    await deleteHub.mutateAsync(hub.id);
  }

  return (
    <Card padded={false} className="overflow-hidden">
      <Pressable onPress={onView} className="active:opacity-80">
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={{ width: "100%", height: 150 }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="h-[150px] justify-end bg-sand p-5">
            <Text variant="overline" tone="faint">
              No top image
            </Text>
          </View>
        )}

        <View className="gap-4 p-5">
          <View className="flex-row gap-4">
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={{ width: 64, height: 64, borderRadius: 16 }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-card">
                <Text className="font-display text-xl text-ink-faint">
                  {hub.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View className="min-w-0 flex-1 gap-2">
              <View className="flex-row flex-wrap items-center gap-2">
                {verifyBadge}
                <Badge
                  label={hub.status === "published" ? "Published" : "Draft"}
                  variant={hub.status === "published" ? "success" : "neutral"}
                />
                {hub.indigenous_led ? <IndigenousLedBadge /> : null}
              </View>
              <Text variant="subheading" numberOfLines={2}>
                {hub.name}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {HUB_TYPE_LABELS[hub.type as HubType]}
                {place ? ` · ${place}` : ""}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      <Divider />

      <View className="gap-4 p-5">
        <View className="flex-row flex-wrap gap-2">
          <Button label="View hub" variant="outline" size="sm" onPress={onView} />
          <Button label="Edit hub" variant="outline" size="sm" onPress={onEdit} />
          <Button label="Add event" variant="whatsapp" size="sm" className="ml-auto" onPress={onAddEvent} />
        </View>

        {confirmingHubDelete ? (
          <View className="gap-3 rounded-2xl border border-danger/30 bg-terracotta-50 p-4">
            <Text variant="subheading">Delete hub?</Text>
            <Text variant="caption" className="text-terracotta-600">
              This permanently deletes the hub and its events.
            </Text>
            <View className="flex-row gap-2">
              <Button
                label="Delete hub"
                variant="danger"
                size="sm"
                loading={deleteHub.isPending}
                onPress={handleDeleteHub}
              />
              <Button
                label="Cancel"
                variant="ghost"
                size="sm"
                disabled={deleteHub.isPending}
                onPress={() => setConfirmingHubDelete(false)}
              />
            </View>
          </View>
        ) : (
          <Button
            label="Delete hub"
            variant="ghost"
            size="sm"
            className="self-start"
            onPress={() => setConfirmingHubDelete(true)}
          />
        )}

        <Divider />
        <HubEventsManager hub={hub} />
      </View>
    </Card>
  );
}

function HubEventsManager({ hub }: { hub: MyHub }) {
  const router = useRouter();
  const { data: events, isLoading, isError } = useMyHubEvents(hub.id);
  const count = events?.length ?? 0;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="gap-1">
          <Text variant="overline" tone="pink">
            Events
          </Text>
          <Text variant="caption" tone="muted">
            {count ? `${count} total, including drafts` : "No events yet"}
          </Text>
        </View>
        <Button
          label="New event"
          variant="ghost"
          size="sm"
          onPress={() => router.push(`/create/event?hubId=${hub.id}`)}
        />
      </View>

      {isLoading ? (
        <View className="rounded-2xl bg-sand p-4">
          <Text variant="caption" tone="faint">
            Loading events…
          </Text>
        </View>
      ) : isError ? (
        <View className="rounded-2xl bg-sand p-4">
          <Text variant="caption" tone="muted">
            Couldn’t load events for this hub.
          </Text>
        </View>
      ) : count > 0 ? (
        <View className="gap-2">
          {events?.map((event) => (
            <EventManageRow key={event.id} event={event} />
          ))}
        </View>
      ) : (
        <Pressable
          onPress={() => router.push(`/create/event?hubId=${hub.id}`)}
          className="flex-row items-center gap-3 rounded-2xl border border-dashed border-linen bg-sand/50 p-4 active:bg-sand"
        >
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-card">
            <Icon name="calendar" size={17} color={colors.inkMuted} />
          </View>
          <View className="flex-1">
            <Text variant="label" className="font-heading">
              Add the first event
            </Text>
            <Text variant="caption" tone="muted">
              Events can be saved as drafts or published when ready.
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

function EventManageRow({ event }: { event: MyHubEvent }) {
  const router = useRouter();
  const deleteEvent = useDeleteEvent();
  const [confirming, setConfirming] = useState(false);
  const when = event.start_time ? eventDateFmt.format(new Date(event.start_time)) : "No date";
  const published = event.status === "published";

  async function handleDelete() {
    await deleteEvent.mutateAsync({ id: event.id, hubId: event.hub_id });
  }

  return (
    <View className="gap-3 rounded-2xl border border-linen bg-card p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-sand">
          <Icon name="calendar" size={18} color={colors.inkMuted} />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Badge label={published ? "Published" : "Draft"} variant={published ? "success" : "neutral"} />
            <Text variant="caption" tone="faint">
              {when}
            </Text>
          </View>
          <Text variant="label" numberOfLines={2} className="font-heading">
            {event.title || "Untitled event"}
          </Text>
        </View>
      </View>

      {confirming ? (
        <View className="gap-3 rounded-xl bg-terracotta-50 p-3">
          <Text variant="caption" className="text-terracotta-600">
            Delete this event permanently?
          </Text>
          <View className="flex-row gap-2">
            <Button
              label="Delete"
              variant="danger"
              size="sm"
              loading={deleteEvent.isPending}
              onPress={handleDelete}
            />
            <Button
              label="Cancel"
              variant="ghost"
              size="sm"
              disabled={deleteEvent.isPending}
              onPress={() => setConfirming(false)}
            />
          </View>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          <Button label="View" variant="outline" size="sm" onPress={() => router.push(`/event/${event.id}`)} />
          <Button label="Edit" variant="outline" size="sm" onPress={() => router.push(`/event/edit/${event.id}`)} />
          <Button label="Delete" variant="ghost" size="sm" className="ml-auto" onPress={() => setConfirming(true)} />
        </View>
      )}
    </View>
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
