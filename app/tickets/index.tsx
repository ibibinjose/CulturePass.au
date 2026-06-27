import { View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { Screen, Text, Button, BackButton, Card, Badge, Divider } from "@/components/ui";
import { useMyTickets, type TicketOrder } from "@/features/tickets/api";
import { useAuth } from "@/features/auth/AuthProvider";

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
  const { data: tickets, isLoading, isError } = useMyTickets();

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton fallbackHref="/" className="mb-5" />

      <Text variant="overline" tone="pink">
        Tickets
      </Text>
      <Text variant="title" className="mt-2">
        My tickets
      </Text>

      {!isAuthenticated ? (
        <Card className="mt-8 gap-3">
          <Text variant="subheading">Sign in to view tickets</Text>
          <Button
            label="Sign in"
            className="self-start"
            onPress={() => router.push("/sign-in")}
          />
        </Card>
      ) : isLoading ? (
        <Text variant="caption" tone="faint" className="mt-8">
          Loading…
        </Text>
      ) : isError ? (
        <Card className="mt-8">
          <Text variant="caption" tone="muted">
            Couldn’t load your tickets right now.
          </Text>
        </Card>
      ) : tickets && tickets.length > 0 ? (
        <View className="mt-8 gap-4">
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} onOpen={() => router.push(`/event/${ticket.event_id}`)} />
          ))}
        </View>
      ) : (
        <Card className="mt-8 gap-3">
          <Text variant="subheading">No tickets yet</Text>
          <Text variant="caption" tone="muted">
            Tickets you buy will appear here.
          </Text>
          <Button
            label="Find events"
            variant="secondary"
            size="sm"
            className="self-start"
            onPress={() => router.push("/")}
          />
        </Card>
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
