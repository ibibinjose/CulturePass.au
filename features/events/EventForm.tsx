import { useState, useEffect, type ReactNode } from "react";
import { View, ScrollView, Pressable } from "react-native";

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
import { Icon } from "@/components/ui/Icon";
import { CohostManager } from "@/features/events/CohostManager";
import { useMyHubs } from "@/features/hubs/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCouncils } from "@/features/reference/api";
import { cn } from "@/lib/utils/cn";
import { colors } from "@/lib/theme";
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  AUSTRALIAN_STATES,
  HUB_TYPE_LABELS,
  type EventType,
  type HubType,
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
  /** Set on the edit screen — enables co-host management (needs a saved event). */
  eventId?: string;
}

/**
 * The full event create/edit form. Owns its field state; the parent supplies
 * the action buttons (Publish / Save draft / Save changes …) and validates the
 * returned values against the appropriate schema.
 */
export function EventForm({ initial, submitting, error, actions, onSubmit, footer, eventId }: EventFormProps) {
  const [form, setForm] = useState<EventFormValues>(initial);
  const set = (patch: Partial<EventFormValues>) => setForm((f) => ({ ...f, ...patch }));

  const { isAuthenticated } = useAuth();
  const { data: myHubs } = useMyHubs();
  const { data: councils } = useCouncils(form.location_state || undefined);

  // Auto-select hub if the user only has one hub
  useEffect(() => {
    if (!form.hub_id && myHubs && myHubs.length === 1 && myHubs[0]) {
      set({ hub_id: myHubs[0].id });
    }
  }, [myHubs, form.hub_id]);

  return (
    <View className="gap-8">
      {/* 1. Basic Details */}
      <Card className="p-5 gap-5 border border-linen bg-card">
        <Text className="font-display text-lg text-ink tracking-tight border-b border-linen/30 pb-2">1. Event Details</Text>
        
        {/* Hub selector when user has multiple hubs and creating a new event */}
        {isAuthenticated && myHubs && myHubs.length > 1 && !initial.hub_id ? (
          <Field label="Hosting Hub">
            <View className="gap-3">
              {myHubs.map((hub) => (
                <OptionCard
                  key={hub.id}
                  title={hub.name}
                  description={HUB_TYPE_LABELS[hub.type as HubType]}
                  selected={form.hub_id === hub.id}
                  onPress={() => set({ hub_id: hub.id })}
                />
              ))}
            </View>
          </Field>
        ) : null}

        <Field label="Event type">
          <View className="flex-row flex-wrap gap-2">
            {EVENT_TYPES.map((type) => {
              const on = form.type === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => set({ type })}
                  className={cn(
                    "rounded-xl px-3 py-2 border active:opacity-85",
                    on ? "border-ink bg-ink" : "border-linen/70 bg-card"
                  )}
                >
                  <Text className={cn("text-xs font-heading", on ? "text-paper" : "text-ink-muted")}>
                    {EVENT_TYPE_LABELS[type]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Title">
          <Input
            value={form.title}
            onChangeText={(title) => set({ title })}
            placeholder="e.g. Midwinter Night Concert"
          />
        </Field>

        <Field label="Description" optional>
          <Input
            value={form.description}
            onChangeText={(description) => set({ description })}
            placeholder="Describe what's happening..."
            multiline
            style={{ minHeight: 100 }}
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
            label="Upload event cover"
            helperText="Horizontal banner format looks best."
          />
        </Field>
      </Card>

      {/* 2. Date & Time */}
      <Card className="p-5 gap-5 border border-linen bg-card">
        <Text className="font-display text-lg text-ink tracking-tight border-b border-linen/30 pb-2">2. Date & Time</Text>
        <View className="gap-4 md:flex-row md:gap-3">
          <Field label="Start Time" className="flex-1">
            <DatePicker
              value={form.start_time}
              onChange={(start_time) => set({ start_time })}
              label=""
              mode="datetime"
            />
          </Field>
          <Field label="End Time" className="flex-1">
            <DatePicker
              value={form.end_time}
              onChange={(end_time) => set({ end_time })}
              label=""
              mode="datetime"
            />
          </Field>
        </View>
      </Card>

      {/* 3. Location */}
      <Card className="p-5 gap-5 border border-linen bg-card">
        <Text className="font-display text-lg text-ink tracking-tight border-b border-linen/30 pb-2">3. Location</Text>
        
        <Field label="State" optional>
          <View className="flex-row flex-wrap gap-2">
            {AUSTRALIAN_STATES.map((s) => (
              <Button
                key={s.code}
                label={s.code}
                variant={form.location_state === s.code ? "primary" : "outline"}
                size="sm"
                onPress={() =>
                  set({
                    location_state: form.location_state === s.code ? "" : s.code,
                    location_council_id: undefined, // reset council if state changes
                  })
                }
              />
            ))}
          </View>
        </Field>

        {form.location_state ? (
          <Field label="Local Council (LGA)" optional>
            <View className="gap-2">
              <Text className="text-[10px] text-ink-faint">
                Assigning this lets your event appear on the local My Council board.
              </Text>
              {councils && councils.length > 0 ? (
                <View className="max-h-48 rounded-2xl border border-linen bg-card overflow-hidden">
                  <ScrollView nestedScrollEnabled className="p-2 gap-1">
                    {councils.map((c) => {
                      const selected = form.location_council_id === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => set({ location_council_id: selected ? undefined : c.id })}
                          className={cn(
                            "px-3 py-2 rounded-xl flex-row items-center justify-between active:bg-sand",
                            selected ? "bg-sand" : "bg-transparent"
                          )}
                        >
                          <Text className="text-xs font-heading text-ink">{c.name}</Text>
                          {selected && <Icon name="check" size={14} color={colors.pink} />}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : (
                <Text variant="caption" tone="faint">Loading councils list...</Text>
              )}
            </View>
          </Field>
        ) : null}

        <Field label="City / Suburb" optional>
          <Input
            value={form.location_city}
            onChangeText={(location_city) => set({ location_city })}
            placeholder="e.g. Sydney"
          />
        </Field>
      </Card>

      {/* 4. Pricing & Options */}
      <Card className="p-5 gap-5 border border-linen bg-card">
        <Text className="font-display text-lg text-ink tracking-tight border-b border-linen/30 pb-2">4. Admission & Tickets</Text>
        
        <Toggle
          label="Free event"
          enabled={form.is_free}
          onToggle={(is_free) => set({ is_free, price: is_free ? undefined : 0 })}
        />
        {!form.is_free ? (
          <Field label="Ticket Price ($AUD)">
            <Input
              value={form.price?.toString() ?? ""}
              onChangeText={(text) => set({ price: text ? parseFloat(text) : undefined })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </Field>
        ) : null}

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
      </Card>

      {/* 5. Classification */}
      <Card className="p-5 gap-5 border border-linen bg-card">
        <Text className="font-display text-lg text-ink tracking-tight border-b border-linen/30 pb-2">5. Tags & Categorization</Text>
        
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
      </Card>

      {/* 6. Co-hosts & partners */}
      <Card className="p-5 gap-5 border border-linen bg-card">
        <Text className="font-display text-lg text-ink tracking-tight border-b border-linen/30 pb-2">
          6. Co-hosts & Partners
        </Text>
        {eventId ? (
          <CohostManager eventId={eventId} hostHubId={form.hub_id} />
        ) : (
          <View className="flex-row items-start gap-3 rounded-2xl border border-dashed border-linen bg-sand/15 p-4">
            <Icon name="users" size={18} color={colors.inkFaint} />
            <Text variant="caption" tone="faint" className="flex-1 leading-5">
              Save this event first, then reopen it to invite other communities, businesses, venues or
              people as co-hosts. Each co-host must approve before they appear on the event.
            </Text>
          </View>
        )}
      </Card>

      {error ? (
        <Card className="border-danger/30 bg-terracotta-50">
          <Text variant="caption" className="text-terracotta-600">
            {error}
          </Text>
        </Card>
      ) : null}

      <View className="gap-3 mt-4">
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
