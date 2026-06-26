import { View } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/constants";
import type { HubImage } from "@/lib/supabase/database.types";

export interface EventCardData {
  id: string;
  hub_id: string;
  type: EventType;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  is_free: boolean;
  price: number | null;
  location_city: string | null;
  location_state: string | null;
  images: HubImage[];
  cultural_focus: string[];
  hub: {
    name: string;
    slug: string;
    indigenous_led: boolean;
    traditional_custodians: string[];
  } | null;
}

export function EventCard({ event }: { event: EventCardData }) {
  const router = useRouter();
  const place = [event.location_city, event.location_state].filter(Boolean).join(", ");
  
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

  return (
    <Card onPress={() => router.push(`/event/${event.id}`)} className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <Badge label={EVENT_TYPE_LABELS[event.type]} variant="neutral" />
        {event.is_free ? (
          <Badge label="Free" variant="success" />
        ) : event.price ? (
          <Badge label={`$${event.price}`} variant="info" />
        ) : null}
      </View>

      <Text variant="subheading" numberOfLines={2}>
        {event.title}
      </Text>

      {event.description ? (
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {event.description}
        </Text>
      ) : null}

      <View className="mt-2 gap-1">
        {event.start_time ? (
          <Text variant="caption" tone="faint">
            {formatDate(event.start_time)} at {formatTime(event.start_time)}
          </Text>
        ) : null}
        
        {place ? (
          <Text variant="caption" tone="faint">
            {place}
          </Text>
        ) : null}
        
        {event.cultural_focus.length > 0 ? (
          <Text variant="caption" tone="eucalyptus">
            {event.cultural_focus.join(" • ")}
          </Text>
        ) : null}
      </View>

      {event.hub ? (
        <View className="mt-2">
          <Text variant="caption" tone="muted">
            By {event.hub.name}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}