import { useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { Screen, Text, Button, BackButton, Card, Badge, Divider } from "@/components/ui";
import { useMyTickets, type TicketOrder } from "@/features/tickets/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSavedEvents } from "@/features/events/useSavedEvents";
import { useEvents } from "@/features/events/api";
import { useMyFollowedHubs } from "@/features/hubs/api";
import { EventCard } from "@/features/events/EventCard";
import { HubCard } from "@/features/hubs/HubCard";
import { cn } from "@/lib/utils/cn";

const whenFmt = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const STATUS: Record<
  TicketOrder["status"],
  { label: string; variant: "success" | "warning" | "danger" | "neutral" }
> = {
  paid: { label: "Confirmed", variant: "success" },
  pending: { label: "Payment pending", variant: "warning" },
  failed: { label: "Failed", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  refunded: { label: "Refunded", variant: "neutral" },
};

export default function MyTicketsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"tickets" | "saved" | "hubs">("tickets");
  
  // Tickets query
  const { data: tickets, isLoading: ticketsLoading, isError: ticketsError } = useMyTickets();

  // Saved events query
  const savedIds = useSavedEvents((s) => s.ids);
  const { data: savedEvents, isLoading: savedLoading, isError: savedError } = useEvents({
    ids: savedIds.length > 0 ? savedIds : ["__dummy_none__"], // dummy value to avoid fetching all events if empty
  });

  // Followed hubs query
  const { data: followedHubs, isLoading: hubsLoading, isError: hubsError } = useMyFollowedHubs();

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton fallbackHref="/" className="mb-5" />

      <Text variant="overline" tone="pink">
        Library
      </Text>
      <Text variant="title" className="mt-2">
        My Library
      </Text>

      {/* Swiss Tabs */}
      <View className="flex-row gap-6 border-b border-linen mt-6 mb-4">
        <Pressable onPress={() => setActiveTab("tickets")} className="items-center">
          <Text className={cn("pb-2 font-heading text-sm", activeTab === "tickets" ? "text-ink font-semibold" : "text-ink-faint")}>
            Tickets
          </Text>
          <View className={cn("h-0.5 w-full rounded-pill", activeTab === "tickets" ? "bg-ochre-500" : "bg-transparent")} />
        </Pressable>
        <Pressable onPress={() => setActiveTab("saved")} className="items-center">
          <Text className={cn("pb-2 font-heading text-sm", activeTab === "saved" ? "text-ink font-semibold" : "text-ink-faint")}>
            Saved Events ({savedIds.length})
          </Text>
          <View className={cn("h-0.5 w-full rounded-pill", activeTab === "saved" ? "bg-ochre-500" : "bg-transparent")} />
        </Pressable>
        <Pressable onPress={() => setActiveTab("hubs")} className="items-center">
          <Text className={cn("pb-2 font-heading text-sm", activeTab === "hubs" ? "text-ink font-semibold" : "text-ink-faint")}>
            Followed Hubs ({followedHubs?.length ?? 0})
          </Text>
          <View className={cn("h-0.5 w-full rounded-pill", activeTab === "hubs" ? "bg-ochre-500" : "bg-transparent")} />
        </Pressable>
      </View>

      {activeTab === "tickets" ? (
        <>
          {!isAuthenticated ? (
            <Card className="mt-4 gap-3">
              <Text variant="subheading">Sign in to view tickets</Text>
              <Button
                label="Sign in"
                className="self-start"
                onPress={() => router.push("/sign-in")}
              />
            </Card>
          ) : ticketsLoading ? (
            <Text variant="caption" tone="faint" className="mt-4">
              Loading tickets…
            </Text>
          ) : ticketsError ? (
            <Card className="mt-4">
              <Text variant="caption" tone="muted">
                Couldn’t load your tickets right now.
              </Text>
            </Card>
          ) : tickets && tickets.length > 0 ? (
            <View className="mt-4 gap-4">
              {tickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} onOpen={() => router.push(`/event/${ticket.event_id}`)} />
              ))}
            </View>
          ) : (
            <Card className="mt-4 gap-3">
              <Text variant="subheading">No tickets yet</Text>
              <Text variant="caption" tone="muted">
                Tickets you buy will appear here.
              </Text>
              <Button
                label="Discover events"
                variant="secondary"
                size="sm"
                className="self-start"
                onPress={() => router.push("/")}
              />
            </Card>
          )}
        </>
      ) : activeTab === "saved" ? (
        <>
          {savedIds.length === 0 ? (
            <Card className="mt-4 gap-3">
              <Text variant="subheading">No saved events</Text>
              <Text variant="caption" tone="muted">
                Events you bookmark will appear here.
              </Text>
              <Button
                label="Discover events"
                variant="secondary"
                size="sm"
                className="self-start"
                onPress={() => router.push("/")}
              />
            </Card>
          ) : savedLoading ? (
            <Text variant="caption" tone="faint" className="mt-4">
              Loading saved events…
            </Text>
          ) : savedError ? (
            <Card className="mt-4">
              <Text variant="caption" tone="muted">
                Couldn’t load your saved events right now.
              </Text>
            </Card>
          ) : savedEvents && savedEvents.length > 0 ? (
            <View className="mt-4 gap-4">
              {savedEvents.map((event) => (
                <EventCard key={event.id} event={event} variant="list" />
              ))}
            </View>
          ) : (
            <Card className="mt-4 gap-3">
              <Text variant="subheading">No events found</Text>
              <Text variant="caption" tone="muted">
                No events match the saved list. They may have been cancelled or deleted.
              </Text>
            </Card>
          )}
        </>
      ) : (
        <>
          {!isAuthenticated ? (
            <Card className="mt-4 gap-3">
              <Text variant="subheading">Sign in to view followed hubs</Text>
              <Button
                label="Sign in"
                className="self-start"
                onPress={() => router.push("/sign-in")}
              />
            </Card>
          ) : hubsLoading ? (
            <Text variant="caption" tone="faint" className="mt-4">
              Loading followed hubs…
            </Text>
          ) : hubsError ? (
            <Card className="mt-4">
              <Text variant="caption" tone="muted">
                Couldn’t load your followed hubs right now.
              </Text>
            </Card>
          ) : followedHubs && followedHubs.length > 0 ? (
            <View className="mt-4 gap-4">
              {followedHubs.map((hub) => (
                <HubCard key={hub.slug} hub={hub as any} />
              ))}
            </View>
          ) : (
            <Card className="mt-4 gap-3">
              <Text variant="subheading">No followed hubs yet</Text>
              <Text variant="caption" tone="muted">
                Hubs you follow will appear here.
              </Text>
              <Button
                label="Discover hubs"
                variant="secondary"
                size="sm"
                className="self-start"
                onPress={() => router.push("/")}
              />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

function TicketRow({ ticket, onOpen }: { ticket: TicketOrder; onOpen: () => void }) {
  const status = STATUS[ticket.status];
  const cover = ticket.event?.images?.[0]?.url ?? null;
  const start = ticket.event?.start_time ? new Date(ticket.event.start_time) : null;
  const total = ((ticket.amount_total ?? ticket.unit_amount * ticket.quantity) / 100).toFixed(2);

  return (
    <Card onPress={ticket.event_id ? onOpen : undefined} padded={false} className="overflow-hidden">
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={{ width: "100%", aspectRatio: 16 / 9 }}
          contentFit="cover"
          transition={150}
        />
      ) : null}
      <View className="gap-2 p-4">
        <View className="flex-row items-center justify-between gap-2">
          <Badge label={status.label} variant={status.variant} dot />
          <Text variant="caption" tone="faint">
            {ticket.quantity} × · ${total}
          </Text>
        </View>
        <Text variant="subheading" numberOfLines={2}>
          {ticket.event?.title || ticket.event_title || "Event"}
        </Text>
        {start ? (
          <Text variant="caption" tone="faint">
            {whenFmt.format(start)}
          </Text>
        ) : null}
        <Divider className="my-1" />
        <Text variant="overline" tone="faint">
          Order {ticket.id.slice(0, 8).toUpperCase()}
        </Text>
      </View>
    </Card>
  );
}
