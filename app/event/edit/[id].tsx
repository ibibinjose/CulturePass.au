import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { Card } from "@/components/ui/Card";
import { eventDraftSchema, eventPublishSchema } from "@/lib/validation/event";
import { useEvent, useUpdateEvent, useDeleteEvent } from "@/features/events/api";
import { useMyProfile } from "@/features/profiles/api";
import { EventForm, type EventFormValues, type EventFormAction } from "@/features/events/EventForm";

export default function EditEventScreen() {
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
    location_city: event.location_city ?? "",
    location_state: event.location_state ?? "",
    location_council_id: event.location_council_id ?? undefined,
    capacity: event.capacity ?? undefined,
    images: event.images ?? [],
    tags: event.tags ?? [],
    cultural_focus: event.cultural_focus ?? [],
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
    const parsed = schema.safeParse(values);
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
