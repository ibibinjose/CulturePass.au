import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { OptionCard } from "@/components/ui/OptionCard";
import { TagInput } from "@/components/ui/TagInput";
import { ImagePickerComponent } from "@/components/ui/ImagePicker";
import { Toggle } from "@/components/ui/Toggle";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_DESCRIPTIONS,
  AUSTRALIAN_STATES,
} from "@/lib/constants";
import { eventDraftSchema, eventPublishSchema } from "@/lib/validation/event";
import { useCouncils } from "@/features/reference/api";
import { useCreateEvent } from "@/features/events/api";
import { useHub } from "@/features/hubs/api";

export default function CreateEventScreen() {
  const router = useRouter();
  const { hubId } = useLocalSearchParams<{ hubId: string }>();
  const { data: hub } = useHub(hubId || '');
  const createEvent = useCreateEvent();
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    hub_id: hubId || '',
    type: 'event' as const,
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    is_free: true,
    price: undefined as number | undefined,
    ticket_url: '',
    location_city: '',
    location_state: '',
    location_council_id: undefined as string | undefined,
    capacity: undefined as number | undefined,
    images: [] as { url: string; alt?: string }[],
    tags: [] as string[],
    cultural_focus: [] as string[],
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(publish: boolean) {
    setBanner(null);
    const schema = publish ? eventPublishSchema : eventDraftSchema;
    const parsed = schema.safeParse({ ...form });
    if (!parsed.success) {
      setBanner(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setSubmitting(true);
    try {
      await createEvent.mutateAsync({
        ...parsed.data,
        status: publish ? 'published' : 'draft',
      });
      router.back();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-10">
      <Button
        label="← Back"
        variant="ghost"
        size="sm"
        className="mb-6 self-start"
        onPress={() => router.back()}
      />

      <Text variant="overline" tone="ochre">
        New Event
      </Text>
      <Text variant="title" className="mt-2">
        Create your event
      </Text>
      <Text variant="body" tone="muted" className="mt-3">
        Share details about your event with the community.
      </Text>

      <View className="mt-8 gap-6">
        <Field label="Event Type">
          <View className="gap-3">
            {EVENT_TYPES.map((type) => (
              <OptionCard
                key={type}
                title={EVENT_TYPE_LABELS[type]}
                description={EVENT_TYPE_DESCRIPTIONS[type]}
                selected={form.type === type}
                onPress={() => set({ type: type as typeof form.type })}
              />
            ))}
          </View>
        </Field>

        <Field label="Title">
          <Input
            value={form.title}
            onChangeText={(title) => set({ title })}
            placeholder="Event title"
          />
        </Field>

        <Field label="Description" optional>
          <Input
            value={form.description}
            onChangeText={(description) => set({ description })}
            placeholder="Describe your event..."
            multiline
          />
        </Field>

        <View className="flex-row gap-3">
          <Field label="Start Date/Time" className="flex-1">
            <DatePicker
              value={form.start_time}
              onChange={(start_time) => set({ start_time })}
              label=""
              mode="datetime"
            />
          </Field>
          <Field label="End Date/Time" className="flex-1">
            <DatePicker
              value={form.end_time}
              onChange={(end_time) => set({ end_time })}
              label=""
              mode="datetime"
            />
          </Field>
        </View>

        <Card className="p-4 gap-4">
          <Text variant="subheading">Pricing</Text>
          <View className="flex-row items-center gap-4">
            <Toggle
              label="Free Event"
              enabled={form.is_free}
              onToggle={(is_free) => {
                set({ is_free, price: is_free ? undefined : 0 });
              }}
            />
          </View>
          {!form.is_free && (
            <Field label="Price ($AUD)">
              <Input
                value={form.price?.toString() || ''}
                onChangeText={(text) => set({ price: text ? parseFloat(text) : undefined })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </Field>
          )}
        </Card>

        <Field label="Ticket URL" optional>
          <Input
            value={form.ticket_url}
            onChangeText={(ticket_url) => set({ ticket_url })}
            placeholder="https://tickets.example.com"
            autoCapitalize="none"
            keyboardType="url"
          />
        </Field>

        <Field label="Capacity" optional>
          <Input
            value={form.capacity?.toString() || ''}
            onChangeText={(text) => set({ capacity: text ? parseInt(text, 10) : undefined })}
            placeholder="Unlimited"
            keyboardType="number-pad"
          />
        </Field>

        <Field label="Images" optional>
          <ImagePickerComponent
            currentImageUrl={form.images && form.images.length > 0 ? form.images[0].url : null}
            onImageChange={(url) => {
              if (url) {
                set({ images: [{ url, alt: "Event image" }] });
              } else {
                set({ images: [] });
              }
            }}
            imageType="event"
            folderPath="event-images"
            label="Upload Event Image"
            helperText="Add a cover image for your event"
          />
        </Field>

        <Field label="Location State" optional>
          <View className="flex-row flex-wrap gap-2">
            {AUSTRALIAN_STATES.map((s) => (
              <Button
                key={s.code}
                label={s.code}
                variant={form.location_state === s.code ? "primary" : "outline"}
                size="sm"
                onPress={() => set({ location_state: s.code })}
              />
            ))}
          </View>
        </Field>

        <Field label="Location City" optional>
          <Input
            value={form.location_city}
            onChangeText={(location_city) => set({ location_city })}
            placeholder="e.g. Sydney"
          />
        </Field>

        <Field label="Tags" optional>
          <TagInput
            value={form.tags}
            onChange={(tags) => set({ tags })}
            placeholder="Add searchable tags"
          />
        </Field>

        <Field label="Cultural Focus" optional>
          <TagInput
            value={form.cultural_focus}
            onChange={(cultural_focus) => set({ cultural_focus })}
            placeholder="e.g. Indigenous, Multicultural"
          />
        </Field>

        {banner ? (
          <Card className="border-danger/30 bg-terracotta-50">
            <Text variant="caption" className="text-terracotta-600">
              {banner}
            </Text>
          </Card>
        ) : null}

        <View className="gap-3">
          <Button
            label="Publish event"
            loading={submitting}
            onPress={() => submit(true)}
          />
          <Button
            label="Save as draft"
            variant="outline"
            disabled={submitting}
            onPress={() => submit(false)}
          />
        </View>
      </View>
    </Screen>
  );
}