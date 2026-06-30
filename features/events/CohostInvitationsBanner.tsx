import { useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import { Card, Text, Button, Icon, Badge } from "@/components/ui";
import { colors } from "@/lib/theme";
import { useMyCohostInvitations, useRespondToInvite, COHOST_ROLE_LABELS } from "./cohosts";

export function CohostInvitationsBanner() {
  const router = useRouter();
  const { data: invites, isLoading } = useMyCohostInvitations();
  const respond = useRespondToInvite();
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (isLoading || !invites || invites.length === 0) {
    return null;
  }

  async function handleResponse(id: string, status: "accepted" | "declined") {
    setProcessingId(id);
    try {
      await respond.mutateAsync({ id, status });
    } catch (e) {
      console.error("Error responding to invitation:", e);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <View className="w-full mb-6 gap-3">
      {invites.map((invite) => {
        const isProcessing = processingId === invite.id;
        const roleLabel = COHOST_ROLE_LABELS[invite.role] || "Co-host";
        const inviteeLabel = invite.kind === "hub" ? `Hub: ${invite.name}` : `You (Profile)`;

        return (
          <Card
            key={invite.id}
            padded={false}
            className="border-2 border-gold-500 bg-gold-50/40 p-4 md:p-5 flex-row flex-wrap md:flex-nowrap items-start md:items-center justify-between gap-4 shadow-subtle animate-fade-in"
          >
            <View className="flex-1 flex-row items-start gap-3.5 min-w-0">
              {/* Event Image */}
              {invite.eventImageUrl ? (
                <Image
                  source={{ uri: invite.eventImageUrl }}
                  style={{ width: 56, height: 56, borderRadius: 12 }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View className="h-14 w-14 items-center justify-center rounded-xl bg-gold-100 border border-gold-200">
                  <Icon name="calendar" size={24} color={colors.goldDeep} />
                </View>
              )}

              {/* Event & Invite details */}
              <View className="flex-1 min-w-0 gap-1">
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <Badge label={`Invited as ${roleLabel}`} variant="warning" />
                  <Text className="text-[10px] font-sans text-gold-800 font-semibold uppercase tracking-wider">
                    To {inviteeLabel}
                  </Text>
                </View>

                <Pressable
                  onPress={() => router.push(`/event/${invite.eventId}`)}
                  className="active:opacity-75"
                >
                  <Text className="font-display text-lg font-bold text-ink hover:text-pink-500 leading-tight">
                    {invite.eventTitle}
                  </Text>
                </Pressable>

                <Text variant="caption" tone="muted" className="text-xs">
                  Hosted by <Text className="font-semibold">{invite.eventHostName}</Text>
                </Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View className="flex-row items-center gap-2.5 self-end md:self-center">
              {isProcessing ? (
                <View className="px-6 py-2">
                  <ActivityIndicator size="small" color={colors.goldDeep} />
                </View>
              ) : (
                <>
                  <Button
                    label="Decline"
                    variant="ghost"
                    size="sm"
                    className="text-terracotta active:bg-terracotta-50 rounded-xl"
                    onPress={() => handleResponse(invite.id, "declined")}
                  />
                  <Button
                    label="Accept"
                    variant="whatsapp"
                    size="sm"
                    className="px-5 rounded-xl shadow-sm"
                    onPress={() => handleResponse(invite.id, "accepted")}
                  />
                </>
              )}
            </View>
          </Card>
        );
      })}
    </View>
  );
}
