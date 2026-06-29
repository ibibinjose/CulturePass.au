import { useState, useMemo, useEffect } from "react";
import { Modal, ScrollView, View, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Button, Card, Icon, Text, Badge } from "@/components/ui";
import { colors } from "@/lib/theme";
import { useEventTicketTypes, useBuyTicket, useTakenSeats } from "./api";
import { cn } from "@/lib/utils/cn";

/**
 * Parse the event's `seating_layout` jsonb into row labels + seats per row.
 * Falls back to a 5×8 grid when the event hasn't configured a layout.
 * Accepts `{ rows: string[] | number, seatsPerRow: number }`.
 */
function parseLayout(layout: unknown): { rowNames: string[]; seatsPerRow: number } {
  const fallbackRows = ["A", "B", "C", "D", "E"];
  const l = (layout ?? {}) as { rows?: unknown; seatsPerRow?: unknown };
  const seatsPerRow = Math.max(1, Math.min(20, Number(l.seatsPerRow) || 8));

  let rowNames: string[];
  if (Array.isArray(l.rows) && l.rows.length > 0) {
    rowNames = l.rows.map((r) => String(r));
  } else if (typeof l.rows === "number" && l.rows > 0) {
    rowNames = Array.from({ length: Math.min(26, l.rows) }, (_, i) => String.fromCharCode(65 + i));
  } else {
    rowNames = fallbackRows;
  }
  return { rowNames, seatsPerRow };
}

interface TicketBookingModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  eventDates?: string[] | null;
  hasAssignedSeating?: boolean | null;
  seatingLayout?: any;
  venueMapUrl?: string | null;
}

