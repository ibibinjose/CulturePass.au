import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { useEvent } from "@/features/events/api";
import {
  EVENT_TYPE_LABELS,
  type EventType,
  HUB_TYPE_LABELS,
  type HubType,
} from "@/lib/constants";

export default function EventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, isLoading, isError } = useEvent(id ?? "");

  if (isLoading) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-10">
        <Text variant="caption" tone="faint">
          Loading…
        </Text>
      </Screen>
    );
  }

  if (isError || !event) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-10">
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
        <Text variant="title" className="mt-6">
          Event not found
        </Text>
        <Text variant="body" tone="muted" className="mt-2">
          It may be unpublished, or your Supabase project isn’t connected yet.
        </Text>
      </Screen>
    );
  }

  // Format date and time
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };
  
  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const place = [event.location_city, event.location_state].filter(Boolean).join(", ");

  return (
    <Screen maxWidth="prose" contentClassName="pt-10">
      <View className="mb-6 flex-row items-center justify-between">
        <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
        {event.status === "published" ? (
          <Badge label="Published" variant="eucalyptus" />
        ) : event.status === "draft" ? (
          <Badge label="Draft" variant="warning" />
        ) : (
          <Badge label="Cancelled" variant="danger" />
        )}
      </View>

      {/* Header */}
      <View className="flex-row items-center gap-2">
        <Badge label={EVENT_TYPE_LABELS[event.type as EventType]} />
        {event.is_free ? (
          <Badge label="Free" variant="success" />
        ) : event.price ? (
          <Badge label={`$${event.price}`} variant="info" />
        ) : null}
      </View>
      <Text variant="title" className="mt-4">
        {event.title}
      </Text>
      {event.description ? (
        <Text variant="bodyLarge" tone="muted" className="mt-3">
          {event.description}
        </Text>
      ) : null}

      {/* Event Details */}
      <View className="mt-10 gap-4">
        <Text variant="overline" tone="faint">
          Event Details
        </Text>
        <Card className="gap-4">
          {event.start_time ? (
            <DetailRow 
              label="Date & Time" 
              value={`${formatDate(event.start_time)} at ${formatTime(event.start_time)}`}
            />
          ) : null}
          
          {event.end_time ? (
            <DetailRow 
              label="Ends" 
              value={`${formatDate(event.end_time)} at ${formatTime(event.end_time)}`}
            />
          ) : null}
          
          {place ? <DetailRow label="Location" value={place} /> : null}
          {event.capacity ? <DetailRow label="Capacity" value={event.capacity.toString()} /> : null}
          {event.ticket_url ? (
            <DetailRow 
              label="Tickets" 
              value={event.ticket_url} 
            />
          ) : null}
        </Card>
      </View>

      {/* Hosted by */}
      {event.hub ? (
        <View className="mt-10">
          <Text variant="overline" tone="faint">
            Hosted by
          </Text>
          <Card
            className="mt-3 p-4"
            onPress={() => event.hub && router.push(`/hub/${event.hub.slug}`)}
          >
            <Text variant="subheading">{event.hub.name}</Text>
            <Text variant="caption" tone="muted" className="mt-1">
              {HUB_TYPE_LABELS[event.hub.type as HubType]}
            </Text>
          </Card>
        </View>
      ) : null}

      {/* Cultural Focus */}
      {event.cultural_focus && event.cultural_focus.length > 0 ? (
        <View className="mt-10">
          <Text variant="overline" tone="faint">
            Cultural Focus
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {event.cultural_focus.map((focus) => (
              <Badge key={focus} label={focus} variant="outline" />
            ))}
          </View>
        </View>
      ) : null}

      {/* Tags */}
      {event.tags && event.tags.length > 0 ? (
        <View className="mt-10">
          <Text variant="overline" tone="faint">
            Tags
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {event.tags.map((tag) => (
              <Badge key={tag} label={tag} variant="outline" />
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