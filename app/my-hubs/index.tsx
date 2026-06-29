import { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import { Screen, Text, Button, Card, Badge, Divider, Icon } from "@/components/ui";
import { IndigenousLedBadge } from "@/components/cultural/IndigenousLedBadge";
import { useDeleteHub, useMyHubs } from "@/features/hubs/api";
import { useDeleteEvent, useMyHubEvents } from "@/features/events/api";
import { CohostInvitationsBanner } from "@/features/events/CohostInvitationsBanner";
import { useMyProfile } from "@/features/profiles/api";
import { HUB_TYPE_LABELS, type HubType } from "@/lib/constants";
import { colors } from "@/lib/theme";
import { getHubImage } from "@/lib/hubImages";
import { cn } from "@/lib/utils/cn";

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
  const { width } = useWindowDimensions();
  const { data: profile } = useMyProfile();
  const { data: hubs, isLoading, isError } = useMyHubs();

  if (!profile) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-10">
        <Card className="p-8 border border-linen items-center gap-4">
          <Icon name="lock" size={36} color={colors.inkMuted} />
          <Text variant="title" className="font-display tracking-tight text-center">Sign in required</Text>
          <Text variant="caption" tone="muted" className="text-center">
            You need to sign in to access your hub manager dashboard.
          </Text>
          <Button
            label="Sign in"
            variant="primary"
            className="mt-2"
            onPress={() => router.push("/(auth)/sign-in")}
          />
        </Card>
      </Screen>
    );
  }

  const count = hubs?.length ?? 0;
  const cols = width >= 768 ? 2 : 1;

  return (
    <Screen contentClassName="pt-4 md:pt-6" maxWidth="content">
      {/* Header */}
      <View className="mb-6 flex-row items-center justify-between border-b border-linen pb-5">
        <View className="gap-1 flex-1">
          <Text variant="overline" tone="pink">
            Page Manager
          </Text>
          <Text className="font-display text-3xl md:text-4xl text-ink tracking-tight">
            My Pages
          </Text>
          <Text className="font-sans text-xs text-ink-faint mt-1">
            {count > 0
              ? `You own and manage ${count} ${count === 1 ? "page" : "pages"}. Update branding, locations, and publish local events.`
              : "Register and manage public pages, brand assets, and events from one place."}
          </Text>
        </View>
        <Button
          label="Create page"
          variant="primary"
          size="sm"
          onPress={() => router.push("/create/hub")}
        />
      </View>

      <CohostInvitationsBanner />

      <View className="flex-row flex-wrap gap-4">
        {isLoading ? (
          <>
            <HubManageSkeleton cols={cols} />
            <HubManageSkeleton cols={cols} />
          </>
        ) : isError ? (
          <Card className="w-full p-6 border border-danger/25 bg-terracotta-50/50">
            <Text variant="caption" tone="muted">
              Couldn’t load your pages. Please pull down to refresh or try again later.
            </Text>
          </Card>
        ) : count > 0 ? (
          hubs?.map((hub) => (
            <HubManageCard
              key={hub.id}
              hub={hub}
              cols={cols}
              onView={() => router.push(`/hub/${hub.slug}`)}
              onEdit={() => router.push(`/hub/edit/${hub.slug}`)}
              onAddEvent={() => router.push(`/create/event?hubId=${hub.id}`)}
            />
          ))
        ) : (
          <Card className="w-full p-8 items-center gap-2 border border-dashed border-linen bg-sand/20">
            <Icon name="grid" size={32} color={colors.inkFaint} />
            <Text variant="subheading" className="font-display tracking-tight text-center">No pages created yet</Text>
            <Text variant="caption" tone="muted" className="text-center max-w-sm">
              Publish a public page for your gallery, local collective, creative business, or community sports club.
            </Text>
            <Button
              label="Create your first page"
              variant="secondary"
              size="sm"
              className="mt-4"
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
  cols,
  onView,
  onEdit,
  onAddEvent,
}: {
  hub: MyHub;
  cols: number;
  onView: () => void;
  onEdit: () => void;
  onAddEvent: () => void;
}) {
  const deleteHub = useDeleteHub();
  const [confirmingHubDelete, setConfirmingHubDelete] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  const { data: events } = useMyHubEvents(hub.id);
  const eventsCount = events?.length ?? 0;

  const images = (hub.images ?? []).filter((i) => i && i.url);
  const logoUrl = getHubImage(images, "logo");
  const place = [hub.location_city, hub.location_state].filter(Boolean).join(", ");

  const verifyBadge =
    hub.verification_status === "verified" ? (
      <Badge label="Verified" variant="success" />
    ) : hub.verification_status === "rejected" ? (
      <Badge label="Rejected" variant="danger" />
    ) : (
      <Badge label="Pending Approval" variant="warning" />
    );

  async function handleDeleteHub() {
    await deleteHub.mutateAsync(hub.id);
  }

  const widthClass = cols === 2 ? "w-[calc(50%-8px)]" : "w-full";

  return (
    <Card padded={false} className={cn("overflow-hidden border border-linen bg-card p-5 gap-4", widthClass)}>
      {/* Top row: Brand & Info */}
      <View className="flex-row items-start gap-4">
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: 56, height: 56, borderRadius: 14 }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-xl bg-sand">
            <Text className="font-display text-lg text-ink-muted">
              {hub.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-1.5">
            {verifyBadge}
            <Badge
              label={hub.status === "published" ? "Published" : "Draft"}
              variant={hub.status === "published" ? "ink" : "neutral"}
            />
            {hub.indigenous_led ? <IndigenousLedBadge /> : null}
          </View>
          
          <Text className="font-display text-lg text-ink font-semibold tracking-tight" numberOfLines={2}>
            {hub.name}
          </Text>
          <Text variant="caption" tone="muted" className="text-[11px]" numberOfLines={1}>
            {HUB_TYPE_LABELS[hub.type as HubType]}
            {place ? ` · ${place}` : ""}
          </Text>
        </View>
      </View>

      <Divider className="opacity-40" />

      {/* Action Row */}
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-row flex-wrap gap-2">
          <Button label="View Hub" variant="ghost" size="sm" onPress={onView} />
          <Button label="Edit Profile" variant="outline" size="sm" onPress={onEdit} />
          <Button
            label={showEvents ? "Hide Events" : `Events (${eventsCount})`}
            variant="outline"
            size="sm"
            leftIcon={<Icon name="calendar" size={13} color={colors.inkMuted} />}
            onPress={() => setShowEvents(!showEvents)}
          />
        </View>

        <Button label="Add Event" variant="whatsapp" size="sm" onPress={onAddEvent} />
      </View>

      {/* Collapsible Events Section (Tree layout) */}
      {showEvents && (
        <View className="pl-5 ml-7 border-l-2 border-linen/30 gap-3 mt-2 mb-3">
          <HubEventsManager hub={hub} events={events} eventsCount={eventsCount} />
        </View>
      )}

      {/* Delete Hub Section */}
      <View className="border-t border-linen/20 pt-3">
        {confirmingHubDelete ? (
          <Card className="border border-danger/30 bg-terracotta-50 p-4 gap-3">
            <Text variant="subheading" className="text-sm font-semibold">Delete hub?</Text>
            <Text className="text-xs text-terracotta-600 leading-4">
              This will permanently delete this hub and all of its associated events. This action is irreversible.
            </Text>
            <View className="flex-row gap-2 mt-1">
              <Button
                label="Confirm Delete"
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
          </Card>
        ) : (
          <Pressable
            onPress={() => setConfirmingHubDelete(true)}
            className="flex-row items-center gap-1.5 self-start active:opacity-70"
          >
            <Icon name="trash" size={13} color={colors.terracotta} />
            <Text className="text-xs text-terracotta font-heading">Delete Hub</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

function HubEventsManager({
  hub,
  events,
  eventsCount,
}: {
  hub: MyHub;
  events?: MyHubEvent[];
  eventsCount: number;
}) {
  const router = useRouter();

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between pr-2">
        <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">
          Associated Events
        </Text>
        <Pressable
          onPress={() => router.push(`/create/event?hubId=${hub.id}`)}
          className="flex-row items-center gap-1 active:opacity-75"
        >
          <Icon name="plus" size={12} color={colors.pink} />
          <Text className="text-xs text-pink font-heading">New Event</Text>
        </Pressable>
      </View>

      {eventsCount > 0 ? (
        <View className="gap-1">
          {events?.map((event, idx) => (
            <EventManageRow
              key={event.id}
              event={event}
              isLast={idx === eventsCount - 1}
            />
          ))}
        </View>
      ) : (
        <Pressable
          onPress={() => router.push(`/create/event?hubId=${hub.id}`)}
          className="flex-row items-center gap-3 rounded-xl border border-dashed border-linen bg-card p-3 active:bg-sand/30"
        >
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-sand">
            <Icon name="calendar" size={14} color={colors.inkMuted} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-heading text-ink">
              Add the first event
            </Text>
            <Text className="text-[10px] text-ink-faint">
              Drafts and published listings will appear here.
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

function EventManageRow({ event, isLast }: { event: MyHubEvent; isLast: boolean }) {
  const router = useRouter();
  const deleteEvent = useDeleteEvent();
  const [confirming, setConfirming] = useState(false);
  const when = event.start_time ? eventDateFmt.format(new Date(event.start_time)) : "No date";
  const published = event.status === "published";

  async function handleDelete() {
    await deleteEvent.mutateAsync({ id: event.id, hubId: event.hub_id });
  }

  return (
    <View className="relative pl-5 py-1">
      {/* Tree connector branch */}
      <View
        className={cn(
          "absolute left-0 top-0 w-4 border-l-2 border-b-2 border-linen/35",
          isLast ? "h-5.5" : "h-full"
        )}
      />

      <View className="flex-row items-center justify-between gap-3 border border-linen bg-card p-3 rounded-xl">
        <View className="flex-1 min-w-0 flex-row items-center gap-2.5">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-sand">
            <Icon name="calendar" size={15} color={colors.inkMuted} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-xs font-heading text-ink truncate" numberOfLines={1}>
              {event.title || "Untitled event"}
            </Text>
            <Text className="text-[10px] text-ink-faint mt-0.5" numberOfLines={1}>
              {when} · {published ? "Published" : "Draft"}
            </Text>
          </View>
        </View>

        {/* Compact Actions */}
        <View className="flex-row gap-1">
          <Button
            label="View"
            variant="ghost"
            size="sm"
            className="px-2.5 h-8 rounded-lg"
            onPress={() => router.push(`/event/${event.id}`)}
          />
          <Button
            label="Edit"
            variant="outline"
            size="sm"
            className="px-2.5 h-8 rounded-lg"
            onPress={() => router.push(`/event/edit/${event.id}`)}
          />
          <Button
            label="Delete"
            variant="ghost"
            size="sm"
            className="px-2.5 h-8 rounded-lg"
            onPress={() => setConfirming(true)}
          />
        </View>
      </View>

      {confirming && (
        <Card className="border border-danger/30 bg-terracotta-50 p-3 mt-1.5 ml-6 gap-2">
          <Text className="text-[11px] text-terracotta-600">Delete event permanently?</Text>
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
        </Card>
      )}
    </View>
  );
}

function HubManageSkeleton({ cols }: { cols: number }) {
  const widthClass = cols === 2 ? "w-[calc(50%-8px)]" : "w-full";
  return (
    <Card className={cn("gap-4 p-5 border border-linen bg-card", widthClass)}>
      <View className="flex-row gap-4">
        <View className="h-14 w-14 rounded-xl bg-sand" />
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
