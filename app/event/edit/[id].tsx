import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  BackButton,
  Button,
  Card,
  Screen,
  Text,
} from "@/components/ui";
import { eventDraftSchema, eventPublishSchema } from "@/lib/validation/event";
import { useEvent, useUpdateEvent, useDeleteEvent } from "@/features/events/api";
import { useMyProfile } from "@/features/profiles/api";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { EventForm, type EventFormValues, type EventFormAction } from "@/features/events/EventForm";

export default function EditEventScreen() {
  // Sign-in is required to edit; the inner screen additionally checks that the
  // signed-in profile owns the event's hub before allowing edits or deletion.
  return (
    <RequireAuth>
      <EditEventScreenInner />
    </RequireAuth>
  );
}

function EditEventScreenInner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, isLoading } = useEvent(id ?? "");
  const { data: profile } = useMyProfile();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (isLoading) {
    return (
      <Screen maxWidth="form" contentClassName="pt-10">
        <Text variant="caption" tone="faint">
          Loading…
        </Text>
      </Screen>
    );
  }

  const ownerId = (event?.hub as { owner_id?: string } | null)?.owner_id;
  const canManage = !!event && !!profile && ownerId === profile.id;

  if (!event || !canManage) {
    return (
      <Screen maxWidth="form" contentClassName="pt-6">
        <BackButton fallbackHref="/" className="mb-4" />
        <Text variant="title">Can’t edit this event</Text>
        <Text variant="body" tone="muted" className="mt-2">
          {event ? "You can only edit events for hubs you own." : "This event no longer exists."}
        </Text>
      </Screen>
    );
  }

  // Narrowed, stable reference so the async handlers below keep the non-null type.
  const ev = event;

  const isOnline = event.location_city?.toLowerCase() === "online";
  let venueAddress = "";
  let city = event.location_city ?? "";
  if (!isOnline && city.includes(",")) {
    const parts = city.split(",");
    city = parts.pop()?.trim() ?? "";
    venueAddress = parts.join(",").trim();
  }

  const initial: EventFormValues = {
    hub_id: event.hub_id,
    type: event.type,
    title: event.title ?? "",
    description: event.description ?? "",
    start_time: event.start_time ?? "",
    end_time: event.end_time ?? "",
    is_free: event.is_free,
    price: event.price ?? undefined,
    ticket_url: event.ticket_url ?? "",
    location_city: isOnline ? "" : city,
    location_state: event.location_state ?? "",
    location_council_id: event.location_council_id ?? undefined,
    capacity: event.capacity ?? undefined,
    images: event.images ?? [],
    tags: event.tags ?? [],
    cultural_focus: event.cultural_focus ?? [],
    is_online: isOnline,
    venue_address: venueAddress,
    online_url: isOnline ? (event.ticket_url ?? "") : "",
  };

  const isPublished = event.status === "published";

  const actions: EventFormAction[] = isPublished
    ? [
        { key: "save", label: "Save changes", publish: true, variant: "primary" },
        { key: "unpublish", label: "Unpublish (save as draft)", publish: false, variant: "outline" },
      ]
    : [
        { key: "publish", label: "Publish event", publish: true, variant: "whatsapp" },
        { key: "save", label: "Save draft", publish: false, variant: "outline" },
      ];

  async function handleSubmit(values: EventFormValues, { publish }: { publish: boolean }) {
    setBanner(null);
    const schema = publish ? eventPublishSchema : eventDraftSchema;

    // Combine venue address and city suburb for physical events
    const locationCity = values.is_online
      ? "Online"
      : [values.venue_address, values.location_city].filter(Boolean).join(", ");

    // If online, prioritize online_url for stream/tickets link
    const ticketUrl = values.is_online
      ? (values.online_url || values.ticket_url)
      : values.ticket_url;

    // Prepend the stream link to description if not already present
    let finalDescription = values.description || "";
    if (values.is_online && values.online_url && !finalDescription.includes(values.online_url)) {
      finalDescription = `**Stream Link:** ${values.online_url}\n\n${finalDescription}`;
    }

    const payload = {
      ...values,
      location_city: locationCity || null,
      ticket_url: ticketUrl || null,
      description: finalDescription || null,
    };

    // Remove temp local fields to satisfy validation and Supabase table schema
    delete (payload as any).is_online;
    delete (payload as any).venue_address;
    delete (payload as any).online_url;

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setBanner(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setSubmitting(true);
    try {
      await updateEvent.mutateAsync({
        id: ev.id,
        patch: { ...parsed.data, status: publish ? "published" : "draft" },
      });
      router.back();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setBanner(null);
    try {
      await deleteEvent.mutateAsync({ id: ev.id, hubId: ev.hub_id });
      router.replace(`/hub/${(ev.hub as { slug?: string } | null)?.slug ?? ""}`);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Couldn’t delete the event.");
    }
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton fallbackHref="/" className="mb-5" />

      <Text variant="overline" tone="pink">
        Edit event
      </Text>
      <Text variant="title" className="mt-2">
        {event.title || "Untitled event"}
      </Text>
      <Text variant="lead" className="mb-8 mt-3">
        Currently {isPublished ? "published and visible" : "a draft (only you can see it)"}.
      </Text>

      <EventForm
        initial={initial}
        submitting={submitting}
        error={banner}
        onSubmit={handleSubmit}
        actions={actions}
        eventId={ev.id}
        footer={
          <Card className="mt-2 gap-3 border-danger/30 p-4">
            <Text variant="subheading">Danger zone</Text>
            {confirmingDelete ? (
              <View className="gap-3">
                <Text variant="caption" tone="muted">
                  Delete this event permanently? This can’t be undone.
                </Text>
                <View className="flex-row gap-3">
                  <Button
                    label="Yes, delete"
                    variant="danger"
                    className="flex-1"
                    loading={deleteEvent.isPending}
                    onPress={handleDelete}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    className="flex-1"
                    disabled={deleteEvent.isPending}
                    onPress={() => setConfirmingDelete(false)}
                  />
                </View>
              </View>
            ) : (
              <Button
                label="Delete event"
                variant="outline"
                className="self-start"
                onPress={() => setConfirmingDelete(true)}
              />
            )}
          </Card>
        }
      />
    </Screen>
  );
}
