import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";

import {
  Avatar,
  BackButton,
  Badge,
  Button,
  Card,
  DatePicker,
  Divider,
  Field,
  Icon,
  ImagePickerComponent,
  Input,
  OptionCard,
  Screen,
  Stepper,
  TagInput,
  Text,
  Toggle,
  RichText,
} from "@/components/ui";
import { colors } from "@/lib/theme";

import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  AUSTRALIAN_STATES,
  HUB_TYPE_LABELS,
  type HubType,
} from "@/lib/constants";
import { eventDraftSchema, eventPublishSchema } from "@/lib/validation/event";
import { useCouncils } from "@/features/reference/api";
import { useCreateEvent } from "@/features/events/api";
import { useMyHubs } from "@/features/hubs/api";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  useEventDraftStore,
  EVENT_WIZARD_STEPS,
  type EventDraft,
} from "@/features/events/useEventDraftStore";
import { cn } from "@/lib/utils/cn";

export default function CreateEventScreen() {
  const router = useRouter();
  const { hubId } = useLocalSearchParams<{ hubId: string }>();
  const { step, draft, next, back, setStep, update, reset } = useEventDraftStore();
  const createEvent = useCreateEvent();
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: myHubs, isLoading: hubsLoading } = useMyHubs();
  const { isAuthenticated } = useAuth();

  // The set of pages the signed-in user actually owns. Events can only be
  // hosted under one of these — never someone else's page.
  const ownedHubIds = useMemo(
    () => new Set((myHubs ?? []).map((h) => h.id)),
    [myHubs],
  );

  // Auto-select the hosting page, but only ever to a hub the user owns.
  useEffect(() => {
    if (!myHubs) return;
    if (hubId && ownedHubIds.has(hubId)) {
      update({ hub_id: hubId });
    } else if (!draft.hub_id && myHubs.length === 1 && myHubs[0]) {
      update({ hub_id: myHubs[0].id });
    } else if (draft.hub_id && !ownedHubIds.has(draft.hub_id)) {
      // A persisted draft may reference a page the user no longer owns.
      update({ hub_id: "" });
    }
  }, [hubId, myHubs, ownedHubIds, draft.hub_id, update]);

  const canContinue = useMemo(() => stepIsValid(step, draft), [step, draft]);
  const isLast = step === EVENT_WIZARD_STEPS.length - 1;

  // You can't host an event without a page. Signed-in users who own no pages
  // are sent to create one first (login itself is enforced by the create layout).
  const ownsNoHubs = !hubsLoading && !!myHubs && myHubs.length === 0;

  async function submit(publish: boolean) {
    setBanner(null);

    // Permission guard: only publish under a page the user owns.
    if (!draft.hub_id || !ownedHubIds.has(draft.hub_id)) {
      setBanner("Choose one of your pages to host this event.");
      return;
    }

    // Validate draft before submission
    const schema = publish ? eventPublishSchema : eventDraftSchema;
    
    // Construct database payload
    // Combine venue address and city suburb for physical events
    const locationCity = draft.is_online
      ? "Online"
      : [draft.venue_address, draft.location_city].filter(Boolean).join(", ");

    // If online, prioritize online_url for stream/tickets link
    const ticketUrl = draft.is_online
      ? (draft.online_url || draft.ticket_url)
      : draft.ticket_url;

    // We can also prepend the stream link to description
    let finalDescription = draft.description || "";
    if (draft.is_online && draft.online_url) {
      finalDescription = `**Stream Link:** ${draft.online_url}\n\n${finalDescription}`;
    }

    const payload = {
      ...draft,
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
      await createEvent.mutateAsync({
        ...parsed.data,
        status: publish ? "published" : "draft",
      });
      reset(hubId || "");
      router.back();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (ownsNoHubs) {
    return (
      <Screen maxWidth="form" contentClassName="pt-6">
        <View className="mb-6 flex-row items-center justify-between">
          <BackButton onPress={() => router.back()} />
          <Text variant="overline" tone="pink">
            New Event
          </Text>
        </View>
        <Card className="gap-3 border border-linen bg-card p-5">
          <Text variant="subheading">Create a page first</Text>
          <Text variant="caption" tone="muted">
            Events are published from a page you own. Create a page for your community,
            organisation, venue or practice, then host events from it.
          </Text>
          <Button
            label="Create a page"
            className="mt-2 self-start"
            onPress={() => router.replace("/create/hub")}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <View className="mb-6 flex-row items-center justify-between">
        <BackButton onPress={() => (step === 0 ? router.back() : back())} />
        <Text variant="overline" tone="pink">
          New Event
        </Text>
      </View>

      <Stepper steps={EVENT_WIZARD_STEPS} current={step} className="mb-8" />

      {step === 0 && <StepDetails draft={draft} update={update} myHubs={myHubs} isAuthenticated={isAuthenticated} />}
      {step === 1 && <StepDateTime draft={draft} update={update} />}
      {step === 2 && <StepLocation draft={draft} update={update} />}
      {step === 3 && <StepTickets draft={draft} update={update} />}
      {step === 4 && <StepClassification draft={draft} update={update} />}
      {step === 5 && <StepReview draft={draft} update={update} onEditStep={setStep} myHubs={myHubs} />}

      {banner ? (
        <Card className="mt-6 border-danger/30 bg-terracotta-50">
          <Text variant="caption" className="text-terracotta-600">
            {banner}
          </Text>
        </Card>
      ) : null}

      <View className="mt-8 gap-3">
        {isLast ? (
          <>
            <Button
              label="Publish event"
              variant="whatsapp"
              loading={submitting}
              onPress={() => submit(true)}
            />
            <Button
              label="Save draft"
              variant="outline"
              disabled={submitting}
              onPress={() => submit(false)}
            />
          </>
        ) : (
          <Button label="Continue" disabled={!canContinue} onPress={next} />
        )}
        <Text variant="caption" tone="faint" className="text-center">
          Your progress saves automatically on this device.
        </Text>
      </View>
    </Screen>
  );
}

function stepIsValid(step: number, draft: EventDraft): boolean {
  switch (step) {
    case 0:
      return !!draft.hub_id;
    case 1:
      if (draft.start_time && draft.end_time && draft.end_time < draft.start_time) return false;
      return true;
    case 3:
      if (!draft.is_free && (draft.price === undefined || isNaN(draft.price) || draft.price <= 0)) return false;
      return true;
    default:
      return true;
  }
}

function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-4">
      <Text variant="subheading" className="font-display text-xl text-ink tracking-tight">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" tone="muted" className="mt-1 leading-5">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

// Step Components
interface StepProps {
  draft: EventDraft;
  update: (patch: Partial<EventDraft>) => void;
}

function StepDetails({ draft, update, myHubs, isAuthenticated }: StepProps & { myHubs: any[] | undefined; isAuthenticated: boolean }) {
  return (
    <Card className="p-5 gap-5 border border-linen bg-card">
      <StepHeading
        title="Event Details"
        subtitle="Give your event a title, description, and choose which community hosts it."
      />

      {isAuthenticated && myHubs && myHubs.length > 1 && !draft.hub_id ? (
        <Field label="Hosting Page">
          <View className="gap-3">
            {myHubs.map((hub) => (
              <OptionCard
                key={hub.id}
                title={hub.name}
                description={HUB_TYPE_LABELS[hub.type as HubType]}
                selected={draft.hub_id === hub.id}
                onPress={() => update({ hub_id: hub.id })}
              />
            ))}
          </View>
        </Field>
      ) : null}

      <Field label="Event type">
        <View className="flex-row flex-wrap gap-2">
          {EVENT_TYPES.map((type) => {
            const on = draft.type === type;
            return (
              <Pressable
                key={type}
                onPress={() => update({ type })}
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
          value={draft.title}
          onChangeText={(title) => update({ title })}
          placeholder="e.g. Midwinter Night Concert"
        />
      </Field>

      <Field label="Description" optional>
        <Input
          value={draft.description}
          onChangeText={(description) => update({ description })}
          placeholder="Describe what's happening..."
          multiline
          style={{ minHeight: 100 }}
        />
      </Field>

      <Field label="Cover image" optional>
        <ImagePickerComponent
          currentImageUrl={draft.images[0]?.url ?? null}
          onImageChange={(url) =>
            update({ images: url ? [{ url, alt: draft.title || "Event image" }] : [] })
          }
          imageType="event"
          folderPath="event-images"
          label="Upload event cover"
          helperText="Square 1:1 format looks best."
        />
      </Field>
    </Card>
  );
}

function StepDateTime({ draft, update }: StepProps) {
  return (
    <Card className="p-5 gap-5 border border-linen bg-card">
      <StepHeading
        title="Date & Time"
        subtitle="Specify when the event starts and ends. End times are optional."
      />
      <View className="gap-4 md:flex-row md:gap-3">
        <Field label="Start Time" className="flex-1">
          <DatePicker
            value={draft.start_time}
            onChange={(start_time: string | undefined) => update({ start_time })}
            label=""
            mode="datetime"
          />
        </Field>
        <Field label="End Time" className="flex-1" optional>
          <DatePicker
            value={draft.end_time}
            onChange={(end_time: string | undefined) => update({ end_time })}
            label=""
            mode="datetime"
          />
        </Field>
      </View>
    </Card>
  );
}

function StepLocation({ draft, update }: StepProps) {
  const { data: councils } = useCouncils(draft.location_state || undefined);
  const [councilSearch, setCouncilSearch] = useState("");

  return (
    <Card className="p-5 gap-5 border border-linen bg-card">
      <StepHeading
        title="Where is it happening?"
        subtitle="Specify whether this event is online or has a physical venue."
      />

      <Toggle
        label="This is an online / virtual event"
        enabled={!!draft.is_online}
        onToggle={(is_online) => {
          update({
            is_online,
            location_state: "",
            location_council_id: undefined,
            location_city: is_online ? "Online" : "",
            venue_address: "",
          });
          setCouncilSearch("");
        }}
      />

      {draft.is_online ? (
        <Field label="Online Streaming / Join URL">
          <Input
            value={draft.online_url || ""}
            onChangeText={(online_url) => update({ online_url })}
            placeholder="e.g. https://zoom.us/j/... or YouTube Live stream URL"
            autoCapitalize="none"
            keyboardType="url"
          />
        </Field>
      ) : (
        <>
          <Field label="Venue / Street Address" optional>
            <Input
              value={draft.venue_address || ""}
              onChangeText={(venue_address) => update({ venue_address })}
              placeholder="e.g. Sydney Town Hall, 483 George St"
            />
          </Field>

          <Field label="City / Suburb">
            <Input
              value={draft.location_city === "Online" ? "" : draft.location_city}
              onChangeText={(location_city) => update({ location_city })}
              placeholder="e.g. Sydney"
            />
          </Field>

          <Field label="State" optional>
            <View className="flex-row flex-wrap gap-2">
              {AUSTRALIAN_STATES.map((s) => (
                <Button
                  key={s.code}
                  label={s.code}
                  variant={draft.location_state === s.code ? "primary" : "outline"}
                  size="sm"
                  onPress={() => {
                    update({
                      location_state: draft.location_state === s.code ? "" : s.code,
                      location_council_id: undefined,
                    });
                    setCouncilSearch("");
                  }}
                />
              ))}
            </View>
          </Field>

          {draft.location_state ? (
            <Field label="Local Council (LGA)" optional>
              <View className="gap-2">
                <Text className="text-[10px] text-ink-faint">
                  Assigning this lets your event appear on the local My Council board.
                </Text>
                {councils && councils.length > 0 ? (
                  <>
                    <Input
                      value={councilSearch}
                      onChangeText={setCouncilSearch}
                      placeholder="Search councils…"
                      className="mb-1"
                    />
                    <View className="max-h-48 rounded-2xl border border-linen bg-card overflow-hidden">
                      <ScrollView nestedScrollEnabled className="p-2 gap-1">
                        {(() => {
                          const filtered = councils.filter((c) =>
                            c.name.toLowerCase().includes(councilSearch.trim().toLowerCase())
                          );
                          if (filtered.length === 0) {
                            return (
                              <View className="p-3 items-center">
                                <Text variant="caption" tone="faint">No councils match</Text>
                              </View>
                            );
                          }
                          return filtered.map((c) => {
                            const selected = draft.location_council_id === c.id;
                            return (
                              <Pressable
                                key={c.id}
                                onPress={() => update({ location_council_id: selected ? undefined : c.id })}
                                className={cn(
                                  "px-3 py-2 rounded-xl flex-row items-center justify-between active:bg-sand",
                                  selected ? "bg-sand" : "bg-transparent"
                                )}
                              >
                                <Text className="text-xs font-heading text-ink">{c.name}</Text>
                                {selected && <Icon name="check" size={14} color={colors.pink} />}
                              </Pressable>
                            );
                          });
                        })()}
                      </ScrollView>
                    </View>
                  </>
                ) : (
                  <Text variant="caption" tone="faint">Loading councils list...</Text>
                )}
              </View>
            </Field>
          ) : null}
        </>
      )}
    </Card>
  );
}

function StepTickets({ draft, update }: StepProps) {
  return (
    <Card className="p-5 gap-5 border border-linen bg-card">
      <StepHeading
        title="Admission & Tickets"
        subtitle="Is the event free, or do attendees need a ticket?"
      />

      <Toggle
        label="Free event"
        enabled={draft.is_free}
        onToggle={(is_free) => update({ is_free, price: is_free ? undefined : 0 })}
      />
      {!draft.is_free ? (
        <Field label="Ticket Price ($AUD)">
          <Input
            value={draft.price?.toString() ?? ""}
            onChangeText={(text) => update({ price: text ? parseFloat(text) : undefined })}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </Field>
      ) : null}

      <Field label="Ticket URL" optional>
        <Input
          value={draft.ticket_url}
          onChangeText={(ticket_url) => update({ ticket_url })}
          placeholder="https://tickets.example.com"
          autoCapitalize="none"
          keyboardType="url"
        />
      </Field>

      <Field label="Capacity" optional>
        <Input
          value={draft.capacity?.toString() ?? ""}
          onChangeText={(text) => update({ capacity: text ? parseInt(text, 10) : undefined })}
          placeholder="Unlimited"
          keyboardType="number-pad"
        />
      </Field>
    </Card>
  );
}

function StepClassification({ draft, update }: StepProps) {
  return (
    <Card className="p-5 gap-5 border border-linen bg-card">
      <StepHeading
        title="Tags & Classification"
        subtitle="Tags make your event searchable by interest, genre, or cultural focus."
      />

      <Field label="Tags" optional>
        <TagInput
          value={draft.tags}
          onChange={(tags) => update({ tags })}
          placeholder="Add searchable tags"
        />
      </Field>

      <Field label="Cultural focus" optional>
        <TagInput
          value={draft.cultural_focus}
          onChange={(cultural_focus) => update({ cultural_focus })}
          placeholder="e.g. Indigenous, Multicultural"
        />
      </Field>
    </Card>
  );
}

function StepReview({ draft, onEditStep, myHubs }: StepProps & { onEditStep: (step: number) => void; myHubs: any[] | undefined }) {
  const hostName = myHubs?.find((h) => h.id === draft.hub_id)?.name ?? "Selected Host";
  const [viewMode, setViewMode] = useState<"summary" | "preview">("summary");
  const router = useRouter();

  const place = draft.is_online
    ? "Online Event"
    : [draft.venue_address, draft.location_city, draft.location_state].filter(Boolean).join(", ");
  const coverUrl = draft.images?.[0]?.url ?? null;
  const price = draft.is_free ? "Free" : draft.price ? `$${draft.price}` : "Ticketed";

  return (
    <View className="gap-5">
      <Card className="p-2.5 border border-linen bg-sand/30 flex-row gap-2">
        <Button
          label="Checklist Summary"
          variant={viewMode === "summary" ? "primary" : "outline"}
          size="sm"
          className="flex-1"
          onPress={() => setViewMode("summary")}
        />
        <Button
          label="Full Preview"
          variant={viewMode === "preview" ? "primary" : "outline"}
          size="sm"
          className="flex-1"
          onPress={() => setViewMode("preview")}
        />
      </Card>

      {viewMode === "summary" ? (
        <Card className="p-5 gap-5 border border-linen bg-card">
          <StepHeading
            title="Review & Save"
            subtitle="Double check all the information before publishing your event."
          />

          <View className="gap-4">
            {/* Detail summary blocks */}
            <View className="border-b border-linen/30 pb-3 flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-[10px] uppercase font-heading text-ink-faint tracking-widest">Hosting Hub</Text>
                <Text className="font-heading text-sm text-ink mt-0.5">{hostName}</Text>
              </View>
              <Button label="Edit" variant="ghost" size="sm" onPress={() => onEditStep(0)} />
            </View>

            <View className="border-b border-linen/30 pb-3 flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-[10px] uppercase font-heading text-ink-faint tracking-widest">Title</Text>
                <Text className="font-heading text-sm text-ink mt-0.5">{draft.title || "(Untitled Event)"}</Text>
              </View>
              <Button label="Edit" variant="ghost" size="sm" onPress={() => onEditStep(0)} />
            </View>

            <View className="border-b border-linen/30 pb-3 flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-[10px] uppercase font-heading text-ink-faint tracking-widest">Date & Time</Text>
                <Text className="font-heading text-sm text-ink mt-0.5">
                  {draft.start_time ? new Date(draft.start_time).toLocaleString("en-AU") : "Not set"}
                  {draft.end_time ? ` - ${new Date(draft.end_time).toLocaleString("en-AU")}` : ""}
                </Text>
              </View>
              <Button label="Edit" variant="ghost" size="sm" onPress={() => onEditStep(1)} />
            </View>

            <View className="border-b border-linen/30 pb-3 flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-[10px] uppercase font-heading text-ink-faint tracking-widest">Location</Text>
                <Text className="font-heading text-sm text-ink mt-0.5">
                  {place || "Not set"}
                </Text>
                {draft.is_online && draft.online_url ? (
                  <Text className="text-xs text-pink mt-1 font-semibold" numberOfLines={1}>
                    Link: {draft.online_url}
                  </Text>
                ) : null}
              </View>
              <Button label="Edit" variant="ghost" size="sm" onPress={() => onEditStep(2)} />
            </View>

            <View className="border-b border-linen/30 pb-3 flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-[10px] uppercase font-heading text-ink-faint tracking-widest">Admission</Text>
                <Text className="font-heading text-sm text-ink mt-0.5">
                  {draft.is_free ? "Free Event" : `Paid Event ($${draft.price})`}
                </Text>
              </View>
              <Button label="Edit" variant="ghost" size="sm" onPress={() => onEditStep(3)} />
            </View>
          </View>
        </Card>
      ) : (
        <View className="gap-6">
          {/* Cover Image — 1:1 square */}
          <View className="overflow-hidden rounded-3xl bg-sand shadow-subtle aspect-square w-full">
            {coverUrl ? (
              <Image
                source={{ uri: coverUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-eucalyptus-50 p-8">
                <Text className="font-display text-8xl text-eucalyptus-100/50">
                  {(draft.title || "E").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Event Title */}
          <View className="gap-3">
            <View className="flex-row flex-wrap items-center gap-2">
              <Badge label={EVENT_TYPE_LABELS[draft.type]} variant="ochre" />
              <Badge label="Preview" variant="warning" dot />
            </View>
            <Text variant="display" className="text-3xl font-display text-ink leading-tight">
              {draft.title || "(Untitled Event)"}
            </Text>
          </View>

          {/* Host Info */}
          <View className="flex-row items-center gap-3 rounded-2xl border border-linen bg-card p-4">
            <Avatar name={hostName} size={44} />
            <View className="flex-1">
              <Text variant="caption" tone="faint">Hosted by</Text>
              <Text variant="label" className="font-heading text-base text-ink">
                {hostName}
              </Text>
            </View>
          </View>

          {/* Description */}
          {draft.description ? (
            <View className="gap-3">
              <Text variant="heading" className="text-xl font-heading text-ink">About this event</Text>
              <RichText
                text={draft.description}
                onTagPress={(tag) => router.push(`/tag/${encodeURIComponent(tag)}`)}
                onMentionPress={(mention) => router.push(`/hub/${mention}`)}
              />
            </View>
          ) : null}

          {/* Logistics Card */}
          <Card className="gap-6 border border-linen bg-card rounded-3xl shadow-card p-6">
            <View className="flex-row items-center justify-between">
              <Text variant="overline" tone="faint">Registration</Text>
              <Badge label={price} variant={draft.is_free ? "success" : "ink"} className="px-3 py-1 text-sm font-heading" />
            </View>

            <View className="flex-row items-start gap-4">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sand/60">
                <Icon name="calendar" size={20} color={colors.ink} />
              </View>
              <View className="flex-1">
                <Text variant="caption" tone="faint">Date & Time</Text>
                <Text variant="label" className="text-base font-heading text-ink mt-0.5">
                  {draft.start_time
                    ? new Date(draft.start_time).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                    : "Date to be announced"}
                </Text>
                <Text variant="caption" tone="muted" className="mt-0.5">
                  {draft.start_time
                    ? new Date(draft.start_time).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
                    : "Time to be announced"}
                  {draft.end_time
                    ? ` - ${new Date(draft.end_time).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })}`
                    : ""}
                </Text>
              </View>
            </View>

            <Divider />

            <View className="flex-row items-start gap-4">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sand/60">
                <Icon name={draft.is_online ? "globe" : "map-pin"} size={20} color={colors.ink} />
              </View>
              <View className="flex-1">
                <Text variant="caption" tone="faint">Location</Text>
                <Text variant="label" className="text-base font-heading text-ink mt-0.5">
                  {place || "Location to be announced"}
                </Text>
                {draft.is_online && draft.online_url ? (
                  <Text variant="caption" tone="pink" className="font-heading mt-1 font-bold">
                    {draft.online_url}
                  </Text>
                ) : null}
              </View>
            </View>

            {draft.capacity ? (
              <>
                <Divider />
                <View className="flex-row items-start gap-4">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sand/60">
                    <Icon name="users" size={20} color={colors.ink} />
                  </View>
                  <View className="flex-1">
                    <Text variant="caption" tone="faint">Capacity</Text>
                    <Text variant="label" className="text-base font-heading text-ink mt-0.5">
                      {draft.capacity} spots maximum
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </Card>
        </View>
      )}
    </View>
  );
}
