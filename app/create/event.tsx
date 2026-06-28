import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  BackButton,
  Screen,
  Text,
} from "@/components/ui";
import { eventDraftSchema, eventPublishSchema } from "@/lib/validation/event";
import { useCreateEvent } from "@/features/events/api";
import { EventForm, emptyEventForm, type EventFormValues } from "@/features/events/EventForm";

export default function CreateEventScreen() {
  const router = useRouter();
  const { hubId } = useLocalSearchParams<{ hubId: string }>();
  const createEvent = useCreateEvent();
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      await createEvent.mutateAsync({
        ...parsed.data,
        status: publish ? "published" : "draft",
      });
      router.back();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton className="mb-5" />

      <Text variant="overline" tone="pink">
        New event
      </Text>
      <Text variant="title" className="mt-2">
        Create your event
      </Text>
      <Text variant="lead" className="mb-8 mt-3">
        Share details about your event with the community.
      </Text>

      <EventForm
        initial={emptyEventForm(hubId || "")}
        submitting={submitting}
        error={banner}
        onSubmit={handleSubmit}
        actions={[
          { key: "publish", label: "Publish event", publish: true, variant: "whatsapp" },
          { key: "draft", label: "Save as draft", publish: false, variant: "outline" },
        ]}
      />
    </Screen>
  );
}
