import { useState, type ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button, type ButtonProps } from "@/components/ui/Button";
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
  type EventType,
} from "@/lib/constants";

/** Raw (string-friendly) form state shared by create + edit. */
export interface EventFormValues {
  hub_id: string;
  type: EventType;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_free: boolean;
  price?: number;
  ticket_url: string;
  location_city: string;
  location_state: string;
  location_council_id?: string;
  capacity?: number;
  images: { url: string; alt?: string }[];
  tags: string[];
  cultural_focus: string[];
}

export function emptyEventForm(hubId: string): EventFormValues {
  return {
    hub_id: hubId,
    type: "event",
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    is_free: true,
    price: undefined,
    ticket_url: "",
    location_city: "",
    location_state: "",
    location_council_id: undefined,
    capacity: undefined,
    images: [],
    tags: [],
    cultural_focus: [],
  };
}

export interface EventFormAction {
  key: string;
  label: string;
  /** Whether this action targets a published status (drives validation). */
  publish: boolean;
  variant?: ButtonProps["variant"];
}

interface EventFormProps {
  initial: EventFormValues;
  submitting: boolean;
  error?: string | null;
  actions: EventFormAction[];
  onSubmit: (values: EventFormValues, opts: { publish: boolean }) => void;
  /** Extra footer content (e.g. a delete button on the edit screen). */
  footer?: ReactNode;
}

/**
 * The full event create/edit form. Owns its field state; the parent supplies
 * the action buttons (Publish / Save draft / Save changes …) and validates the
 * returned values against the appropriate schema.
 */
export function EventForm({ initial, submitting, error, actions, onSubmit, footer }: EventFormProps) {
  const [form, setForm] = useState<EventFormValues>(initial);
  const set = (patch: Partial<EventFormValues>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <View className="gap-6">
      <Field label="Event type">
        <View className="gap-3">
          {EVENT_TYPES.map((type) => (
            <OptionCard
              key={type}
              title={EVENT_TYPE_LABELS[type]}
              description={EVENT_TYPE_DESCRIPTIONS[type]}
              selected={form.type === type}
              onPress={() => set({ type })}
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
          placeholder="Describe your event…"
          multiline
        />
      </Field>

      <View className="gap-6 md:flex-row md:gap-3">
        <Field label="Start" className="flex-1">
          <DatePicker
            value={form.start_time}
            onChange={(start_time) => set({ start_time })}
            label=""
            mode="datetime"
          />
        </Field>
        <Field label="End" className="flex-1">
          <DatePicker
            value={form.end_time}
            onChange={(end_time) => set({ end_time })}
            label=""
            mode="datetime"
          />
        </Field>
      </View>

      <Card className="gap-4 p-4">
        <Text variant="subheading">Pricing</Text>
        <Toggle
          label="Free event"
          enabled={form.is_free}
          onToggle={(is_free) => set({ is_free, price: is_free ? undefined : 0 })}
        />
        {!form.is_free ? (
          <Field label="Price ($AUD)">
            <Input
              value={form.price?.toString() ?? ""}
              onChangeText={(text) => set({ price: text ? parseFloat(text) : undefined })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </Field>
        ) : null}
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
          value={form.capacity?.toString() ?? ""}
          onChangeText={(text) => set({ capacity: text ? parseInt(text, 10) : undefined })}
          placeholder="Unlimited"
          keyboardType="number-pad"
        />
      </Field>

      <Field label="Cover image" optional>
        <ImagePickerComponent
          currentImageUrl={form.images[0]?.url ?? null}
          onImageChange={(url) =>
            set({ images: url ? [{ url, alt: form.title || "Event image" }] : [] })
          }
          imageType="event"
          folderPath="event-images"
          label="Upload event image"
          helperText="A square cover image looks best across the app."
        />
      </Field>

      <Field label="State" optional>
        <View className="flex-row flex-wrap gap-2">
          {AUSTRALIAN_STATES.map((s) => (
            <Button
              key={s.code}
              label={s.code}
              variant={form.location_state === s.code ? "primary" : "outline"}
              size="sm"
              onPress={() =>
                set({ location_state: form.location_state === s.code ? "" : s.code })
              }
            />
          ))}
        </View>
      </Field>

      <Field label="City" optional>
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

      <Field label="Cultural focus" optional>
        <TagInput
          value={form.cultural_focus}
          onChange={(cultural_focus) => set({ cultural_focus })}
          placeholder="e.g. Indigenous, Multicultural"
        />
      </Field>

      {error ? (
        <Card className="border-danger/30 bg-terracotta-50">
          <Text variant="caption" className="text-terracotta-600">
            {error}
          </Text>
        </Card>
      ) : null}

      <View className="gap-3">
        {actions.map((action) => (
          <Button
            key={action.key}
            label={action.label}
            variant={action.variant}
            loading={submitting && action.variant !== "outline" && action.variant !== "ghost"}
            disabled={submitting}
            onPress={() => onSubmit(form, { publish: action.publish })}
          />
        ))}
        {footer}
      </View>
    </View>
  );
}
