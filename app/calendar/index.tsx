import { useMemo, useState, type ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Icon, type IconName } from "@/components/ui/Icon";
import { colors } from "@/lib/theme";
import { EventCard } from "@/features/events/EventCard";
import { useEvents } from "@/features/events/api";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

type CalendarEvent = NonNullable<ReturnType<typeof useEvents>["data"]>[number];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const monthFormatter = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" });
const selectedDayFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const EVENT_DOT: Partial<Record<EventType, string>> = {
  event: "bg-ink",
  activity: "bg-eucalyptus-500",
  workshop: "bg-ochre-500",
  art: "bg-terracotta-500",
  movie: "bg-ink-muted",
  dining: "bg-warning",
  shopping: "bg-success",
  offer: "bg-danger",
  classes_gym: "bg-eucalyptus-700",
  travel: "bg-ochre-700",
  other: "bg-ink-faint",
};

const EVENT_BADGE: Partial<Record<EventType, ComponentProps<typeof Badge>["variant"]>> = {
  event: "neutral",
  activity: "eucalyptus",
  workshop: "ochre",
  art: "terracotta",
  dining: "warning",
  shopping: "success",
  offer: "danger",
  travel: "ochre",
};

export default function CalendarScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"box" | "list">("box");
  const todayKey = keyForDate(new Date());
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string | null>(todayKey);

  // The visible 6×7 grid (incl. leading/trailing days from adjacent months).
  const days = useMemo(() => buildCalendarDays(cursor), [cursor]);

  // Dataflow: fetch only the events inside the visible window. Keyed by range,
  // so each month is fetched once and cached — no app-wide event pull.
  const range = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(1 - cursor.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 41);
    const from = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
    const to = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate(),
      23,
      59,
      59,
    ).toISOString();
    return { from, to };
  }, [cursor]);

  const { data: events, isLoading, isError } = useEvents(range);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events ?? []) {
      if (!event.start_time) continue;
      const key = keyForDate(new Date(event.start_time));
      (map[key] ??= []).push(event);
    }
    return map;
  }, [events]);

  const monthEvents = useMemo(
    () =>
      (events ?? []).filter((event) => {
        if (!event.start_time) return false;
        const date = new Date(event.start_time);
        return date.getMonth() === cursor.getMonth() && date.getFullYear() === cursor.getFullYear();
      }),
    [events, cursor],
  );

  const selectedEvents = selected ? eventsByDate[selected] ?? [] : [];
  const showingDay = selected !== null;
  const listedEvents = showingDay ? selectedEvents : monthEvents;

  const goMonth = (delta: number) => {
    setCursor(startOfMonth(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1)));
    setSelected(null);
  };

  const goToday = () => {
    const today = new Date();
    setCursor(startOfMonth(today));
    setSelected(keyForDate(today));
  };

  return (
    <Screen contentClassName="pt-8">
      <View className="flex-row items-end justify-between gap-4">
        <View className="gap-1">
          <Text variant="overline" tone="pink">
            Calendar
          </Text>
          <Text variant="title">What’s on</Text>
        </View>
        <View className="flex-row gap-2">
          <Button label="Today" variant="outline" size="sm" onPress={goToday} />
          <Button
            label="Add event"
            variant="whatsapp"
            size="sm"
            onPress={() => router.push("/create/event")}
          />
        </View>
      </View>

      <View className="mt-8 gap-6 lg:flex-row lg:items-start">
        {/* Compact calendar */}
        <View className="gap-4 lg:w-[340px]">
          <Card className="gap-4 p-4">
            <View className="flex-row items-center justify-between">
              <NavButton icon="chevron-left" onPress={() => goMonth(-1)} accessibilityLabel="Previous month" />
              <Text variant="subheading">{monthFormatter.format(cursor)}</Text>
              <NavButton icon="chevron-right" onPress={() => goMonth(1)} accessibilityLabel="Next month" />
            </View>

            <View className="flex-row">
              {WEEKDAYS.map((day, i) => (
                <View key={i} style={{ width: `${100 / 7}%` }} className="items-center py-1">
                  <Text variant="overline" tone="faint">
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap">
              {days.map((day) => {
                const dayEvents = eventsByDate[day.key] ?? [];
                const active = selected === day.key;
                const isToday = day.key === todayKey;
                return (
                  <View key={day.key} style={{ width: `${100 / 7}%` }} className="p-0.5">
                    <Pressable
                      onPress={() => setSelected(active ? null : day.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      className={cn(
                        "aspect-square items-center justify-center rounded-xl border",
                        active
                          ? "border-ink bg-ink"
                          : isToday
                            ? "border-ochre-500 bg-ochre-50"
                            : day.inMonth
                              ? "border-transparent bg-sand active:bg-linen"
                              : "border-transparent bg-transparent",
                      )}
                    >
                      <Text
                        variant="label"
                        className={cn(
                          "text-sm",
                          active
                            ? "text-paper"
                            : isToday
                              ? "text-ochre-600"
                              : day.inMonth
                                ? "text-ink"
                                : "text-ink-faint",
                        )}
                      >
                        {day.date.getDate()}
                      </Text>
                      {dayEvents.length > 0 ? (
                        <View className="mt-0.5 h-1 flex-row gap-0.5">
                          {dayEvents.slice(0, 3).map((event) => (
                            <View
                              key={event.id}
                              className={cn(
                                "h-1 w-1 rounded-pill",
                                active
                                  ? "bg-paper"
                                  : EVENT_DOT[event.type as EventType] ?? "bg-ink-faint",
                              )}
                            />
                          ))}
                        </View>
                      ) : (
                        <View className="mt-0.5 h-1" />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </Card>

          <Card className="flex-row items-center justify-between gap-3 p-4">
            <View>
              <Text variant="overline" tone="faint">
                This month
              </Text>
              <Text variant="subheading" className="mt-0.5">
                {monthEvents.length} event{monthEvents.length === 1 ? "" : "s"}
              </Text>
            </View>
            <View className="flex-1 flex-row flex-wrap justify-end gap-1.5">
              {Object.entries(EVENT_TYPE_LABELS)
                .slice(0, 6)
                .map(([type, label]) => (
                  <Badge
                    key={type}
                    label={label}
                    variant={EVENT_BADGE[type as EventType] ?? "outline"}
                  />
                ))}
            </View>
          </Card>
        </View>

        {/* Events list */}
        <View className="flex-1 gap-4">
          <View className="flex-row items-end justify-between gap-4">
            <View className="flex-1">
              <Text variant="heading">
                {showingDay && selected
                  ? selectedDayFormatter.format(parseKey(selected))
                  : monthFormatter.format(cursor)}
              </Text>
              <Text variant="caption" tone="faint" className="mt-1">
                {showingDay
                  ? `${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"} on this day`
                  : `${monthEvents.length} event${monthEvents.length === 1 ? "" : "s"} this month`}
              </Text>
            </View>
            {showingDay ? (
              <Button
                label="Whole month"
                variant="ghost"
                size="sm"
                onPress={() => setSelected(null)}
              />
            ) : (
              <Button
                label="Discover"
                variant="outline"
                size="sm"
                onPress={() => router.push("/")}
              />
            )}
          </View>

          {/* View Layout Toggle */}
          <View className="flex-row items-center justify-between border-t border-linen/30 pt-3">
            <Text variant="overline" tone="muted">View layout</Text>
            <View className="flex-row items-center gap-1 bg-sand/50 p-0.5 rounded-xl border border-linen/40">
              <Pressable
                onPress={() => setViewMode("box")}
                className={cn(
                  "px-3 py-1 rounded-lg flex-row items-center gap-1.5",
                  viewMode === "box" ? "bg-card shadow-subtle border border-linen/20" : ""
                )}
              >
                <Icon name="grid" size={13} color={viewMode === "box" ? colors.ink : colors.inkMuted} />
                <Text variant="caption" className={cn("text-xs font-heading", viewMode === "box" ? "text-ink" : "text-ink-muted")}>
                  Box
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode("list")}
                className={cn(
                  "px-3 py-1 rounded-lg flex-row items-center gap-1.5",
                  viewMode === "list" ? "bg-card shadow-subtle border border-linen/20" : ""
                )}
              >
                <Icon name="menu" size={13} color={viewMode === "list" ? colors.ink : colors.inkMuted} />
                <Text variant="caption" className={cn("text-xs font-heading", viewMode === "list" ? "text-ink" : "text-ink-muted")}>
                  List
                </Text>
              </Pressable>
            </View>
          </View>

          {isLoading ? (
            <Card>
              <Text variant="caption" tone="faint">
                Loading events…
              </Text>
            </Card>
          ) : isError ? (
            <Card>
              <Text variant="caption" tone="muted">
                Could not load calendar events.
              </Text>
            </Card>
          ) : listedEvents.length > 0 ? (
            <View className={cn("gap-4", viewMode === "box" ? "md:flex-row md:flex-wrap" : "flex-column")}>
              {listedEvents.map((event) => (
                <View
                  key={event.id}
                  className={cn(
                    viewMode === "box"
                      ? "w-full md:w-[calc(50%-8px)]"
                      : "w-full"
                  )}
                >
                  <EventCard event={event} variant={viewMode} />
                </View>
              ))}
            </View>
          ) : (
            <Card className="gap-3">
              <Text variant="subheading">
                {showingDay ? "Nothing on this day" : "No events yet"}
              </Text>
              <Text variant="caption" tone="muted">
                {showingDay
                  ? "Pick another day, or view the whole month."
                  : "Add the first event to bring the calendar to life."}
              </Text>
              <Button
                label="Add event"
                variant="whatsapp"
                size="sm"
                className="self-start"
                onPress={() => router.push("/create/event")}
              />
            </Card>
          )}
        </View>
      </View>
    </Screen>
  );
}

function NavButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="h-10 w-10 items-center justify-center rounded-pill border border-linen bg-card active:bg-sand"
    >
      <Icon name={icon} size={18} color={colors.ink} />
    </Pressable>
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function keyForDate(date: Date) {
  return dateKeyFormatter.format(date);
}

/** Parse a YYYY-MM-DD key back to a local Date (avoids a UTC shift). */
function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function buildCalendarDays(month: Date) {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: keyForDate(date),
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
}