export function TicketBookingModal({
  visible,
  onClose,
  eventId,
  eventTitle,
  eventDates = [],
  hasAssignedSeating = false,
  seatingLayout,
  venueMapUrl,
}: TicketBookingModalProps) {
  const { data: ticketTypes, isLoading: typesLoading } = useEventTicketTypes(eventId);
  const buyTicket = useBuyTicket();

  // Booking states
  const [selectedDate, setSelectedDate] = useState<string>(
    eventDates && eventDates.length > 0 ? eventDates[0] || "" : ""
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Total ticket count
  const totalTickets = useMemo(() => {
    return Object.values(quantities).reduce((a, b) => a + b, 0);
  }, [quantities]);

  // Total price
  const totalPriceCents = useMemo(() => {
    if (!ticketTypes) return 0;
    return ticketTypes.reduce((acc, type) => {
      const qty = quantities[type.id] || 0;
      return acc + qty * type.price_cents;
    }, 0);
  }, [ticketTypes, quantities]);

  // Real occupancy: seats already held/sold for this event + chosen date.
  const { data: takenSeats = [] } = useTakenSeats(
    hasAssignedSeating ? eventId : "",
    selectedDate || null,
  );

  // Drop any selected seat that someone else just booked.
  useEffect(() => {
    setSelectedSeats((prev) => prev.filter((s) => !takenSeats.includes(s)));
  }, [takenSeats]);

  // Seating grid built from the event's seating_layout (falls back to 5×8).
  const seatingGrid = useMemo(() => {
    const { rowNames, seatsPerRow } = parseLayout(seatingLayout);
    return rowNames.map((rowName) => ({
      name: rowName,
      seats: Array.from({ length: seatsPerRow }, (_, idx) => {
        const id = `${rowName}-${idx + 1}`;
        return { id, isOccupied: takenSeats.includes(id) };
      }),
    }));
  }, [seatingLayout, takenSeats]);

  const updateQuantity = (id: string, delta: number) => {
    setErrorMessage(null);
    setQuantities((prev) => {
      const val = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: val };
    });
    // Clear seats if quantities reduce
    setSelectedSeats([]);
  };

  const toggleSeat = (seatId: string) => {
    setErrorMessage(null);
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats((prev) => prev.filter((id) => id !== seatId));
    } else {
      if (selectedSeats.length >= totalTickets) {
        setErrorMessage(`You have only selected ${totalTickets} ticket(s). Increase quantity or deselect a seat.`);
        return;
      }
      setSelectedSeats((prev) => [...prev, seatId]);
    }
  };

  const handleCheckout = async () => {
    setErrorMessage(null);
    if (totalTickets === 0) {
      setErrorMessage("Please select at least one ticket.");
      return;
    }
    if (hasAssignedSeating && selectedSeats.length !== totalTickets) {
      setErrorMessage(`Please select exactly ${totalTickets} seat(s) on the chart.`);
      return;
    }

    try {
      const seatNumbers = hasAssignedSeating ? selectedSeats : undefined;
      const date = selectedDate || undefined;

      if (ticketTypes && ticketTypes.length > 0) {
        // Multi-type cart — server resolves prices + reserves seats.
        const items = ticketTypes
          .map((type) => ({ ticketTypeId: type.id, quantity: quantities[type.id] || 0 }))
          .filter((item) => item.quantity > 0);
        await buyTicket.mutateAsync({ eventId, items, selectedDate: date, seatNumbers });
      } else {
        // Legacy single-price event (no ticket types) — send a flat quantity.
        await buyTicket.mutateAsync({
          eventId,
          quantity: totalTickets,
          selectedDate: date,
          seatNumbers,
        });
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Checkout failed. Please try again.");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
        weekday: "short",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-paper">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-linen p-4">
          <View className="flex-1 mr-4">
            <Text className="text-ink-faint font-heading text-[10px] uppercase tracking-wider">Tickets Checkout</Text>
            <Text className="font-display text-xl text-ink font-bold truncate" numberOfLines={1}>
              {eventTitle}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} className="h-9 w-9 items-center justify-center rounded-full bg-sand active:bg-linen">
            <Icon name="close" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="p-4 md:p-6 gap-6" className="flex-1">
          {/* Step 1: Select Date */}
          {eventDates && eventDates.length > 0 && (
            <View className="gap-3">
              <Text className="font-heading text-xs text-ink-muted uppercase tracking-wider">1. Select Show Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {eventDates.map((dateStr) => {
                  const isSelected = selectedDate === dateStr;
                  return (
                    <Pressable
                      key={dateStr}
                      onPress={() => {
                        setSelectedDate(dateStr);
                        setSelectedSeats([]);
                      }}
                      className={cn(
                        "px-4 py-3 rounded-xl border-2 active:opacity-75 items-center justify-center min-w-[100px]",
                        isSelected ? "border-ink bg-ink" : "border-linen/70 bg-card"
                      )}
                    >
                      <Text className={cn("text-xs font-semibold", isSelected ? "text-paper" : "text-ink")}>
                        {formatDate(dateStr)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Step 2: Ticket Type Selection */}
          <View className="gap-3">
            <Text className="font-heading text-xs text-ink-muted uppercase tracking-wider">
              {eventDates && eventDates.length > 0 ? "2" : "1"}. Select Tickets
            </Text>

            {typesLoading ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="small" color={colors.pink} />
              </View>
            ) : !ticketTypes || ticketTypes.length === 0 ? (
              <Card className="p-6 border border-dashed border-linen bg-sand/10 items-center">
                <Text className="text-xs text-ink-muted">No specific ticket tiers defined for this event.</Text>
                {/* Fallback to simple quantity buy */}
                <View className="flex-row items-center gap-4 mt-4">
                  <Pressable
                    onPress={() => updateQuantity("general", -1)}
                    className="h-10 w-10 border border-linen bg-card rounded-full items-center justify-center active:bg-sand"
                  >
                    <Text className="font-bold text-lg text-ink">-</Text>
                  </Pressable>
                  <Text className="font-display text-lg font-bold text-ink w-8 text-center">
                    {quantities["general"] || 0}
                  </Text>
                  <Pressable
                    onPress={() => updateQuantity("general", 1)}
                    className="h-10 w-10 border border-linen bg-card rounded-full items-center justify-center active:bg-sand"
                  >
                    <Text className="font-bold text-lg text-ink">+</Text>
                  </Pressable>
                </View>
              </Card>
            ) : (
              <View className="gap-3">
                {ticketTypes.map((type) => {
                  const qty = quantities[type.id] || 0;
                  const priceLabel = `$${(type.price_cents / 100).toFixed(2)}`;
                  return (
                    <Card key={type.id} className="border border-linen/70 p-4 flex-row items-center justify-between gap-4 bg-card">
                      <View className="flex-1 gap-0.5">
                        <Text className="font-display text-base font-bold text-ink">{type.name}</Text>
                        <Text className="text-xs text-pink-500 font-semibold">{priceLabel}</Text>
                        {type.description ? (
                          <Text className="text-[11px] text-ink-faint mt-1 leading-relaxed">{type.description}</Text>
                        ) : null}
                      </View>
                      <View className="flex-row items-center gap-3">
                        <Pressable
                          onPress={() => updateQuantity(type.id, -1)}
                          disabled={qty === 0}
                          className={cn(
                            "h-9 w-9 border border-linen bg-paper rounded-full items-center justify-center active:bg-sand",
                            qty === 0 && "opacity-40"
                          )}
                        >
                          <Text className="font-bold text-ink">-</Text>
                        </Pressable>
                        <Text className="font-display text-sm font-bold text-ink w-6 text-center">{qty}</Text>
                        <Pressable
                          onPress={() => updateQuantity(type.id, 1)}
                          className="h-9 w-9 border border-linen bg-paper rounded-full items-center justify-center active:bg-sand"
                        >
                          <Text className="font-bold text-ink">+</Text>
                        </Pressable>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>

          {/* Static Venue Map option */}
          {venueMapUrl ? (
            <View className="gap-3">
              <Text className="font-heading text-xs text-ink-muted uppercase tracking-wider">Venue Map</Text>
              <Card padded={false} className="border border-linen overflow-hidden aspect-video bg-sand">
                <Image source={{ uri: venueMapUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
              </Card>
            </View>
          ) : null}

          {/* Step 3: Seating Chart Selector */}
          {hasAssignedSeating && totalTickets > 0 && (
            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="font-heading text-xs text-ink-muted uppercase tracking-wider">Select Seats</Text>
                <Badge label={`${selectedSeats.length} of ${totalTickets} Selected`} variant={selectedSeats.length === totalTickets ? "success" : "warning"} />
              </View>

              <Card className="border border-linen bg-sand/15 p-4 items-center justify-center">
                {/* Stage */}
                <View className="w-2/3 py-2 border border-ink/40 bg-card rounded-md items-center mb-6">
                  <Text className="text-[10px] font-heading uppercase text-ink-muted tracking-widest font-semibold">STAGE</Text>
                </View>

                {/* Seating Grid */}
                <View className="gap-3 w-full max-w-sm">
                  {seatingGrid.map((row) => (
                    <View key={row.name} className="flex-row items-center gap-3 justify-center">
                      <Text className="w-4 font-bold text-xs text-ink-muted text-center">{row.name}</Text>
                      <View className="flex-row gap-1.5 flex-1 justify-between">
                        {row.seats.map((seat) => {
                          const isSelected = selectedSeats.includes(seat.id);
                          const isOccupied = seat.isOccupied;
                          return (
                            <Pressable
                              key={seat.id}
                              disabled={isOccupied}
                              onPress={() => toggleSeat(seat.id)}
                              className={cn(
                                "h-7 w-7 rounded-md items-center justify-center border text-[9px] font-semibold active:opacity-75",
                                isOccupied
                                  ? "bg-linen/40 border-linen text-linen"
                                  : isSelected
                                  ? "bg-gold-500 border-gold-600 text-ink"
                                  : "bg-emerald-500 border-emerald-600 text-white"
                              )}
                            >
                              <Text className="text-[8px] font-sans text-center font-bold text-white" style={{ color: isOccupied ? colors.inkFaint : isSelected ? colors.ink : "#FFFFFF" }}>
                                {seat.id.split("-")[1]}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Text className="w-4 font-bold text-xs text-ink-muted text-center">{row.name}</Text>
                    </View>
                  ))}
                </View>

                {/* Legend */}
                <View className="flex-row gap-4 mt-6 justify-center flex-wrap">
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-3 w-3 bg-emerald-500 rounded border border-emerald-600" />
                    <Text className="text-[10px] text-ink-muted font-heading">Available</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-3 w-3 bg-gold-500 rounded border border-gold-600" />
                    <Text className="text-[10px] text-ink-muted font-heading">Selected</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-3 w-3 bg-linen/50 rounded border border-linen" />
                    <Text className="text-[10px] text-ink-muted font-heading">Occupied</Text>
                  </View>
                </View>
              </Card>
            </View>
          )}

          {errorMessage && (
            <Card className="border border-danger/30 bg-terracotta-50/50 p-4">
              <Text className="text-xs text-danger leading-5">{errorMessage}</Text>
            </Card>
          )}
        </ScrollView>

        {/* Footer sticky buy block */}
        <View className="border-t border-linen p-4 bg-card flex-row items-center justify-between gap-4">
          <View>
            <Text className="text-[10px] font-heading uppercase text-ink-muted tracking-wider">Subtotal ({totalTickets} Tickets)</Text>
            <Text className="font-display text-2xl font-bold text-ink mt-0.5">
              ${(totalPriceCents / 100).toFixed(2)}
            </Text>
          </View>
          <Button
            label={buyTicket.isPending ? "Starting checkout..." : "Proceed to Payment"}
            variant="whatsapp"
            disabled={totalTickets === 0 || buyTicket.isPending}
            loading={buyTicket.isPending}
            onPress={handleCheckout}
            className="flex-1 max-w-[200px]"
          />
        </View>
      </View>
    </Modal>
  );
}
