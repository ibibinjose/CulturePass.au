import { useState, useMemo, useEffect } from "react";
import { Linking, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  Screen,
  Text,
  Button,
  BackButton,
  Badge,
  Card,
  Divider,
  ShareButton,
  Icon,
  Avatar,
  SectionHeader,
  RichText,
} from "@/components/ui";
import { colors } from "@/lib/theme";
import {
  useEvent,
  useEventSubscriptionStatus,
  useToggleEventSubscription,
  useEventLikes,
  useToggleEventLike,
  useEventSaveStatus,
  useToggleEventSave,
} from "@/features/events/api";
import { useMyProfile } from "@/features/profiles/api";
import { useMyHubs } from "@/features/hubs/api";
import { useBuyTicket } from "@/features/tickets/api";
import { TicketBookingModal } from "@/features/tickets/TicketBookingModal";
import {
  useEventCohosts,
  useRespondToCohost,
  COHOST_ROLE_LABELS,
  type EventCohost,
} from "@/features/events/cohosts";
import {
  EVENT_TYPE_LABELS,
  type EventType,
} from "@/lib/constants";

import { getEventTimezone } from "@/lib/utils/timezone";

export default function EventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, isLoading, isError } = useEvent(id ?? "");
  const { data: profile } = useMyProfile();
  const buyTicket = useBuyTicket();

  const { data: subStatus } = useEventSubscriptionStatus(event?.id || "");
  const toggleSub = useToggleEventSubscription();

  const { data: likeData } = useEventLikes(event?.id || "");
  const toggleLike = useToggleEventLike();

  const { data: saveData } = useEventSaveStatus(event?.id || "");
  const toggleSave = useToggleEventSave();

  const { data: cohosts } = useEventCohosts(event?.id || "");
  const { data: myHubs } = useMyHubs();
  const respondToCohost = useRespondToCohost(event?.id || "");
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);

  const startCal = useMemo(() => {
    if (!event?.start_time) return "";
    try {
      return new Date(event.start_time).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    } catch {
      return "";
    }
  }, [event?.start_time]);

  const endCal = useMemo(() => {
    if (!event?.start_time) return "";
    try {
      if (event.end_time) {
        return new Date(event.end_time).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      }
      const d = new Date(event.start_time);
      d.setHours(d.getHours() + 1);
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    } catch {
      return "";
    }
  }, [event?.start_time, event?.end_time]);

  const placeVal = useMemo(() => {
    if (!event) return "";
    return [event.location_city, event.location_state].filter(Boolean).join(", ");
  }, [event]);

  const googleUrl = useMemo(() => {
    if (!event) return "";
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startCal}/${endCal}&details=${encodeURIComponent(event.description || "")}&location=${encodeURIComponent(placeVal)}`;
  }, [event, startCal, endCal, placeVal]);

  const outlookUrl = useMemo(() => {
    if (!event) return "";
    return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(event.title)}&startdt=${startCal}&enddt=${endCal}&body=${encodeURIComponent(event.description || "")}&location=${encodeURIComponent(placeVal)}`;
  }, [event, startCal, endCal, placeVal]);

  const icsUrl = useMemo(() => {
    if (!event) return "";
    return `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${startCal}%0ADTEND:${endCal}%0ASUMMARY:${encodeURIComponent(event.title)}%0ADESCRIPTION:${encodeURIComponent(event.description || "")}%0ALOCATION:${encodeURIComponent(placeVal)}%0AEND:VEVENT%0AEND:VCALENDAR`;
  }, [event, startCal, endCal, placeVal]);

  const mockAttendees = useMemo(() => {
    if (!event) return [];
    const list = [
      "Amelia Smith",
      "Liam Johnston",
      "Chloe Nguyen",
      "Jack Thompson",
      "Mia Patel",
      "Ethan Davis",
    ];
    const seed = event.id.charCodeAt(0) % list.length;
    const shuffled = list.slice(seed, seed + 4).concat(list.slice(0, Math.max(0, 4 - list.slice(seed, seed + 4).length)));
    return shuffled.slice(0, Math.min(shuffled.length, event.rsvp_count ?? 0));
  }, [event]);

  const handleSubscribe = () => {
    if (!profile) {
      router.push("/sign-in");
      return;
    }
    if (event) {
      toggleSub.mutate({ eventId: event.id, subscribed: !!subStatus?.subscribed });
    }
  };

  const handleLike = () => {
    if (!profile) {
      router.push("/sign-in");
      return;
    }
    if (event) {
      toggleLike.mutate({ eventId: event.id, liked: !!likeData?.liked });
    }
  };

  const handleSave = () => {
    if (!profile) {
      router.push("/sign-in");
      return;
    }
    if (event) {
      toggleSave.mutate({ eventId: event.id, saved: !!saveData?.saved });
    }
  };

  if (isLoading) return <EventSkeleton />;

  if (isError || !event) {
    return (
      <Screen maxWidth="prose" contentClassName="pt-6">
        <BackButton fallbackHref="/" />
        <Card className="mt-8 items-start gap-3">
          <Text variant="title">Event not found</Text>
          <Text variant="body" tone="muted">
            It may be unpublished, cancelled, or your Supabase project is not connected yet.
          </Text>
          <Button
            label="Browse events"
            variant="secondary"
            className="mt-3"
            onPress={() => router.replace("/")}
          />
        </Card>
      </Screen>
    );
  }

  const place = [event.location_city, event.location_state].filter(Boolean).join(", ");
  const coverUrl = event.images?.find((image) => image.type === "cover")?.url ?? event.images?.[0]?.url ?? null;
  const start = event.start_time ? new Date(event.start_time) : null;
  const end = event.end_time ? new Date(event.end_time) : null;
  const eventTimezone = getEventTimezone(event.location_state);
  const when = start
    ? new Intl.DateTimeFormat("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: eventTimezone,
        timeZoneName: "short",
      }).format(start)
    : "Date to be announced";
  const timeRange = start
    ? `${new Intl.DateTimeFormat("en-AU", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: eventTimezone,
      }).format(start)}${
        end
          ? ` - ${new Intl.DateTimeFormat("en-AU", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              timeZone: eventTimezone,
              timeZoneName: "short",
            }).format(end)}`
          : ""
      }`
    : "Time to be announced";
  const price = event.is_free ? "Free" : event.price ? `$${event.price}` : "Ticketed";
  const statusLabel =
    event.status === "published" ? "Published" : event.status === "draft" ? "Draft" : "Cancelled";
  const ownerId = (event.hub as { owner_id?: string } | null)?.owner_id;
  const isOwner = !!profile && ownerId === profile.id;
  const isPaidTicketed = !event.is_free && !!event.price && Number(event.price) > 0;

  const acceptedCohosts = (cohosts ?? []).filter((c) => c.status === "accepted");
  const myHubIds = new Set((myHubs ?? []).map((h) => h.id));
  const myPendingInvites = (cohosts ?? []).filter(
    (c) =>
      c.status === "pending" &&
      ((c.profileId && c.profileId === profile?.id) || (c.hubId && myHubIds.has(c.hubId))),
  );

  const openCohost = (c: EventCohost) => {
    if (c.kind === "hub" && c.slug) router.push(`/hub/${c.slug}`);
    else if (c.kind === "profile" && c.profileId) router.push(`/profile/${c.profileId}`);
  };

  const handleBuy = () => {
    if (!profile) {
      router.push("/sign-in");
      return;
    }
    buyTicket.mutate({ eventId: event.id, quantity: 1 });
  };

  const openTicketUrl = () => {
    if (!event.ticket_url) return;
    const url = /^https?:\/\//i.test(event.ticket_url) ? event.ticket_url : `https://${event.ticket_url}`;
    Linking.openURL(url).catch(() => {});
  };

  const openDirections = () => {
    const query = encodeURIComponent(place || event.title);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {});
  };

  const hostImages = (event.hub as any)?.images ?? [];
  const hostLogoUrl = hostImages.find((img: any) => img?.type === "logo")?.url ?? null;

  return (
    <Screen contentClassName="pt-6 px-gutter">
      <BackButton fallbackHref="/" className="mb-4" />

      {/* Co-host invitation banner — shown to an invited party with a pending invite */}
      {myPendingInvites.map((invite) => (
        <Card key={invite.id} className="mb-5 gap-3 border border-ochre-200 bg-ochre-50 rounded-3xl p-5">
          <View className="flex-row items-center gap-2">
            <Icon name="users" size={16} color={colors.ochre} />
            <Text variant="overline" tone="ochre">
              Co-host invitation
            </Text>
          </View>
          <Text variant="bodyLarge" className="text-ink leading-6">
            You’ve been invited to join{" "}
            <Text className="font-heading">{event.title}</Text> as{" "}
            <Text className="font-heading">{COHOST_ROLE_LABELS[invite.role]}</Text>
            {invite.kind === "hub" ? ` (as ${invite.name})` : ""}.
          </Text>
          <View className="flex-row gap-3 mt-1">
            <Button
              label="Accept"
              variant="whatsapp"
              className="flex-1"
              loading={respondToCohost.isPending}
              leftIcon={<Icon name="check" size={16} color={colors.ink} />}
              onPress={() => respondToCohost.mutate({ id: invite.id, status: "accepted" })}
            />
            <Button
              label="Decline"
              variant="outline"
              className="flex-1"
              disabled={respondToCohost.isPending}
              onPress={() => respondToCohost.mutate({ id: invite.id, status: "declined" })}
            />
          </View>
        </Card>
      ))}

      <View className="gap-8 lg:flex-row lg:items-start lg:gap-10">
        {/* Left Column: Media + Info */}
        <View className="flex-1 gap-6">
          {/* Cover Image */}
          <View className="overflow-hidden rounded-3xl bg-sand shadow-subtle aspect-square w-full">
            {coverUrl ? (
              <Image
                source={{ uri: coverUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-eucalyptus-50 p-8">
                <Text className="font-display text-8xl text-eucalyptus-100/50">
                  {event.title.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Event Title & Eyebrows */}
          <View className="gap-2 mt-2">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text variant="overline" className="text-ink-muted tracking-[1.2px]">{statusLabel}</Text>
              {event.status === "published" && event.start_time ? (
                <>
                  <Text className="text-ink-faint/30">•</Text>
                  <CountdownTimer startTime={event.start_time} />
                </>
              ) : null}
              <Text className="text-ink-faint/30">•</Text>
              <Text variant="overline" tone="faint" className="tracking-[1px]">{EVENT_TYPE_LABELS[event.type as EventType]}</Text>
            </View>
            <Text variant="displayLarge" className="font-display text-4xl md:text-5xl lg:text-6xl text-ink tracking-tighter leading-none mt-1">
              {event.title}
            </Text>
          </View>

          {/* Host & Cohosts - Swiss List Layout */}
          <View className="border-t border-b border-linen py-2 gap-4">
            {event.hub ? (
              <Pressable
                onPress={() => event.hub && router.push(`/hub/${event.hub.slug}`)}
                className="flex-row items-center gap-3 py-2 active:opacity-75"
              >
                <Avatar name={event.hub.name} uri={hostLogoUrl} size={36} />
                <View className="flex-1">
                  <Text variant="overline" tone="faint" className="tracking-[1px]">Host</Text>
                  <Text variant="label" className="font-heading text-sm text-ink mt-0.5">
                    {event.hub.name}
                  </Text>
                </View>
                <Icon name="chevron-right" size={14} color={colors.inkMuted} />
              </Pressable>
            ) : null}

            {acceptedCohosts.length > 0 ? (
              <View className="gap-3 pt-2 border-t border-linen/30 mt-1">
                <Text variant="overline" tone="pink" className="tracking-[1px]">Presented with</Text>
                <View className="gap-3">
                  {acceptedCohosts.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => openCohost(c)}
                      className="flex-row items-center gap-3 active:opacity-75"
                    >
                      <Avatar name={c.name} uri={c.avatarUrl} size={36} />
                      <View className="flex-1 min-w-0">
                        <Text variant="label" className="font-heading text-sm text-ink" numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text variant="caption" tone="faint" className="text-xs mt-0.5" numberOfLines={1}>
                          {COHOST_ROLE_LABELS[c.role]} · {c.subtitle}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={14} color={colors.inkMuted} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          {/* Description */}
          {event.description ? (
            <View className="gap-3">
              <Text variant="overline" tone="faint" className="tracking-[1px]">About this event</Text>
              <RichText
                text={event.description}
                onTagPress={(tag) => router.push(`/tag/${encodeURIComponent(tag)}`)}
                onMentionPress={(mention) => router.push(`/hub/${mention}`)}
              />
            </View>
          ) : null}

          {/* Tags & Cultural Focus */}
          {event.cultural_focus && event.cultural_focus.length > 0 ? (
            <TagSection title="Cultural focus" items={event.cultural_focus} tone="eucalyptus" />
          ) : null}

          {event.tags && event.tags.length > 0 ? (
            <TagSection title="Tags" items={event.tags} />
          ) : null}
        </View>

        {/* Right Column: Swiss Manifest Sidebar */}
        <View className="gap-6 lg:w-[360px] w-full">
          <Card className="gap-6 border-2 border-ink bg-card rounded-3xl p-6 shadow-card">
            {/* Price Header */}
            <View className="flex-row items-baseline justify-between">
              <Text variant="overline" tone="faint" className="tracking-[1px]">Registration</Text>
              <Text className="text-3xl font-display text-ink tracking-tighter">{price}</Text>
            </View>

            <Divider className="bg-linen" />

            {/* Date / Time */}
            <View className="flex-row items-start gap-4">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-sand/60">
                <Icon name="calendar" size={18} color={colors.ink} />
              </View>
              <View className="flex-1">
                <Text variant="overline" tone="faint" className="tracking-[0.8px]">Date & Time</Text>
                <Text variant="label" className="text-sm font-heading text-ink mt-1">
                  {when}
                </Text>
                <Text variant="caption" tone="muted" className="text-xs mt-0.5">
                  {timeRange}
                </Text>
              </View>
            </View>

            <Divider className="bg-linen" />

            {/* Location */}
            {place ? (
              <View className="flex-row items-start gap-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-sand/60">
                  <Icon name="map-pin" size={18} color={colors.ink} />
                </View>
                <View className="flex-1">
                  <Text variant="overline" tone="faint" className="tracking-[0.8px]">Location</Text>
                  <Text variant="label" className="text-sm font-heading text-ink mt-1">
                    {place}
                  </Text>
                  <Pressable onPress={openDirections} className="mt-1.5 self-start">
                    <Text variant="caption" className="text-ochre-600 font-heading underline text-xs">
                      Open map
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {place ? <Divider className="bg-linen" /> : null}

            {/* Event capacity & RSVPs */}
            <View className="flex-row items-start gap-4">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-sand/60">
                <Icon name="users" size={18} color={colors.ink} />
              </View>
              <View className="flex-1">
                <Text variant="overline" tone="faint" className="tracking-[0.8px]">Guest List</Text>
                <Text variant="label" className="text-sm font-heading text-ink mt-1">
                  {event.rsvp_count ?? 0} attending
                </Text>
                {mockAttendees.length > 0 ? (
                  <View className="flex-row items-center gap-1.5 mt-2">
                    <View className="flex-row">
                      {mockAttendees.map((name, i) => (
                        <View
                          key={i}
                          style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 10 - i }}
                          className="rounded-full border border-white overflow-hidden bg-card"
                        >
                          <Avatar name={name} size={20} />
                        </View>
                      ))}
                    </View>
                    {event.rsvp_count && event.rsvp_count > mockAttendees.length ? (
                      <Text variant="caption" tone="muted" className="text-[10px] ml-1 font-heading">
                        +{event.rsvp_count - mockAttendees.length}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {event.capacity ? (
                  <Text variant="caption" tone="muted" className="text-xs mt-1.5">
                    {event.capacity - (event.rsvp_count ?? 0)} spots remaining (Capacity: {event.capacity})
                  </Text>
                ) : null}
              </View>
            </View>

            <Divider className="bg-linen" />

            {/* Primary Action Buttons */}
            <View className="gap-2.5">
              {event.ticket_url ? (
                <Button
                  label="Get tickets"
                  variant="primary"
                  fullWidth
                  onPress={openTicketUrl}
                  rightIcon={<Icon name="external" size={16} color={colors.ink} />}
                />
              ) : isPaidTicketed ? (
                <Button
                  label={`Buy ticket · ${price}`}
                  variant="whatsapp"
                  fullWidth
                  loading={buyTicket.isPending}
                  onPress={handleBuy}
                  leftIcon={<Icon name="ticket" size={17} color={colors.ink} />}
                />
              ) : null}

              {/* Subscribe button (RSVP) */}
              <Button
                label={subStatus?.subscribed ? "Subscribed" : "Subscribe to Event"}
                variant={subStatus?.subscribed ? "whatsapp" : "outline"}
                fullWidth
                leftIcon={
                  <Icon
                    name={subStatus?.subscribed ? "check" : "bell"}
                    size={15}
                    color={colors.ink}
                  />
                }
                onPress={handleSubscribe}
                loading={toggleSub.isPending}
              />

              {event.start_time ? (
                <>
                  <Button
                    label="Add to Calendar"
                    variant="outline"
                    fullWidth
                    leftIcon={<Icon name="calendar" size={15} color={colors.ink} />}
                    onPress={() => setShowCalendarMenu(!showCalendarMenu)}
                  />
                  {showCalendarMenu ? (
                    <Card className="p-2 gap-1 border border-linen bg-sand/30 mt-1 rounded-2xl">
                      <Button
                        label="Google Calendar"
                        variant="ghost"
                        size="sm"
                        className="py-1"
                        onPress={() => {
                          Linking.openURL(googleUrl);
                          setShowCalendarMenu(false);
                        }}
                      />
                      <Button
                        label="Apple Calendar / iCal (.ics)"
                        variant="ghost"
                        size="sm"
                        className="py-1"
                        onPress={() => {
                          Linking.openURL(icsUrl);
                          setShowCalendarMenu(false);
                        }}
                      />
                      <Button
                        label="Outlook Web Calendar"
                        variant="ghost"
                        size="sm"
                        className="py-1"
                        onPress={() => {
                          Linking.openURL(outlookUrl);
                          setShowCalendarMenu(false);
                        }}
                      />
                    </Card>
                  ) : null}
                </>
              ) : null}
            </View>

            {buyTicket.isError ? (
              <Text variant="caption" className="text-terracotta-600 text-center mt-1">
                {(buyTicket.error as Error)?.message ?? "Couldn’t start checkout."}
              </Text>
            ) : null}

            {/* Like and Save Actions */}
            <View className="flex-row items-center gap-2.5">
              <Button
                label={likeData?.liked ? `Liked (${likeData.count})` : `Like (${likeData?.count ?? 0})`}
                variant={likeData?.liked ? "primary" : "outline"}
                className="flex-1"
                leftIcon={<Icon name="heart" size={14} color={colors.ink} filled={likeData?.liked} />}
                onPress={handleLike}
                loading={toggleLike.isPending}
              />
              <Button
                label={saveData?.saved ? "Saved" : "Save"}
                variant={saveData?.saved ? "primary" : "outline"}
                className="flex-1"
                leftIcon={<Icon name="star" size={14} color={colors.ink} filled={saveData?.saved} />}
                onPress={handleSave}
                loading={toggleSave.isPending}
              />
            </View>

            {/* Share actions */}
            <View className="flex-row items-center gap-2.5">
              <ShareButton path={`/event/${event.id}`} title={event.title} message={event.description ?? undefined} className="flex-1" />
              <Button label="Link in bio" variant="outline" size="sm" className="flex-1" onPress={() => router.push(`/l/event/${event.id}`)} />
            </View>

            {isOwner ? (
              <Button
                label="Edit Event Settings"
                variant="secondary"
                size="sm"
                fullWidth
                onPress={() => router.push(`/event/edit/${event.id}`)}
              />
            ) : null}
          </Card>
        </View>
      </View>
    </Screen>
  );
}

function EventSkeleton() {
  return (
    <Screen contentClassName="pt-8">
      <View className="gap-4">
        <View className="h-48 rounded-2xl bg-sand" />
        <Card className="gap-3">
          <Text variant="caption" tone="faint">
            Loading event…
          </Text>
          <View className="h-8 w-2/3 rounded-lg bg-sand" />
          <View className="h-4 w-full rounded-lg bg-sand" />
          <View className="h-4 w-3/4 rounded-lg bg-sand" />
        </Card>
      </View>
    </Screen>
  );
}

function TagSection({ title, items, tone }: { title: string; items: string[]; tone?: "eucalyptus" }) {
  const router = useRouter();
  return (
    <View className="gap-3">
      <SectionHeader title={title} />
      <View className="flex-row flex-wrap gap-2">
        {items.map((item) => (
          <Pressable
            key={item}
            onPress={() => router.push(`/tag/${encodeURIComponent(item)}`)}
            className="active:opacity-80"
            accessibilityRole="link"
            accessibilityLabel={`View events tagged with ${item}`}
          >
            <Badge label={item} variant={tone === "eucalyptus" ? "eucalyptus" : "outline"} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CountdownTimer({ startTime }: { startTime: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(startTime) - +new Date();
      if (difference <= 0) {
        setTimeLeft("Happening now!");
        return;
      }

      const parts = [];
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);

      setTimeLeft(`Starts in ${parts.join(" ")}`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [startTime]);

  const nowActive = timeLeft === "Happening now!";

  return (
    <View className="flex-row items-center gap-1.5">
      {nowActive ? (
        <View className="h-1.5 w-1.5 rounded-full bg-green-500" />
      ) : (
        <Icon name="sparkle" size={12} color={colors.pink} />
      )}
      <Text variant="overline" tone="pink" className="font-bold tracking-[1.2px]">
        {timeLeft}
      </Text>
    </View>
  );
}
